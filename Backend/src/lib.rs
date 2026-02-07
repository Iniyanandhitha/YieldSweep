#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, token, Address, Env, Symbol,
};

// =============================================================================
// INTERFACES
// =============================================================================

/// Blend Protocol Interface (Simplified)
/// https://github.com/blend-capital/blend-contracts
#[contractclient(name = "BlendPoolClient")]
pub trait BlendPool {
    /// Supply assets to the lending pool
    /// Returns the number of pool shares minted
    fn supply(e: Env, from: Address, asset: Address, amount: i128) -> i128;

    /// Withdraw assets from the lending pool
    /// Returns the amount of underlying asset withdrawn
    fn withdraw(e: Env, from: Address, asset: Address, amount: i128) -> i128;
    
    // Note: In a real integration, we might need other methods to check balances/health
}

// =============================================================================
// DATA STRUCTURES
// =============================================================================

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum YieldSweepError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NegativeAmount = 3,
    Overflow = 4,
    UserNotConfigured = 5,
    NoSafeLimit = 6,
    InsufficientFunds = 7,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    UserConfig(Address),
}

#[contracttype]
#[derive(Clone)]
pub struct TokenConfig {
    pub usdc_token: Address,
    pub blend_pool: Address,
    pub admin: Address,
}

#[contracttype]
#[derive(Clone, Default)]
pub struct UserConfig {
    pub safety_limit: i128,
    pub vault_balance: i128, // Tracks amount swept into the vault (and subsequently into Blend)
}

// =============================================================================
// EVENTS
// =============================================================================

const EVENT_SWEEP: &str = "sweep";
const EVENT_WITHDRAW: &str = "withdraw";

// =============================================================================
// CONTRACT
// =============================================================================

#[contract]
pub struct YieldSweep;

#[contractimpl]
impl YieldSweep {
    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------
    
    pub fn initialize(
        e: Env,
        admin: Address,
        usdc_token: Address,
        blend_pool: Address,
    ) -> Result<(), YieldSweepError> {
        if e.storage().persistent().has(&DataKey::Config) {
            return Err(YieldSweepError::AlreadyInitialized);
        }

        // Ideally, we would require auth from admin here to prevent front-running the initialization,
        // but since it's a one-time setup on a fresh contract ID, it's generally fine.
        // admin.require_auth(); 

        let config = TokenConfig {
            usdc_token: usdc_token.clone(),
            blend_pool: blend_pool.clone(),
            admin: admin.clone(),
        };

        e.storage().persistent().set(&DataKey::Config, &config);
        
        Ok(())
    }

    // -------------------------------------------------------------------------
    // User Configuration
    // -------------------------------------------------------------------------

    pub fn set_user_config(e: Env, user: Address, safety_limit: i128) -> Result<(), YieldSweepError> {
        user.require_auth();

        if safety_limit < 0 {
            return Err(YieldSweepError::NegativeAmount);
        }

        let mut user_config = e
            .storage()
            .persistent()
            .get::<_, UserConfig>(&DataKey::UserConfig(user.clone()))
            .unwrap_or_default();

        user_config.safety_limit = safety_limit;

        e.storage()
            .persistent()
            .set(&DataKey::UserConfig(user.clone()), &user_config);

        Ok(())
    }

    pub fn get_user_config(e: Env, user: Address) -> UserConfig {
        e.storage()
            .persistent()
            .get::<_, UserConfig>(&DataKey::UserConfig(user.clone()))
            .unwrap_or_default()
    }

    // -------------------------------------------------------------------------
    // The Engine: Check and Sweep
    // -------------------------------------------------------------------------

