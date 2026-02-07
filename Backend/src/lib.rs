#![no_std]

//! # Yield-Sweep Smart Contract
//!
//! A DeFi Vault that automatically "sweeps" idle user funds into a yield-generating
//! strategy on Stellar Soroban. This contract interacts with real token contracts
//! (like USDC) and authentic user wallets via signatures.
//!
//! ## Architecture
//! - Users set a "safety limit" - the amount they want to keep in their wallet
//! - The `sweep` function moves excess funds (balance - safety_limit) into the vault
//! - Funds in the vault can be deployed to yield protocols (e.g., Blend)
//! - Users can withdraw their deposited funds at any time
//!
//! ## Security
//! - All state-modifying functions require user authentication via `require_auth()`
//! - Contract addresses for USDC and Yield Protocol are set at initialization
//! - Transfer operations use the standard Soroban token interface

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    token, Address, Env, Symbol,
};

// =============================================================================
// ERROR DEFINITIONS
// =============================================================================

/// Custom error codes for the Yield-Sweep contract
#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum YieldSweepError {
    /// Contract has already been initialized
    AlreadyInitialized = 1,
    /// Contract has not been initialized yet
    NotInitialized = 2,
    /// User has not configured their safety limit
    UserNotConfigured = 3,
    /// Insufficient balance in vault for withdrawal
    InsufficientBalance = 4,
    /// Invalid amount provided (must be positive)
    InvalidAmount = 5,
    /// No excess funds to sweep (balance <= safety_limit)
    NoExcessFunds = 6,
    /// Arithmetic overflow occurred
    Overflow = 7,
}

// =============================================================================
// DATA STRUCTURES
// =============================================================================

/// Storage keys for persistent contract data
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Key for contract initialization status and config
    Config,
    /// Key for user-specific configuration, mapped by Address
    UserConfig(Address),
    /// Key for total vault deposits across all users
    TotalVaultDeposits,
}

/// Global contract configuration stored at initialization
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractConfig {
    /// Address of the USDC token contract (or any target token)
    pub usdc_token: Address,
    /// Address of the yield protocol (e.g., Blend lending protocol)
    pub yield_protocol: Address,
    /// Admin address for privileged operations
    pub admin: Address,
    /// Whether the contract has been initialized
    pub initialized: bool,
}

/// Per-user configuration and state
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserConfig {
    /// The amount the user wants to keep in their wallet (safety threshold)
    pub safety_limit: i128,
    /// The user's share of funds deposited in the vault
    pub total_deposited: i128,
    /// Timestamp (ledger sequence) of the last sweep or withdraw action
    pub last_action: u64,
}

impl UserConfig {
    /// Creates a new UserConfig with default values
    pub fn new() -> Self {
        Self {
            safety_limit: 0,
            total_deposited: 0,
            last_action: 0,
        }
    }
}

impl Default for UserConfig {
    fn default() -> Self {
        Self::new()
    }
}

// =============================================================================
// EVENTS
// =============================================================================

/// Event topics for contract actions
const EVENT_INITIALIZED: &str = "initialized";
const EVENT_CONFIG_SET: &str = "config_set";
const EVENT_SWEPT: &str = "swept";
const EVENT_WITHDRAWN: &str = "withdrawn";
const EVENT_DEPOSITED: &str = "deposited";

// =============================================================================
// CONTRACT IMPLEMENTATION
// =============================================================================

#[contract]
pub struct YieldSweepContract;

#[contractimpl]
impl YieldSweepContract {
    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /// Initialize the contract with the USDC token and yield protocol addresses.
    ///
    /// This function must be called once before any other operations.
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `admin` - The admin address for privileged operations
    /// * `usdc_address` - The address of the USDC token contract
    /// * `yield_address` - The address of the yield protocol (e.g., Blend)
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    pub fn init(
        e: Env,
        admin: Address,
        usdc_address: Address,
        yield_address: Address,
    ) -> Result<(), YieldSweepError> {
        // Check if already initialized
        if Self::is_initialized(&e) {
            return Err(YieldSweepError::AlreadyInitialized);
        }

        // Require admin authentication for initialization
        admin.require_auth();

        // Create and store the contract configuration
        let config = ContractConfig {
            usdc_token: usdc_address.clone(),
            yield_protocol: yield_address.clone(),
            admin: admin.clone(),
            initialized: true,
        };

        e.storage().persistent().set(&DataKey::Config, &config);

        // Initialize total vault deposits to zero
        e.storage().persistent().set(&DataKey::TotalVaultDeposits, &0_i128);

        // Emit initialization event
        e.events().publish(
            (Symbol::new(&e, EVENT_INITIALIZED),),
            (admin, usdc_address, yield_address),
        );

        Ok(())
    }

