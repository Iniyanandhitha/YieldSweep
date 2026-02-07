#![no_std]

//! # Yield-Sweep Vault Smart Contract
//!
//! A DeFi Vault that automatically "sweeps" idle user funds into a yield-generating
//! lending protocol (Blend Protocol) for passive income.
//!
//! ## Features
//! - Set safety limit per user (amount to keep in wallet)
//! - Automatic sweeping of excess funds into Blend for yield
//! - Emergency withdraw_all function to exit completely
//! - Real on-chain token balance checking
//!
//! ## Architecture
//! Uses a trait-based Blend interface that can work with mock or real Blend pools.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    token, Address, Env, Symbol,
};

// =============================================================================
// BLEND PROTOCOL INTERFACE
// =============================================================================

/// Blend Protocol lending pool interface
/// This trait abstracts interactions with Blend lending pools for yield generation.
/// 
/// For hackathon demo: Can use a mock implementation
/// For production: Connect to real Blend pools via their submit() interface
mod blend_interface {
    use soroban_sdk::{contractclient, Address, Env};
    
    /// Simplified interface for Blend lending pool operations
    #[contractclient(name = "BlendPoolClient")]
    pub trait BlendPool {
        /// Supply assets to the lending pool for yield
        /// Returns the amount of pool shares received
        fn supply(e: Env, from: Address, asset: Address, amount: i128) -> i128;
        
        /// Withdraw assets from the lending pool
        /// Returns the amount of underlying assets received
        fn withdraw(e: Env, to: Address, asset: Address, amount: i128) -> i128;
        
        /// Get current balance in the pool (with accrued yield)
        fn get_balance(e: Env, user: Address, asset: Address) -> i128;
    }
}

pub use blend_interface::BlendPoolClient;

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
    /// Caller is not the admin
    NotAdmin = 8,
    /// Blend pool not configured
    BlendNotConfigured = 9,
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
    /// Key for total amount invested in Blend
    TotalInvestedInBlend,
}

/// Global contract configuration stored at initialization
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractConfig {
    /// Address of the token contract (e.g., USDC)
    pub token: Address,
    /// Admin address for privileged operations
    pub admin: Address,
    /// Whether the contract has been initialized
    pub initialized: bool,
    /// Optional Blend lending pool address for yield generation
    pub blend_pool: Option<Address>,
}

/// Per-user configuration and state
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserConfig {
    /// The amount the user wants to keep in their wallet (safety threshold)
    pub safety_limit: i128,
    /// The user's total funds deposited in the vault (before yield)
    pub deposited: i128,
    /// The user's funds currently invested in Blend for yield
    pub invested: i128,
}

