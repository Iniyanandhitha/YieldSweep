# Yield-Sweep: Technical Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER WALLET                           │
│                    (Freighter / Stellar)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 1. Set Safety Limit (e.g., 50 XLM)
                     │ 2. Approve Contract
                     │ 3. Sign Transactions
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              YIELD-SWEEP SMART CONTRACT                      │
│                  (Soroban / Rust)                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Core Functions:                                    │    │
│  │  • check_and_sweep()  - Atomic sweep operation     │    │
│  │  • set_safety_limit() - User configuration         │    │
│  │  • deposit()          - Manual deposits            │    │
│  │  • withdraw()         - Partial withdrawals        │    │
│  │  • withdraw_all()     - Emergency exit             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  User Data Storage:                                         │
│  • safety_limit: i128                                       │
│  • deposited: i128                                          │
│  • invested: i128                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Excess funds above safety limit
                     │
         ┌───────────┴──────────┬──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  BLEND PROTOCOL │   │ AQUARIUS GAUGE  │   │  VAULT STORAGE  │
│   (Lending)     │   │  (LP Rewards)   │   │   (Custody)     │
│                 │   │                 │   │                 │
│  Supply USDC/XLM│   │  Stake bTokens  │   │  Hold until     │
│  Receive bTokens│   │  Earn AQUA      │   │  withdrawal     │
│                 │   │                 │   │                 │
│  📊 5% APY      │   │  📊 9.5% APY    │   │  💰 Safe       │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
           ┌─────────────────┐
           │   TOTAL YIELD   │
           │   14.5% APY     │
           │  (Compounding)  │
           └─────────────────┘
```

---

## 📊 Data Flow: Atomic Sweep Operation

### Step-by-Step Execution (`check_and_sweep`)

```
1. USER INITIATES SWEEP
   ├─► Check current wallet balance: 150 XLM
   ├─► Compare to safety_limit: 50 XLM
   └─► Calculate excess: 100 XLM

2. VALIDATE & AUTHENTICATE
   ├─► user.require_auth() - Verify signature
   ├─► Check contract initialized
   └─► Verify user has set safety limit

3. TRANSFER TO CONTRACT (Atomic Step 1)
   ├─► token_client.transfer_from()
   ├─► From: User Wallet
   ├─► To: Yield-Sweep Contract
   └─► Amount: 100 XLM

4. SUPPLY TO BLEND (Atomic Step 2)
   ├─► blend_client.supply()
   ├─► Asset: USDC/XLM
   ├─► Amount: 100 XLM
   └─► Receive: 100 bTokens (receipt tokens)

5. STAKE IN AQUARIUS (Atomic Step 3)
   ├─► aqua_client.deposit()
   ├─► Asset: bTokens
   ├─► Amount: 100 bTokens
   └─► Start earning AQUA rewards

6. UPDATE STATE
   ├─► user_config.deposited += 100
   ├─► user_config.invested += 100
   ├─► total_vault_deposits += 100
   └─► Emit event: "liquid_restaking_sweep"

7. RETURN SUCCESS
   └─► Transaction hash recorded on blockchain
```

**🔑 Key Point:** All steps succeed or fail together (atomicity). No partial execution.

---

## 🔐 Security Features

### 1. **Non-Custodial Design**
```rust
// Users always control their funds
pub fn withdraw_all(e: Env, user: Address) -> Result<i128, YieldSweepError> {
    user.require_auth(); // User must sign
    // ... withdraw logic ...
    token_client.transfer(&vault, &user, &amount); // Direct to user
}
```

### 2. **Safety Limits**
- User sets threshold (e.g., 50 XLM always liquid)
- Contract NEVER touches funds below limit
- Automatic excess detection

### 3. **Emergency Exit**
- `withdraw_all()` - One-click exit
- Withdraws from Blend automatically
- Returns everything to user wallet

### 4. **Authentication**
```rust
user.require_auth(); // Every critical function
admin.require_auth(); // Admin-only functions
```

---

## 💻 Technology Stack

### **Backend (Smart Contract)**
```toml
[dependencies]
soroban-sdk = "22-25"