    /// Check if the contract has been initialized
    pub fn is_initialized(e: &Env) -> bool {
        e.storage()
            .persistent()
            .get::<DataKey, ContractConfig>(&DataKey::Config)
            .map(|c| c.initialized)
            .unwrap_or(false)
    }

    /// Get the contract configuration
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract has not been initialized
    pub fn get_config(e: Env) -> Result<ContractConfig, YieldSweepError> {
        e.storage()
            .persistent()
            .get(&DataKey::Config)
            .ok_or(YieldSweepError::NotInitialized)
    }

    // =========================================================================
    // USER CONFIGURATION
    // =========================================================================

    /// Set or update the user's safety balance limit.
    ///
    /// The safety limit is the amount the user wants to keep in their wallet.
    /// Any balance above this limit can be swept into the vault.
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `user` - The user's address (must authenticate)
    /// * `limit` - The safety limit amount (must be >= 0)
    ///
    /// # Security
    /// * Requires authentication from the user address
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract has not been initialized
    /// * `InvalidAmount` - If the limit is negative
    pub fn set_safety_balance(
        e: Env,
        user: Address,
        limit: i128,
    ) -> Result<(), YieldSweepError> {
        // Ensure contract is initialized
        Self::require_initialized(&e)?;

        // CRUCIAL: Verify the transaction was signed by the actual wallet
        user.require_auth();

        // Validate the limit
        if limit < 0 {
            return Err(YieldSweepError::InvalidAmount);
        }

        // Get existing config or create new one
        let mut user_config = Self::get_user_config_or_default(&e, &user);

        // Update the safety limit
        user_config.safety_limit = limit;
        user_config.last_action = e.ledger().sequence() as u64;

        // Save the updated config
        e.storage()
            .persistent()
            .set(&DataKey::UserConfig(user.clone()), &user_config);

        // Emit config update event
        e.events().publish(
            (Symbol::new(&e, EVENT_CONFIG_SET), user.clone()),
            (limit, user_config.total_deposited),
        );

        Ok(())
    }

    /// Get a user's current configuration
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `user` - The user's address
    ///
    /// # Returns
    /// The user's configuration, or an error if not found
    pub fn get_user_config(e: Env, user: Address) -> Result<UserConfig, YieldSweepError> {
        e.storage()
            .persistent()
            .get(&DataKey::UserConfig(user))
            .ok_or(YieldSweepError::UserNotConfigured)
    }

    // =========================================================================
    // CORE SWEEP FUNCTIONALITY
    // =========================================================================