impl UserConfig {
    /// Creates a new UserConfig with default values
    pub fn new() -> Self {
        Self {
            safety_limit: 0,
            deposited: 0,
            invested: 0,
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

const EVENT_INITIALIZED: &str = "initialized";
const EVENT_LIMIT_SET: &str = "limit_set";
const EVENT_SWEPT: &str = "swept";
const EVENT_WITHDRAWN: &str = "withdrawn";
const EVENT_DEPOSITED: &str = "deposited";
const EVENT_BLEND_SET: &str = "blend_pool_set";
const EVENT_INVESTED: &str = "invested_in_blend";
const EVENT_WITHDRAW_ALL: &str = "withdraw_all";

// =============================================================================
// CONTRACT IMPLEMENTATION
// =============================================================================

#[contract]
pub struct YieldSweepVault;

#[contractimpl]
impl YieldSweepVault {
    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /// Initialize the contract with the token address.
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `admin` - The admin address for privileged operations
    /// * `token` - The address of the token contract (e.g., USDC)
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    pub fn init(
        e: Env,
        admin: Address,
        token: Address,
    ) -> Result<(), YieldSweepError> {
        // Check if already initialized
        if Self::is_initialized(&e) {
            return Err(YieldSweepError::AlreadyInitialized);
        }

        // Require admin authentication
        admin.require_auth();

        // Create and store the contract configuration
        let config = ContractConfig {
            token: token.clone(),
            admin: admin.clone(),
            initialized: true,
            blend_pool: None, // Not set initially
        };

        e.storage().persistent().set(&DataKey::Config, &config);

        // Initialize totals to zero
        e.storage().persistent().set(&DataKey::TotalVaultDeposits, &0_i128);
        e.storage().persistent().set(&DataKey::TotalInvestedInBlend, &0_i128);

        // Emit initialization event
        e.events().publish(
            (Symbol::new(&e, EVENT_INITIALIZED),),
            (admin, token),
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
    pub fn get_config(e: Env) -> Result<ContractConfig, YieldSweepError> {
        e.storage()
            .persistent()
            .get(&DataKey::Config)
            .ok_or(YieldSweepError::NotInitialized)
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    /// (Admin only) Set the Blend lending pool address for yield generation
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `blend_pool` - The address of the Blend lending pool contract
    pub fn set_blend_pool(e: Env, blend_pool: Address) -> Result<(), YieldSweepError> {
        let mut config = Self::require_initialized(&e)?;
        
        // Only admin can set the Blend pool
        config.admin.require_auth();
        
        // Update the config with the Blend pool address
        config.blend_pool = Some(blend_pool.clone());
        e.storage().persistent().set(&DataKey::Config, &config);
        
        // Emit event
        e.events().publish(
            (Symbol::new(&e, EVENT_BLEND_SET),),
            blend_pool,
        );
        
        Ok(())
    }

    // =========================================================================
    // USER CONFIGURATION
    // =========================================================================

    /// Set or update the user's safety limit.
    ///
    /// The safety limit is the amount the user wants to keep in their wallet.
    /// Any balance above this limit can be swept into the vault for yield.
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `user` - The user's address (must authenticate)
    /// * `limit` - The safety limit amount (must be >= 0)
    ///
    /// # Security
    /// * Requires authentication from the user address
    pub fn set_safety_limit(
        e: Env,
        user: Address,
        limit: i128,
    ) -> Result<(), YieldSweepError> {
        // Ensure contract is initialized
        Self::require_initialized(&e)?;

        // AUTHENTICATION: Verify the transaction was signed by the user
        user.require_auth();

        // Validate the limit
        if limit < 0 {
            return Err(YieldSweepError::InvalidAmount);
        }

        // Get existing config or create new one
        let mut user_config = Self::get_user_config_or_default(&e, &user);

        // Update the safety limit
        user_config.safety_limit = limit;

        // Save the updated config
        e.storage()
            .persistent()
            .set(&DataKey::UserConfig(user.clone()), &user_config);

        // Emit event
        e.events().publish(
            (Symbol::new(&e, EVENT_LIMIT_SET), user.clone()),
            (limit, user_config.deposited),
        );

        Ok(())
    }

    /// Get a user's current configuration
    pub fn get_user_config(e: Env, user: Address) -> Result<UserConfig, YieldSweepError> {
        e.storage()
            .persistent()
            .get(&DataKey::UserConfig(user))
            .ok_or(YieldSweepError::UserNotConfigured)
    }

    // =========================================================================
    // CORE SWEEP FUNCTIONALITY (with Blend Integration)
    // =========================================================================

    /// Sweep excess funds from user's wallet into the vault and optionally Blend.
    ///
    /// This function:
    /// 1. Checks the user's REAL on-chain token balance
    /// 2. Compares it to their safety limit
    /// 3. Transfers any excess to the vault
    /// 4. If Blend pool is configured, invests the excess for yield
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `user` - The user's address whose funds to sweep
    ///
    /// # Returns
    /// The amount that was swept into the vault
    pub fn sweep(e: Env, user: Address) -> Result<i128, YieldSweepError> {
        // Ensure contract is initialized
        let config = Self::require_initialized(&e)?;

        // Get the user's configuration (they must have set a safety limit)
        let mut user_config = e
            .storage()
            .persistent()
            .get::<DataKey, UserConfig>(&DataKey::UserConfig(user.clone()))
            .ok_or(YieldSweepError::UserNotConfigured)?;

        // Create a REAL token client using the stored token address
        let token_client = token::Client::new(&e, &config.token);

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

        // Get the contract's own address (the vault)
        let vault_address = e.current_contract_address();

        // Transfer excess from user to vault
        // NOTE: User must have approved this contract to spend their tokens
        token_client.transfer_from(
            &vault_address,    // spender (this contract, pre-approved)
            &user,             // from (the user's wallet)
            &vault_address,    // to (the vault)
            &excess,           // amount to transfer
        );

        // Update user's deposited amount
        user_config.deposited = user_config
            .deposited
            .checked_add(excess)
            .ok_or(YieldSweepError::Overflow)?;

        // If Blend pool is configured, invest the funds for yield
        if let Some(blend_pool) = &config.blend_pool {
            // Create Blend client and supply funds
            let blend_client = BlendPoolClient::new(&e, blend_pool);
            
            // Approve Blend to spend our tokens
            token_client.approve(&vault_address, blend_pool, &excess, &(e.ledger().sequence() + 1000));
            
            // Supply to Blend for yield
            blend_client.supply(&vault_address, &config.token, &excess);
            
            // Track invested amount
            user_config.invested = user_config
                .invested
                .checked_add(excess)
                .ok_or(YieldSweepError::Overflow)?;
            
            // Update total invested in Blend
            Self::update_total_invested(&e, excess, true)?;
            
            // Emit investment event
            e.events().publish(
                (Symbol::new(&e, EVENT_INVESTED), user.clone()),
                (excess, blend_pool.clone()),
            );
        }

        // Save the updated user config
        e.storage()
            .persistent()
            .set(&DataKey::UserConfig(user.clone()), &user_config);

        // Update total vault deposits
        Self::update_total_deposits(&e, excess, true)?;

        // Emit sweep event
        e.events().publish(
            (Symbol::new(&e, EVENT_SWEPT), user.clone()),
            (excess, user_config.deposited),
        );

        Ok(excess)
    }

    // =========================================================================
    // DEPOSIT FUNCTIONALITY
    // =========================================================================

    /// Manually deposit funds into the vault.
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `user` - The user's address (must authenticate)
    /// * `amount` - The amount to deposit
    ///
    /// # Security
    /// * Requires authentication from the user address
    pub fn deposit(e: Env, user: Address, amount: i128) -> Result<(), YieldSweepError> {
        // Ensure contract is initialized
        let config = Self::require_initialized(&e)?;

        // AUTHENTICATION: Verify the transaction was signed by the user
        user.require_auth();

        // Validate the amount
        if amount <= 0 {
            return Err(YieldSweepError::InvalidAmount);
        }

        // Create token client
        let token_client = token::Client::new(&e, &config.token);
        let vault_address = e.current_contract_address();

        // Transfer tokens from user to vault
        token_client.transfer_from(
            &vault_address,
            &user,
            &vault_address,
            &amount,
        );

        // Get or create user config
        let mut user_config = Self::get_user_config_or_default(&e, &user);

        // Update user's deposited amount
        user_config.deposited = user_config
            .deposited
            .checked_add(amount)
            .ok_or(YieldSweepError::Overflow)?;

        // Save updated config
        e.storage()
            .persistent()
            .set(&DataKey::UserConfig(user.clone()), &user_config);

        // Update total vault deposits
        Self::update_total_deposits(&e, amount, true)?;

        // Emit deposit event
        e.events().publish(
            (Symbol::new(&e, EVENT_DEPOSITED), user.clone()),
            (amount, user_config.deposited),
        );

        Ok(())
    }

    // =========================================================================
    // WITHDRAWAL FUNCTIONALITY
    // =========================================================================

    /// Withdraw a specific amount from the vault back to the user's wallet.
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `user` - The user's address (must authenticate)
    /// * `amount` - The amount to withdraw
    ///
    /// # Security
    /// * Requires authentication from the user address
    pub fn withdraw(e: Env, user: Address, amount: i128) -> Result<(), YieldSweepError> {
        // Ensure contract is initialized
        let config = Self::require_initialized(&e)?;

        // AUTHENTICATION: Verify the transaction was signed by the user
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
        if user_config.deposited < amount {
            return Err(YieldSweepError::InsufficientBalance);
        }

        let vault_address = e.current_contract_address();
        let token_client = token::Client::new(&e, &config.token);

        // If funds are in Blend, withdraw them first
        if user_config.invested > 0 && config.blend_pool.is_some() {
            let blend_pool = config.blend_pool.as_ref().unwrap();
            let blend_client = BlendPoolClient::new(&e, blend_pool);
            
            // Withdraw from Blend (up to invested amount or requested amount)
            let withdraw_from_blend = if amount <= user_config.invested {
                amount
            } else {
                user_config.invested
            };
            
            blend_client.withdraw(&vault_address, &config.token, &withdraw_from_blend);
            
            user_config.invested = user_config
                .invested
                .checked_sub(withdraw_from_blend)
                .ok_or(YieldSweepError::Overflow)?;
            
            Self::update_total_invested(&e, withdraw_from_blend, false)?;
        }

        // Transfer tokens from vault back to user
        token_client.transfer(
            &vault_address,
            &user,
            &amount,
        );

        // Update user's deposited amount
        user_config.deposited = user_config
            .deposited
            .checked_sub(amount)
            .ok_or(YieldSweepError::Overflow)?;

        // Save updated config
        e.storage()
            .persistent()
            .set(&DataKey::UserConfig(user.clone()), &user_config);

        // Update total vault deposits
        Self::update_total_deposits(&e, amount, false)?;

        // Emit withdrawal event
        e.events().publish(
            (Symbol::new(&e, EVENT_WITHDRAWN), user.clone()),
            (amount, user_config.deposited),
        );

        Ok(())
    }

    /// Emergency exit: Withdraw ALL funds from Blend and vault back to user.
    ///
    /// This is the "panic button" - pulls everything out and sends to user.
    ///
    /// # Arguments
    /// * `e` - The Soroban environment
    /// * `user` - The user's address (must authenticate)
    ///
    /// # Returns
    /// The total amount withdrawn
    pub fn withdraw_all(e: Env, user: Address) -> Result<i128, YieldSweepError> {
        // Ensure contract is initialized
        let config = Self::require_initialized(&e)?;

        // AUTHENTICATION: Verify the transaction was signed by the user
        user.require_auth();

        // Get user's current configuration
        let mut user_config = e
            .storage()
            .persistent()
            .get::<DataKey, UserConfig>(&DataKey::UserConfig(user.clone()))
            .ok_or(YieldSweepError::UserNotConfigured)?;

        // Nothing to withdraw
        if user_config.deposited == 0 {
            return Err(YieldSweepError::InsufficientBalance);
        }

        let vault_address = e.current_contract_address();
        let token_client = token::Client::new(&e, &config.token);
        let mut total_withdrawn = 0_i128;

        // If funds are invested in Blend, withdraw everything first
        if user_config.invested > 0 && config.blend_pool.is_some() {
            let blend_pool = config.blend_pool.as_ref().unwrap();
            let blend_client = BlendPoolClient::new(&e, blend_pool);
            
            // Withdraw all invested from Blend
            let withdrawn_from_blend = blend_client.withdraw(
                &vault_address,
                &config.token,
                &user_config.invested
            );
            
            // Update total invested tracking
            Self::update_total_invested(&e, user_config.invested, false)?;
            
            // Note: withdrawn_from_blend might be more than invested due to yield
            total_withdrawn = withdrawn_from_blend;
            user_config.invested = 0;
        }

        // Calculate total amount to send to user
        let amount_to_send = if total_withdrawn > 0 {
            total_withdrawn // Use Blend withdrawal amount (includes yield)
        } else {
            user_config.deposited // Just use deposited if no Blend
        };

        // Transfer all tokens from vault back to user
        token_client.transfer(
            &vault_address,
            &user,
            &amount_to_send,
        );

        // Update totals
        Self::update_total_deposits(&e, user_config.deposited, false)?;

        // Reset user config
        let final_amount = user_config.deposited;
        user_config.deposited = 0;
        user_config.invested = 0;

        // Save updated config
        e.storage()
            .persistent()
            .set(&DataKey::UserConfig(user.clone()), &user_config);

        // Emit withdraw_all event
        e.events().publish(
            (Symbol::new(&e, EVENT_WITHDRAW_ALL), user.clone()),
            amount_to_send,
        );

        Ok(final_amount)
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// Get the total deposits in the vault across all users
    pub fn get_total_deposits(e: Env) -> i128 {
        e.storage()
            .persistent()
            .get(&DataKey::TotalVaultDeposits)
            .unwrap_or(0)
    }

    /// Get the total amount invested in Blend across all users
    pub fn get_total_invested(e: Env) -> i128 {
        e.storage()
            .persistent()
            .get(&DataKey::TotalInvestedInBlend)
            .unwrap_or(0)
    }

    /// Get the vault's current token balance
    pub fn get_vault_balance(e: Env) -> Result<i128, YieldSweepError> {
        let config = Self::require_initialized(&e)?;
        let token_client = token::Client::new(&e, &config.token);
        Ok(token_client.balance(&e.current_contract_address()))
    }

    /// Get a user's real-time wallet balance
    pub fn get_user_balance(e: Env, user: Address) -> Result<i128, YieldSweepError> {
        let config = Self::require_initialized(&e)?;
        let token_client = token::Client::new(&e, &config.token);
        Ok(token_client.balance(&user))
    }

    /// Calculate how much would be swept for a user
    pub fn calculate_sweep_amount(e: Env, user: Address) -> Result<i128, YieldSweepError> {
        let config = Self::require_initialized(&e)?;

        let user_config = e
            .storage()
            .persistent()
            .get::<DataKey, UserConfig>(&DataKey::UserConfig(user.clone()))
            .ok_or(YieldSweepError::UserNotConfigured)?;

        let token_client = token::Client::new(&e, &config.token);
        let real_balance = token_client.balance(&user);

        if real_balance <= user_config.safety_limit {
            return Ok(0);
        }

        real_balance
            .checked_sub(user_config.safety_limit)
            .ok_or(YieldSweepError::Overflow)
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

    /// Update the total invested in Blend
    fn update_total_invested(e: &Env, amount: i128, is_investment: bool) -> Result<(), YieldSweepError> {
        let current: i128 = e
            .storage()
            .persistent()
            .get(&DataKey::TotalInvestedInBlend)
            .unwrap_or(0);

        let new_total = if is_investment {
            current.checked_add(amount).ok_or(YieldSweepError::Overflow)?
        } else {
            current.checked_sub(amount).ok_or(YieldSweepError::Overflow)?
        };

        e.storage()
            .persistent()
            .set(&DataKey::TotalInvestedInBlend, &new_total);

        Ok(())
    }
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{StellarAssetClient, TokenClient},
        Env,
    };

    /// Test contract initialization
    #[test]
    fn test_initialization() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);

        // Create test token
        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();

        // Register the vault contract
        let vault_id = e.register(YieldSweepVault, ());
        let client = YieldSweepVaultClient::new(&e, &vault_id);

        // Initialize
        client.init(&admin, &token_address);

        // Verify
        let config = client.get_config();
        assert!(config.initialized);
        assert_eq!(config.token, token_address);
        assert_eq!(config.admin, admin);
        assert!(config.blend_pool.is_none());
    }

    /// Test setting safety limit
    #[test]
    fn test_set_safety_limit() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);

        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();

        let vault_id = e.register(YieldSweepVault, ());
        let client = YieldSweepVaultClient::new(&e, &vault_id);
        client.init(&admin, &token_address);

        // Set safety limit
        client.set_safety_limit(&user, &1000_i128);

        // Verify
        let user_config = client.get_user_config(&user);
        assert_eq!(user_config.safety_limit, 1000_i128);
        assert_eq!(user_config.deposited, 0_i128);
        assert_eq!(user_config.invested, 0_i128);
    }

    /// Test the sweep calculation logic
    #[test]
    fn test_sweep_calculation() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);

        // Create and setup token
        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_admin = StellarAssetClient::new(&e, &token_address);
        let token_client = TokenClient::new(&e, &token_address);

        // Mint 10,000 tokens to user
        token_admin.mint(&user, &10000_i128);
        assert_eq!(token_client.balance(&user), 10000_i128);

        // Setup vault
        let vault_id = e.register(YieldSweepVault, ());
        let client = YieldSweepVaultClient::new(&e, &vault_id);
        client.init(&admin, &token_address);

        // Set safety limit to 3000
        client.set_safety_limit(&user, &3000_i128);

        // Calculate expected sweep amount
        let sweep_amount = client.calculate_sweep_amount(&user);
        assert_eq!(sweep_amount, 7000_i128); // 10000 - 3000 = 7000
    }

    /// Test the actual sweep functionality
    #[test]
    fn test_sweep() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);

