#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl, testutils::{Address as _, Events, Ledger}, token, Address, Env, IntoVal, Symbol,
};

// =============================================================================
// MOCK BLEND POOL
// =============================================================================

#[contract]
pub struct MockBlendPool;

#[contractimpl]
impl MockBlendPool {
    pub fn supply(e: Env, _from: Address, _asset: Address, amount: i128) -> i128 {
        // Mock logic: return same amount as shares for simplicity
        // We can track total supplied if needed
        e.events().publish((Symbol::new(&e, "supply"),), amount);
        amount
    }

    pub fn withdraw(e: Env, _from: Address, _asset: Address, amount: i128) -> i128 {
        // Mock logic: return same amount
        e.events().publish((Symbol::new(&e, "withdraw"),), amount);
        amount
    }
}

// =============================================================================
// TESTS
// =============================================================================

#[test]
fn test_initialization() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let usdc = Address::generate(&e);
    let blend = Address::generate(&e);

    let contract_id = e.register_contract(None, YieldSweep);
    let client = YieldSweepClient::new(&e, &contract_id);

    client.initialize(&admin, &usdc, &blend);

    // Verify initialization by trying to re-initialize (should fail)
    let result = client.try_initialize(&admin, &usdc, &blend);
    assert_eq!(result, Err(Ok(YieldSweepError::AlreadyInitialized)));
}

#[test]
fn test_user_config() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let usdc = Address::generate(&e);
    let blend = Address::generate(&e);
    let user = Address::generate(&e);

    let contract_id = e.register_contract(None, YieldSweep);
    let client = YieldSweepClient::new(&e, &contract_id);
    client.initialize(&admin, &usdc, &blend);

    // Set safety limit
    client.set_user_config(&user, &1000_i128);

    // Verify
    let config = client.get_user_config(&user);
    assert_eq!(config.safety_limit, 1000_i128);
    assert_eq!(config.vault_balance, 0);
}

#[test]
fn test_sweep_logic() {
    let e = Env::default();
    e.mock_all_auths();

    // 1. Setup
    let admin = Address::generate(&e);
    let user = Address::generate(&e);
    
    // Create USDC token
    let usdc_admin = Address::generate(&e);
    let usdc = e.register_stellar_asset_contract(usdc_admin.clone());
    let usdc_client = token::Client::new(&e, &usdc);

    // Create Mock Blend Pool
    let blend_id = e.register_contract(None, MockBlendPool);
    let blend_address = blend_id; // Address

    // Deploy YieldSweep
    let contract_id = e.register_contract(None, YieldSweep);
    let client = YieldSweepClient::new(&e, &contract_id);
    let contract_address = contract_id.clone(); // Address

    // Initialize
    client.initialize(&admin, &usdc, &blend_address);

    // 2. Prepare User
    // Mint 2000 USDC to user
    token::StellarAssetClient::new(&e, &usdc).mint(&user, &2000_i128);
    
    // User sets safety limit to 500
    client.set_user_config(&user, &500_i128);

    // User approves YieldSweep to spend their USDC
    // Note: In tests with mock_all_auths, this might be bypassed, but good to have
    usdc_client.approve(&user, &contract_address, &2000_i128, &200);

    // 3. Execute Sweep
    // Expected excess: 2000 - 500 = 1500
    client.check_and_sweep(&user);

    // 4. Verify
    // User wallet balance should be 500
    assert_eq!(usdc_client.balance(&user), 500_i128);

    // Contract should have approved Blend to spend 1500
    // And supplied it.
    // Since MockBlendPool doesn't hold tokens in this simplified test (unless we use a real token client for it),
    // we mostly verify the accounting in YieldSweep.
    // Wait, `MockBlendPool` doesn't actually grab the tokens in `supply`. 
    // In a real scenario, `blend_client.supply` would `transfer_from`.
    // Our MockBlendPool just returns.
    // So the tokens should be in the YieldSweep contract address now!
    // Because `check_and_sweep` does `transfer_from(user, contract, ...)`
    // THEN `supply`.
    // If `supply` (mock) doesn't take them, they stay in `contract`.
    assert_eq!(usdc_client.balance(&contract_address), 1500_i128);

    // Verify user config
    let config = client.get_user_config(&user);
    assert_eq!(config.vault_balance, 1500_i128);

    // Verify events
    // We expect a "sweep" event
    let events = e.events().all();
    // Look for the sweep event
    // Found event tuple: (contract_id, (symbol, user), (excess, vault_balance))
    // We can just assert data exists or count events
    // assert!(events.iter().len() > 0);
}

#[test]
fn test_withdraw_all() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user = Address::generate(&e);
    
    let usdc_admin = Address::generate(&e);
    let usdc = e.register_stellar_asset_contract(usdc_admin.clone());
    let usdc_client = token::Client::new(&e, &usdc);

    let blend_id = e.register_contract(None, MockBlendPool);
    let blend = blend_id;

    let contract_id = e.register_contract(None, YieldSweep);
    let client = YieldSweepClient::new(&e, &contract_id);
    let contract_address = contract_id.clone();

    client.initialize(&admin, &usdc, &blend);

    // Mint and set up scenario where user has 1500 in vault
    token::StellarAssetClient::new(&e, &usdc).mint(&user, &2000);
    client.set_user_config(&user, &500);
    usdc_client.approve(&user, &contract_address, &2000, &200);
    
    client.check_and_sweep(&user);

    // Now Withdraw All
    client.withdraw_all(&user);

    // User should have 2000 back (500 remained + 1500 withdrawn)
    assert_eq!(usdc_client.balance(&user), 2000);

    // Vault balance should be 0
    let config = client.get_user_config(&user);
    assert_eq!(config.vault_balance, 0);
}
