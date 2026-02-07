# Yield-Sweep 🚀

**Automated DeFi Yield Optimization on Stellar Soroban**

Turn your crypto wallet into a smart savings account. Set a safety limit, and Yield-Sweep automatically invests excess funds into high-yield DeFi protocols while keeping your spending money liquid.

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue?logo=stellar)](https://stellar.org)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange?logo=rust)](https://www.rust-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ Features

- 🎯 **Safety-First Design**: Set a safety limit, funds below it stay liquid
- ⚡ **Atomic Operations**: Multi-protocol interactions in single transactions
- 💰 **Liquid Restaking**: Stack yield from Blend (5%) + Aquarius (9.5%) = 14.5% APY
- 🔐 **Non-Custodial**: You always control your funds
- 🚪 **Emergency Exit**: One-click withdrawal, no lock-ups
- 📊 **Real-Time Tracking**: Live balance updates and earnings projections

---

## 🎬 Quick Demo (For Judges)

### 1️⃣ Preparation (5 minutes)
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/yield-sweep
cd yield-sweep

# Run the demo preparation script
./prepare-demo.sh

# This will:
# - Check all dependencies
# - Install packages
# - Show important URLs
# - Start the development server
```

### 2️⃣ Demo Flow (5-7 minutes)
Follow the comprehensive guide: **[DEMO_GUIDE.md](DEMO_GUIDE.md)**

**Key Demo Points:**
1. ✅ Connect real Freighter wallet
2. ✅ Show balance matching Stellar Explorer
3. ✅ Set safety limit with on-chain transaction
4. ✅ Execute sweep - verify transaction hash
5. ✅ Show funds in Blend + Aquarius on Explorer
6. ✅ Emergency withdrawal demonstration

### 3️⃣ Verification
Every transaction is verifiable on:
**https://stellar.expert/explorer/testnet**

---

## 🏗️ Architecture

```
User Wallet → Yield-Sweep Contract → Blend Protocol (5% APY)
                                   → Aquarius Gauge (9.5% APY)
                                   = 14.5% Total APY
```

- **Backend**: Rust smart contract (1,292 lines) on Stellar Soroban
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS
- **Blockchain**: Stellar Testnet (mainnet-ready)

See detailed architecture: **[TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md)**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (or npm)
- Rust 1.70+
- Soroban CLI
- Freighter Wallet

### Installation

```bash
# 1. Install frontend dependencies
cd Frontend
pnpm install

# 2. Start development server
pnpm dev

# 3. Open http://localhost:3000
```

### Building the Smart Contract

```bash
# 1. Navigate to contract directory
cd Backend/yield_sweep

# 2. Build for Soroban
cargo build --target wasm32-unknown-unknown --release

# 3. Deploy (testnet)
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/yield_sweep.wasm \
  --network testnet \
  --source YOUR_SECRET_KEY
```

---

## 📁 Project Structure

```
yield-sweep/
├── Backend/
│   └── yield_sweep/
│       └── contracts/
│           └── yield-sweep/
│               └── src/
│                   └── lib.rs          # Main contract (1,292 lines)
├── Frontend/
│   ├── app/
│   │   ├── page.tsx                    # Main application
│   │   └── layout.tsx                  # Root layout
│   ├── components/
│   │   ├── views/                      # Landing, Dashboard
│   │   ├── modals/                     # Deposit, Withdraw
│   │   ├── DemoHelper.tsx              # Demo assistant
│   │   └── TransactionNotification.tsx # Explorer links
│   ├── hooks/
│   │   └── useYieldVault.ts            # Blockchain logic (801 lines)
│   └── constants.ts                    # Contract addresses
├── DEMO_GUIDE.md                       # Comprehensive demo script
├── TECHNICAL_OVERVIEW.md               # Architecture details
└── prepare-demo.sh                     # One-click demo setup
```

---

## 🔑 Key Components

### Smart Contract Functions

```rust
// User functions
pub fn set_safety_limit(e: Env, user: Address, limit: i128)
pub fn sweep(e: Env, user: Address) -> i128
pub fn check_and_sweep(e: Env, user: Address) -> (i128, i128) // Atomic
pub fn deposit(e: Env, user: Address, amount: i128)
pub fn withdraw(e: Env, user: Address, amount: i128)
pub fn withdraw_all(e: Env, user: Address) -> i128

// View functions
pub fn get_user_config(e: Env, user: Address) -> UserConfig
pub fn calculate_sweep_amount(e: Env, user: Address) -> i128
```

### Frontend Hook

```typescript
const {
  balance,              // Real XLM balance from blockchain
  vaultBalance,         // Amount in yield vault
  safetyLimit,          // User's safety threshold
  investedAmount,       // In Blend protocol
  sweep,                // Execute sweep operation
  withdrawAll,          // Emergency exit
  transactionNotification, // With explorer links
} = useYieldVault();
```

---

## 🎯 Live Demo Features

### 🟢 Transaction Notifications
Every action shows:
- ✅ Transaction hash
- ✅ Copy to clipboard button
- ✅ Direct link to Stellar Explorer
- ✅ Real-time status updates

### 🟢 Demo Helper (Bottom Left)
Quick access to:
- Contract address + Explorer link
- Your wallet address + Explorer link
- Friendbot (testnet funding)
- Demo tips for judges

### 🟢 Real Blockchain Integration
- All balances from Horizon API
- Every transaction on Stellar testnet
- Verifiable smart contract calls
- No mock data or simulations

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Transaction Time | <5 seconds |
| Gas Cost | ~$0.0001 per tx |
| Throughput | 1000+ TPS |
| Contract Size | ~50 KB |
| APY | 14.5% (combined) |

---

## 🔒 Security

- ✅ **Non-custodial**: Users always control funds
- ✅ **Audited patterns**: Based on Soroban best practices
- ✅ **Emergency exits**: Instant withdrawal capability
- ✅ **Safety limits**: Funds below threshold never touched
- ✅ **Authentication**: All critical functions require signatures

---

## 🧪 Testing

```bash
# Run contract tests
cd Backend/yield_sweep/contracts/yield-sweep
cargo test

# Expected output:
# test test_initialization ... ok
# test test_set_safety_limit ... ok
# test test_sweep ... ok
# test test_withdraw ... ok
# test test_withdraw_all ... ok
```

**8+ comprehensive unit tests** covering:
- Initialization
- Safety limit configuration
- Sweep calculations
- Withdrawals
- Edge cases

---

## 🌐 Contract Addresses (Testnet)

```
Contract:      CBSGX2SJQRPOMTDLA3W54V7XV3ALA7FN3G7VOTST55VLILVWUWJKD5XV
Token (XLM):   CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
RPC:           https://soroban-testnet.stellar.org
Network:       Test SDF Network ; September 2015
```

**View Contract:**
https://stellar.expert/explorer/testnet/contract/CBSGX2SJQRPOMTDLA3W54V7XV3ALA7FN3G7VOTST55VLILVWUWJKD5XV

---

## 🛣️ Roadmap

### ✅ Phase 1 - Testnet (Current)
- [x] Core sweep functionality
- [x] Blend Protocol integration
- [x] Aquarius liquid restaking
- [x] Emergency withdrawals
- [x] Beautiful UI with Explorer integration

### 🚀 Phase 2 - Mainnet (Q2 2026)
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Multi-asset support (USDC, EURC)
- [ ] Gas optimizations
- [ ] Advanced analytics

### 🌟 Phase 3 - Advanced Features (Q3 2026)
- [ ] AI-powered yield optimization
- [ ] Cross-chain bridges
- [ ] Automated rebalancing
- [ ] Governance token
- [ ] Mobile app

---

## 📚 Documentation

- **Demo Script**: [DEMO_GUIDE.md](DEMO_GUIDE.md) - Complete pitch walkthrough
- **Technical Docs**: [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) - Architecture details
- **Contract Code**: [Backend/yield_sweep/contracts/yield-sweep/src/lib.rs](Backend/yield_sweep/contracts/yield-sweep/src/lib.rs)
- **Frontend Hook**: [Frontend/hooks/useYieldVault.ts](Frontend/hooks/useYieldVault.ts)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🔗 Links

- **Stellar Docs**: https://developers.stellar.org
- **Soroban Docs**: https://soroban.stellar.org
- **Freighter Wallet**: https://www.freighter.app
- **Stellar Expert**: https://stellar.expert
- **Stellar Lab**: https://laboratory.stellar.org

---

## 🎤 For Judges & Investors

### Why Yield-Sweep?

1. **Real Product**: Not a prototype - actual deployed contract on testnet
2. **Technical Excellence**: 1,292 lines of production Rust code
3. **Innovation**: First atomic liquid restaking on Stellar
4. **User Experience**: Bank-like simplicity with DeFi yields
5. **Verifiable**: Every transaction visible on blockchain

### Key Differentiators

| Feature | Yield-Sweep | Traditional DeFi |
|---------|-------------|------------------|
| Automation | Fully automated | Manual steps |
| Liquidity | Instant access | Lock-up periods |
| Complexity | Set & forget | Complex strategies |
| APY | 14.5% | 3-8% |
| Gas Costs | $0.0001 | $10-100 |

### Contact

- **Email**: your-email@example.com
- **Twitter**: @YourHandle
- **Demo**: http://localhost:3000 (run locally)
- **Contract**: [View on Explorer](https://stellar.expert/explorer/testnet/contract/CBSGX2SJQRPOMTDLA3W54V7XV3ALA7FN3G7VOTST55VLILVWUWJKD5XV)

---

## 🙏 Acknowledgments

Built with:
- Stellar Soroban smart contract platform
- Blend Protocol (lending)
- Aquarius Protocol (gauges)
- Freighter Wallet
- Next.js & Tailwind CSS

---

**🚀 Ready to revolutionize DeFi savings?**

Start the demo: `./prepare-demo.sh`

---

<p align="center">
  Made with ❤️ for the Stellar ecosystem
</p>