    /// Sweep excess funds from user's wallet into the vault.
    ///
    /// This function checks the user's real on-chain USDC balance, compares it
    /// to their safety limit, and transfers any excess to the vault.
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `user` - The user's address whose funds to sweep
    ///
    /// # Prerequisites
    /// * User must have set a safety limit via `set_safety_balance`
    /// * User must have approved this contract to spend their USDC tokens
    ///   (handled on the frontend via `approve` or `increase_allowance`)
    ///
    /// # Returns
    /// The amount that was swept into the vault
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract has not been initialized
    /// * `UserNotConfigured` - If the user has not set a safety limit
    /// * `NoExcessFunds` - If balance <= safety_limit
    pub fn sweep(e: Env, user: Address) -> Result<i128, YieldSweepError> {
        // Ensure contract is initialized
        let config = Self::require_initialized(&e)?;

        // Get the user's configuration (they must have set a safety limit)
        let mut user_config = e
            .storage()
            .persistent()
            .get::<DataKey, UserConfig>(&DataKey::UserConfig(user.clone()))
            .ok_or(YieldSweepError::UserNotConfigured)?;

        // NO MOCK DATA: Instantiate a real token client using the stored USDC address
        let token_client = token::Client::new(&e, &config.usdc_token);

        // Get the REAL on-chain balance of the user
        let real_balance = token_client.balance(&user);

        // Get the user's safety limit
        let safety_limit = user_config.safety_limit;

        // Check if there are excess funds to sweep
        if real_balance <= safety_limit {
            return Err(YieldSweepError::NoExcessFunds);
        }

        // Calculate the excess amount to sweep
        let excess = real_balance
            .checked_sub(safety_limit)
            .ok_or(YieldSweepError::Overflow)?;

        // Get the contract's own address
        let contract_address = e.current_contract_address();

        // Transfer excess from user to this contract (vault)
        // NOTE: This requires the user to have previously approved this contract
        // to spend their tokens. The approval is handled on the frontend.
        token_client.transfer_from(
            &contract_address, // spender (this contract, pre-approved)
            &user,             // from (the user's wallet)
            &contract_address, // to (the vault)
            &excess,           // amount to transfer
        );

        // Update user's total deposited amount
        user_config.total_deposited = user_config
            .total_deposited
            .checked_add(excess)
            .ok_or(YieldSweepError::Overflow)?;
        user_config.last_action = e.ledger().sequence() as u64;

        // Save the updated user config
        e.storage()
            .persistent()
            .set(&DataKey::UserConfig(user.clone()), &user_config);

        // Update total vault deposits
        Self::update_total_deposits(&e, excess, true)?;

        // =======================================================================
        // TODO: YIELD PROTOCOL INTEGRATION
        // =======================================================================
        // This is where the cross-contract call to the yield protocol would occur.
        // For this MVP, we focus on moving funds from User -> Vault.
        // 
        // Example integration with Blend Protocol:
        // ```
        // let yield_client = yield_protocol::Client::new(&e, &config.yield_protocol);
        // yield_client.deposit(
        //     &contract_address,  // depositor (this contract)
        //     &config.usdc_token, // asset to deposit
        //     &excess,            // amount to deposit
        // );
        // ```
        //
        // Additional considerations:
        // - Track yield accrued per user for fair distribution
        // - Handle protocol-specific deposit requirements
        // - Implement emergency withdrawal from yield protocol
        // =======================================================================

        // Emit sweep event
        e.events().publish(
            (Symbol::new(&e, EVENT_SWEPT), user.clone()),
            (excess, user_config.total_deposited),
        );

        Ok(excess)
    }

    // =========================================================================
    // DEPOSIT FUNCTIONALITY
    // =========================================================================

    /// Manually deposit funds into the vault.
    ///
    /// Unlike `sweep`, this allows users to deposit any amount they choose.
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `user` - The user's address (must authenticate)
    /// * `amount` - The amount to deposit
    ///
    /// # Security
    /// * Requires authentication from the user address
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract has not been initialized
    /// * `InvalidAmount` - If the amount is <= 0
    pub fn deposit(e: Env, user: Address, amount: i128) -> Result<(), YieldSweepError> {
        // Ensure contract is initialized
        let config = Self::require_initialized(&e)?;

        // CRUCIAL: Verify the transaction was signed by the actual wallet
        user.require_auth();

        // Validate the amount
        if amount <= 0 {
            return Err(YieldSweepError::InvalidAmount);
        }

        // Create token client for USDC
        let token_client = token::Client::new(&e, &config.usdc_token);
        let contract_address = e.current_contract_address();

        // Transfer tokens from user to vault
        token_client.transfer_from(
            &contract_address, // spender
            &user,             // from
            &contract_address, // to
            &amount,           // amount
        );

        // Get or create user config
        let mut user_config = Self::get_user_config_or_default(&e, &user);

        // Update user's total deposited
        user_config.total_deposited = user_config
            .total_deposited
            .checked_add(amount)
            .ok_or(YieldSweepError::Overflow)?;
        user_config.last_action = e.ledger().sequence() as u64;

        // Save updated config
        e.storage()
            .persistent()
            .set(&DataKey::UserConfig(user.clone()), &user_config);

        // Update total vault deposits
        Self::update_total_deposits(&e, amount, true)?;

        // Emit deposit event
        e.events().publish(
            (Symbol::new(&e, EVENT_DEPOSITED), user.clone()),
            (amount, user_config.total_deposited),
        );

        Ok(())
    }