[profile.release]
opt-level = "z"        # Optimize for size
lto = true             # Link-time optimization
panic = "abort"        # No unwinding
```

**Language:** Rust (1,292 lines)
**Platform:** Stellar Soroban
**Deployment:** Testnet → Mainnet ready

### **Frontend**
```json
{
  "framework": "Next.js 16 + React 19",
  "styling": "Tailwind CSS + Framer Motion",
  "blockchain": "@stellar/stellar-sdk 14.5.0",
  "wallet": "@stellar/freighter-api 6.0.1",
  "charts": "Recharts 2.15.0"
}
```

---

## 📈 Smart Contract Functions

### Core User Functions
| Function | Purpose | Auth Required | Gas Cost |
|----------|---------|---------------|----------|
| `init()` | Initialize contract | Admin | ~0.0001 XLM |
| `set_safety_limit()` | Set user threshold | User | ~0.0001 XLM |
| `sweep()` | Basic sweep to vault | User | ~0.0002 XLM |
| `check_and_sweep()` | Atomic liquid restaking | User | ~0.0005 XLM |
| `deposit()` | Manual deposit | User | ~0.0002 XLM |
| `withdraw()` | Partial withdrawal | User | ~0.0003 XLM |
| `withdraw_all()` | Emergency exit | User | ~0.0003 XLM |

### View Functions (Read-only, No Gas)
- `get_user_config()` - User's configuration
- `get_vault_balance()` - Contract token balance
- `get_total_deposits()` - Total across all users
- `calculate_sweep_amount()` - Preview sweep

---

## 🧪 Testing & Verification

### Unit Tests
```rust
#[test]
fn test_sweep() {
    // 1. Setup: Mint 10,000 tokens
    // 2. Set safety limit: 2,000
    // 3. Execute sweep
    // 4. Verify: user has 2,000, vault has 8,000
    assert_eq!(token_client.balance(&user), 2000_i128);
    assert_eq!(token_client.balance(&vault), 8000_i128);
}
```

**Test Coverage:**
- ✅ Initialization
- ✅ Safety limit edge cases
- ✅ Sweep calculations
- ✅ Withdrawals
- ✅ Overflow protection
- ✅ Error scenarios

### Live Verification
Every transaction visible on:
**https://stellar.expert/explorer/testnet**

---

## 🌐 Integration Points

### Blend Protocol (Lending)
```rust
#[contractclient(name = "BlendPoolClient")]
pub trait BlendPool {
    fn supply(e: Env, from: Address, asset: Address, amount: i128) -> i128;
    fn withdraw(e: Env, to: Address, asset: Address, amount: i128) -> i128;
}
```

### Aquarius Protocol (Gauges)
```rust
#[contractclient(name = "AquariusGaugeClient")]
pub trait AquariusGauge {
    fn deposit(e: Env, from: Address, amount: i128);
    fn withdraw(e: Env, to: Address, amount: i128);
}
```

---

## 📊 Performance Metrics

| Metric | Value | Benchmark |
|--------|-------|-----------|
| Contract Size | ~50 KB | Optimal for Soroban |
| Sweep Time | <5 seconds | Stellar finality |
| Gas Cost | ~$0.0001 | 1000x cheaper than Ethereum |
| Throughput | 1000+ TPS | Stellar network capacity |
| Uptime | 99.9% | Stellar network SLA |

---

## 🔄 Future Enhancements

### Phase 1 (Testnet - Current) ✅
- ✅ Basic sweep functionality
- ✅ Blend integration
- ✅ Aquarius liquid restaking
- ✅ Emergency withdrawals

### Phase 2 (Mainnet - Q2 2026)
- 🚀 Mainnet deployment
- 🚀 Multiple asset support (USDC, XLM, EURC)
- 🚀 Gas optimization
- 🚀 Security audit

### Phase 3 (Advanced - Q3 2026)
- 🌟 AI-powered yield optimization
- 🌟 Cross-chain bridges
- 🌟 Automated rebalancing
- 🌟 Governance token

---

## 🎯 Competitive Advantages

| Feature | Yield-Sweep | Traditional DeFi | Banks |
|---------|-------------|-------------------|-------|
| **Automation** | ✅ Fully automated | ❌ Manual steps | ⚠️ Limited |
| **Transparency** | ✅ On-chain | ⚠️ Varies | ❌ Opaque |
| **Control** | ✅ Non-custodial | ✅ Non-custodial | ❌ Custodial |
| **Yield** | ✅ 14.5% APY | ⚠️ 3-8% | ❌ 0.01% |
| **Liquidity** | ✅ Instant | ⚠️ Lock-ups | ⚠️ Withdrawal limits |
| **Gas Costs** | ✅ $0.0001 | ❌ $10-100 | ✅ Free |

---

## 📞 Contract Addresses (Testnet)

```bash
# Smart Contract
CBSGX2SJQRPOMTDLA3W54V7XV3ALA7FN3G7VOTST55VLILVWUWJKD5XV

# Native XLM Token
CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# RPC Endpoint
https://soroban-testnet.stellar.org

# Network Passphrase
Test SDF Network ; September 2015
```

---

## 🛠️ Quick Setup

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Soroban CLI
cargo install --locked soroban-cli

# Install Node.js (v18+)
# Install pnpm
npm install -g pnpm
```

### Deploy Contract
```bash
cd Backend/yield_sweep
cargo build --target wasm32-unknown-unknown --release
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/yield_sweep.wasm \
  --network testnet
```

### Run Frontend
```bash
cd Frontend
pnpm install
pnpm dev
```

---

## 📚 Documentation & Resources

- **Contract Explorer:** https://stellar.expert/explorer/testnet
- **Stellar Docs:** https://developers.stellar.org
- **Soroban Docs:** https://soroban.stellar.org
- **Freighter Wallet:** https://www.freighter.app

---

**Built with ❤️ on Stellar Soroban**