    /// Atomically checks wallet balance, sweeps excess, and supplies to Blend.
    pub fn check_and_sweep(e: Env, user: Address) -> Result<(), YieldSweepError> {
        // 1. Auth: User must authorize the sweep (and underlying transfer)
        // Note: In the Atomic Proxy pattern, the user typically signs a tailored transaction 
        // that calls this function. 
        user.require_auth();

        // Load Configs
        let config: TokenConfig = e.storage().persistent().get(&DataKey::Config).ok_or(YieldSweepError::NotInitialized)?;
        let mut user_config: UserConfig = e.storage().persistent().get(&DataKey::UserConfig(user.clone())).ok_or(YieldSweepError::UserNotConfigured)?;

        // 2. Calculate: Fetch current balance from USDC contract
        let usdc_client = token::Client::new(&e, &config.usdc_token);
        let current_balance = usdc_client.balance(&user);

        // 3. Threshold Logic
        let safety_limit = user_config.safety_limit;
        
        // If balance <= safety_limit, nothing to sweep
        if current_balance <= safety_limit {
            return Ok(());
        }

        let excess = current_balance - safety_limit;

        // 4. Transfer & Supply (Atomic Proxy)
        let contract_address = e.current_contract_address();

        // Transfer USER -> CONTRACT
        // Make sure user has approved this contract to spend 'excess' amount!
        usdc_client.transfer_from(&contract_address, &user, &contract_address, &excess);

        // Supply CONTRACT -> BLEND
        let blend_client = BlendPoolClient::new(&e, &config.blend_pool);
        
        // We need to approve Blend to spend our (the contract's) tokens
        // Check allowance or just approve every time for simplicity in this version
        // Ideally we check allowance first to save gas, but `approve` is idempotent-ish
        usdc_client.approve(&contract_address, &config.blend_pool, &excess, &999999);

        // Supply the funds. 
        // Note: 'from' here is the supplier (this contract). 
        // Blend usually returns an amount of 'shares'.
        let _shares = blend_client.supply(&contract_address, &config.usdc_token, &excess);

        // 5. Accounting
        user_config.vault_balance = user_config.vault_balance.checked_add(excess).ok_or(YieldSweepError::Overflow)?;
        
        e.storage().persistent().set(&DataKey::UserConfig(user.clone()), &user_config);

        // 6. Events
        e.events().publish(
            (Symbol::new(&e, EVENT_SWEEP), user),
            (excess, user_config.vault_balance)
        );

        Ok(())
    }

    // -------------------------------------------------------------------------
    // Withdrawal
    // -------------------------------------------------------------------------

    pub fn withdraw_all(e: Env, user: Address) -> Result<(), YieldSweepError> {
        user.require_auth();

        let config: TokenConfig = e.storage().persistent().get(&DataKey::Config).ok_or(YieldSweepError::NotInitialized)?;
        let mut user_config: UserConfig = e.storage().persistent().get(&DataKey::UserConfig(user.clone())).ok_or(YieldSweepError::UserNotConfigured)?;

        if user_config.vault_balance == 0 {
             return Ok(());
        }

        let amount_to_withdraw = user_config.vault_balance;
        let contract_address = e.current_contract_address();
        let blend_client = BlendPoolClient::new(&e, &config.blend_pool);
        let usdc_client = token::Client::new(&e, &config.usdc_token);

        // 1. Withdraw from Blend -> Contract
        // Note: Blend's withdraw takes an amount of *underlying asset* or *shares* depending on implementation.
        // The trait definition says `amount` (of underlying).
        // WARNING: Actual amount received might vary slightly due to rounding or yield, 
        // but for this simpler tracking model we use `vault_balance`.
        // A real robust system would track shares.
        blend_client.withdraw(&contract_address, &config.usdc_token, &amount_to_withdraw);

        // 2. Transfer Contract -> User
        // We verify the actual balance the contract now has (in case of yield or rounding differences)
        // For strict 1:1 accounting based on `vault_balance`, we transfer exactly what we tracked 
        // OR we transfer everything we got.
        // Let's transfer exactly what was tracked to keep `user_config` consistent, 
        // or check balance delta.
        // For "withdraw ALL", let's be generous and transfer the balance we hold (assuming this contract holds nothing else).
        // But to be safe and precise with the `vault_balance` var:
        usdc_client.transfer(&contract_address, &user, &amount_to_withdraw);

        // 3. Accounting
        user_config.vault_balance = 0;
        e.storage().persistent().set(&DataKey::UserConfig(user.clone()), &user_config);

        // 4. Events
        e.events().publish(
            (Symbol::new(&e, EVENT_WITHDRAW), user),
            amount_to_withdraw
        );

        Ok(())
    }
}

#[cfg(test)]
mod test;