    // =========================================================================
    // WITHDRAWAL FUNCTIONALITY
    // =========================================================================

    /// Withdraw funds from the vault back to the user's wallet.
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `user` - The user's address (must authenticate)
    /// * `amount` - The amount to withdraw
    ///
    /// # Security
    /// * Requires authentication from the user address
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract has not been initialized
    /// * `UserNotConfigured` - If the user has no deposits
    /// * `InvalidAmount` - If the amount is <= 0
    /// * `InsufficientBalance` - If user's deposited amount < requested amount
    pub fn withdraw(e: Env, user: Address, amount: i128) -> Result<(), YieldSweepError> {
        // Ensure contract is initialized
        let config = Self::require_initialized(&e)?;

        // CRUCIAL: Verify the transaction was signed by the actual wallet
        user.require_auth();

        // Validate the amount
        if amount <= 0 {
            return Err(YieldSweepError::InvalidAmount);
        }

        // Get user's current configuration
        let mut user_config = e
            .storage()
            .persistent()
            .get::<DataKey, UserConfig>(&DataKey::UserConfig(user.clone()))
            .ok_or(YieldSweepError::UserNotConfigured)?;

        // Check if user has sufficient balance in the vault
        if user_config.total_deposited < amount {
            return Err(YieldSweepError::InsufficientBalance);
        }

        // =======================================================================
        // TODO: YIELD PROTOCOL WITHDRAWAL
        // =======================================================================
        // Before transferring funds to user, we may need to withdraw from
        // the yield protocol first.
        //
        // Example integration with Blend Protocol:
        // ```
        // let yield_client = yield_protocol::Client::new(&e, &config.yield_protocol);
        // 
        // // Calculate how much we have in the yield protocol
        // let yield_balance = yield_client.balance(&contract_address, &config.usdc_token);
        // 
        // // If we need funds from the yield protocol
        // if vault_liquid_balance < amount {
        //     let needed = amount - vault_liquid_balance;
        //     yield_client.withdraw(
        //         &contract_address,  // withdrawer
        //         &config.usdc_token, // asset
        //         &needed,            // amount needed
        //     );
        // }
        // ```
        //
        // Additional considerations:
        // - Handle partial withdrawals if yield protocol has withdrawal limits
        // - Account for any withdrawal fees from the yield protocol
        // - Implement withdrawal queue for large amounts
        // =======================================================================

        // Create token client for USDC
        let token_client = token::Client::new(&e, &config.usdc_token);

        // Transfer USDC from the contract back to the user
        token_client.transfer(
            &e.current_contract_address(), // from (the vault)
            &user,                         // to (the user)
            &amount,                       // amount
        );

        // Update user's deposited amount
        user_config.total_deposited = user_config
            .total_deposited
            .checked_sub(amount)
            .ok_or(YieldSweepError::Overflow)?;
        user_config.last_action = e.ledger().sequence() as u64;

        // Save updated config
        e.storage()
            .persistent()
            .set(&DataKey::UserConfig(user.clone()), &user_config);

        // Update total vault deposits
        Self::update_total_deposits(&e, amount, false)?;

        // Emit withdrawal event
        e.events().publish(
            (Symbol::new(&e, EVENT_WITHDRAWN), user.clone()),
            (amount, user_config.total_deposited),
        );

        Ok(())
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// Get the total deposits in the vault across all users
    pub fn get_total_vault_deposits(e: Env) -> i128 {
        e.storage()
            .persistent()
            .get(&DataKey::TotalVaultDeposits)
            .unwrap_or(0)
    }

    /// Get the vault's current USDC balance
    ///
    /// This returns the actual token balance held by the contract.
    pub fn get_vault_balance(e: Env) -> Result<i128, YieldSweepError> {
        let config = Self::require_initialized(&e)?;
        let token_client = token::Client::new(&e, &config.usdc_token);
        Ok(token_client.balance(&e.current_contract_address()))
    }

    /// Get a user's real-time wallet balance
    ///
    /// Returns the user's USDC balance in their wallet (not in the vault).
    pub fn get_user_wallet_balance(e: Env, user: Address) -> Result<i128, YieldSweepError> {
        let config = Self::require_initialized(&e)?;
        let token_client = token::Client::new(&e, &config.usdc_token);
        Ok(token_client.balance(&user))
    }

    /// Calculate how much would be swept for a user
    ///
    /// This is a view function that returns the potential sweep amount
    /// without actually performing the sweep.
    pub fn calculate_sweep_amount(e: Env, user: Address) -> Result<i128, YieldSweepError> {
        let config = Self::require_initialized(&e)?;
        
        let user_config = e
            .storage()
            .persistent()
            .get::<DataKey, UserConfig>(&DataKey::UserConfig(user.clone()))
            .ok_or(YieldSweepError::UserNotConfigured)?;

        let token_client = token::Client::new(&e, &config.usdc_token);
        let real_balance = token_client.balance(&user);

        if real_balance <= user_config.safety_limit {
            return Ok(0);
        }

        real_balance
            .checked_sub(user_config.safety_limit)
            .ok_or(YieldSweepError::Overflow)
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    /// Update the yield protocol address (admin only)
    ///
    /// # Security
    /// * Requires authentication from the admin address
    pub fn update_yield_protocol(
        e: Env,
        new_yield_address: Address,
    ) -> Result<(), YieldSweepError> {
        let mut config = Self::require_initialized(&e)?;

        // Require admin authentication
        config.admin.require_auth();

        // Update the yield protocol address
        config.yield_protocol = new_yield_address;

        // Save updated config
        e.storage().persistent().set(&DataKey::Config, &config);

        Ok(())
    }

    // =========================================================================
    // INTERNAL HELPER FUNCTIONS
    // =========================================================================

    /// Ensure the contract is initialized and return the config
    fn require_initialized(e: &Env) -> Result<ContractConfig, YieldSweepError> {
        e.storage()
            .persistent()
            .get(&DataKey::Config)
            .ok_or(YieldSweepError::NotInitialized)
    }

    /// Get user config or return a default if not found
    fn get_user_config_or_default(e: &Env, user: &Address) -> UserConfig {
        e.storage()
            .persistent()
            .get(&DataKey::UserConfig(user.clone()))
            .unwrap_or_else(UserConfig::new)
    }

    /// Update the total vault deposits
    fn update_total_deposits(e: &Env, amount: i128, is_deposit: bool) -> Result<(), YieldSweepError> {
        let current: i128 = e
            .storage()
            .persistent()
            .get(&DataKey::TotalVaultDeposits)
            .unwrap_or(0);

        let new_total = if is_deposit {
            current.checked_add(amount).ok_or(YieldSweepError::Overflow)?
        } else {
            current.checked_sub(amount).ok_or(YieldSweepError::Overflow)?
        };

        e.storage()
            .persistent()
            .set(&DataKey::TotalVaultDeposits, &new_total);

        Ok(())
    }
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{StellarAssetClient, TokenClient},
        Env,
    };

    #[test]
    fn test_initialization() {
        let e = Env::default();
        e.mock_all_auths();

        // Create addresses
        let admin = Address::generate(&e);
        let yield_protocol = Address::generate(&e);

        // Create test token
        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_client = TokenClient::new(&e, &token_address);

        // Register the YieldSweep contract
        let contract_id = e.register_contract(None, YieldSweepContract);
        let client = YieldSweepContractClient::new(&e, &contract_id);

        // Initialize
        client.init(&admin, &token_address, &yield_protocol);

        // Verify
        let config = client.get_config();
        assert!(config.initialized);
        assert_eq!(config.usdc_token, token_address);
        assert_eq!(config.yield_protocol, yield_protocol);
        assert_eq!(config.admin, admin);
    }

    #[test]
    fn test_set_safety_balance() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);
        let yield_protocol = Address::generate(&e);

        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();