        // Create and setup token
        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_admin = StellarAssetClient::new(&e, &token_address);
        let token_client = TokenClient::new(&e, &token_address);

        // Mint tokens to user
        token_admin.mint(&user, &10000_i128);

        // Setup vault
        let vault_id = e.register(YieldSweepVault, ());
        let client = YieldSweepVaultClient::new(&e, &vault_id);
        client.init(&admin, &token_address);

        // Approve vault to spend user's tokens
        token_client.approve(&user, &vault_id, &10000_i128, &1000);

        // Set safety limit to 2000
        client.set_safety_limit(&user, &2000_i128);

        // Execute sweep
        let swept = client.sweep(&user);
        assert_eq!(swept, 8000_i128); // 10000 - 2000 = 8000

        // Verify user balance decreased
        assert_eq!(token_client.balance(&user), 2000_i128);

        // Verify vault balance increased
        assert_eq!(token_client.balance(&vault_id), 8000_i128);

        // Verify user config updated
        let user_config = client.get_user_config(&user);
        assert_eq!(user_config.deposited, 8000_i128);

        // Verify total deposits
        assert_eq!(client.get_total_deposits(), 8000_i128);
    }

    /// Test withdrawal
    #[test]
    fn test_withdraw() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);

        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_admin = StellarAssetClient::new(&e, &token_address);
        let token_client = TokenClient::new(&e, &token_address);

        token_admin.mint(&user, &10000_i128);

        let vault_id = e.register(YieldSweepVault, ());
        let client = YieldSweepVaultClient::new(&e, &vault_id);
        client.init(&admin, &token_address);

        token_client.approve(&user, &vault_id, &10000_i128, &1000);

        // Sweep funds first
        client.set_safety_limit(&user, &2000_i128);
        client.sweep(&user);

        // User has 2000 in wallet, 8000 in vault
        assert_eq!(token_client.balance(&user), 2000_i128);
        assert_eq!(token_client.balance(&vault_id), 8000_i128);

        // Withdraw 3000
        client.withdraw(&user, &3000_i128);

        // Verify balances after withdrawal
        assert_eq!(token_client.balance(&user), 5000_i128);
        assert_eq!(token_client.balance(&vault_id), 5000_i128);

        // Verify user config
        let user_config = client.get_user_config(&user);
        assert_eq!(user_config.deposited, 5000_i128);
    }

    /// Test withdraw_all emergency exit
    #[test]
    fn test_withdraw_all() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);

        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_admin = StellarAssetClient::new(&e, &token_address);
        let token_client = TokenClient::new(&e, &token_address);

        token_admin.mint(&user, &10000_i128);

        let vault_id = e.register(YieldSweepVault, ());
        let client = YieldSweepVaultClient::new(&e, &vault_id);
        client.init(&admin, &token_address);

        token_client.approve(&user, &vault_id, &10000_i128, &1000);

        // Sweep all excess
        client.set_safety_limit(&user, &2000_i128);
        client.sweep(&user);

        // User has 2000 in wallet, 8000 in vault
        assert_eq!(token_client.balance(&user), 2000_i128);
        
        // Emergency withdraw all
        let withdrawn = client.withdraw_all(&user);
        assert_eq!(withdrawn, 8000_i128);

        // Verify all funds returned
        assert_eq!(token_client.balance(&user), 10000_i128);
        assert_eq!(token_client.balance(&vault_id), 0_i128);

        // Verify user config reset
        let user_config = client.get_user_config(&user);
        assert_eq!(user_config.deposited, 0_i128);
        assert_eq!(user_config.invested, 0_i128);
    }

    /// Test no excess funds scenario
    #[test]
    fn test_no_excess_funds() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);

        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_admin = StellarAssetClient::new(&e, &token_address);

        // Mint only 1000 tokens
        token_admin.mint(&user, &1000_i128);

        let vault_id = e.register(YieldSweepVault, ());
        let client = YieldSweepVaultClient::new(&e, &vault_id);
        client.init(&admin, &token_address);

        // Set safety limit to 2000 (higher than balance)
        client.set_safety_limit(&user, &2000_i128);

        // Sweep should return 0 (no excess)
        let sweep_amount = client.calculate_sweep_amount(&user);
        assert_eq!(sweep_amount, 0_i128);
    }

    /// Test vault balance view function
    #[test]
    fn test_get_vault_balance() {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let user = Address::generate(&e);

        let token_contract = e.register_stellar_asset_contract_v2(admin.clone());
        let token_address = token_contract.address();
        let token_admin = StellarAssetClient::new(&e, &token_address);
        let token_client = TokenClient::new(&e, &token_address);

        token_admin.mint(&user, &10000_i128);

        let vault_id = e.register(YieldSweepVault, ());
        let client = YieldSweepVaultClient::new(&e, &vault_id);
        client.init(&admin, &token_address);

        token_client.approve(&user, &vault_id, &10000_i128, &1000);

        // Initially vault is empty
        assert_eq!(client.get_vault_balance(), 0_i128);

        // After sweep
        client.set_safety_limit(&user, &5000_i128);
        client.sweep(&user);

        assert_eq!(client.get_vault_balance(), 5000_i128);
    }
}