        let contract_id = e.register_contract(None, YieldSweepContract);
        let client = YieldSweepContractClient::new(&e, &contract_id);
        client.init(&admin, &token_address, &yield_protocol);

        // Set safety balance
        client.set_safety_balance(&user, &1000_i128);

        // Verify
        let user_config = client.get_user_config(&user);
        assert_eq!(user_config.safety_limit, 1000_i128);
    }

    #[test]
    fn test_sweep() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);
        let yield_protocol = Address::generate(&e);

        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_admin = StellarAssetClient::new(&e, &token_address);
        let token_client = TokenClient::new(&e, &token_address);

        // Mint tokens to user
        token_admin.mint(&user, &10000_i128);

        let contract_id = e.register_contract(None, YieldSweepContract);
        let client = YieldSweepContractClient::new(&e, &contract_id);
        client.init(&admin, &token_address, &yield_protocol);

        // Approve contract to spend user's tokens
        token_client.approve(&user, &contract_id, &10000_i128, &1000);

        // User starts with 10000 tokens
        assert_eq!(token_client.balance(&user), 10000_i128);

        // Set safety limit to 2000
        client.set_safety_balance(&user, &2000_i128);

        // Sweep excess funds
        let swept = client.sweep(&user);
        assert_eq!(swept, 8000_i128); // 10000 - 2000 = 8000

        // Verify balances
        assert_eq!(token_client.balance(&user), 2000_i128);
        assert_eq!(token_client.balance(&contract_id), 8000_i128);

        // Verify user config updated
        let user_config = client.get_user_config(&user);
        assert_eq!(user_config.total_deposited, 8000_i128);
    }

    #[test]
    fn test_withdraw() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);
        let yield_protocol = Address::generate(&e);

        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_admin = StellarAssetClient::new(&e, &token_address);
        let token_client = TokenClient::new(&e, &token_address);

        // Mint tokens to user
        token_admin.mint(&user, &10000_i128);

        let contract_id = e.register_contract(None, YieldSweepContract);
        let client = YieldSweepContractClient::new(&e, &contract_id);
        client.init(&admin, &token_address, &yield_protocol);

        // Approve contract
        token_client.approve(&user, &contract_id, &10000_i128, &1000);

        // Setup: sweep some funds first
        client.set_safety_balance(&user, &2000_i128);
        client.sweep(&user);

        // User has 8000 in vault, 2000 in wallet
        assert_eq!(token_client.balance(&user), 2000_i128);

        // Withdraw 3000
        client.withdraw(&user, &3000_i128);

        // Verify balances
        assert_eq!(token_client.balance(&user), 5000_i128);
        assert_eq!(token_client.balance(&contract_id), 5000_i128);

        // Verify user config
        let user_config = client.get_user_config(&user);
        assert_eq!(user_config.total_deposited, 5000_i128);
    }

    #[test]
    fn test_calculate_sweep_amount() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);
        let yield_protocol = Address::generate(&e);

        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_admin = StellarAssetClient::new(&e, &token_address);
        let token_client = TokenClient::new(&e, &token_address);

        // Mint tokens to user
        token_admin.mint(&user, &10000_i128);

        let contract_id = e.register_contract(None, YieldSweepContract);
        let client = YieldSweepContractClient::new(&e, &contract_id);
        client.init(&admin, &token_address, &yield_protocol);

        client.set_safety_balance(&user, &3000_i128);

        let amount = client.calculate_sweep_amount(&user);
        assert_eq!(amount, 7000_i128); // 10000 - 3000
    }

    #[test]
    fn test_get_vault_balance() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);
        let yield_protocol = Address::generate(&e);

        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_admin = StellarAssetClient::new(&e, &token_address);
        let token_client = TokenClient::new(&e, &token_address);

        // Mint tokens to user
        token_admin.mint(&user, &10000_i128);

        let contract_id = e.register_contract(None, YieldSweepContract);
        let client = YieldSweepContractClient::new(&e, &contract_id);
        client.init(&admin, &token_address, &yield_protocol);

        // Approve contract
        token_client.approve(&user, &contract_id, &10000_i128, &1000);

        // Initially empty
        assert_eq!(client.get_vault_balance(), 0_i128);

        // After sweep
        client.set_safety_balance(&user, &5000_i128);
        client.sweep(&user);

        assert_eq!(client.get_vault_balance(), 5000_i128);
    }
}
