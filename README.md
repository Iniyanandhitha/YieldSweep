# Yield-Sweep 💎

<div align="center">

**Automated DeFi Yield Optimization on Stellar**

Transform your crypto wallet into a smart savings account with automated yield generation

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-7D00FF?logo=stellar&logoColor=white)](https://stellar.org)
[![Rust](https://img.shields.io/badge/Rust-1.70+-CE422B?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

[Demo](#-live-demo) • [Features](#-features) • [Architecture](#-architecture) • [Installation](#-installation) • [Usage](#-usage)

</div>

---

## 🎯 What is Yield-Sweep?

Yield-Sweep is an automated DeFi yield optimizer built on Stellar's Soroban smart contracts. It works like a smart savings account that:

1. **You set a safety limit** (e.g., keep 50 XLM liquid)
2. **It automatically sweeps excess funds** into high-yield DeFi protocols
3. **Earns 14.5% APY** through liquid restaking (Blend + Aquarius)
4. **You withdraw anytime** - no lock-ups, full control

Think of it as the "auto-save" feature for your crypto wallet, but earning yield on autopilot.

---

## ✨ Features

### 🔐 Safety First
- **Safety Limit Protection**: Funds below your threshold stay liquid for daily spending
- **Non-Custodial**: You always retain full control of your assets
- **Emergency Withdrawals**: One-click exit, no questions asked
- **Transparent Operations**: Every transaction verifiable on Stellar Explorer

### ⚡ Performance
- **Atomic Operations**: Multi-protocol interactions in single transactions
- **Gas Optimized**: Minimal fees (~$0.0001 per transaction)
- **Sub-5 Second Transactions**: Leveraging Stellar's speed
- **Auto-Compounding**: Earnings automatically reinvested

### 💰 Yield Strategy
- **Liquid Restaking**: Stake once, earn twice
  - Blend Protocol: 5% APY (lending yield)
  - Aquarius Gauge: 9.5% APY (LP rewards)
  - **Total: 14.5% APY** 📈
- **No Impermanent Loss**: Single-asset strategies
- **Diversified Risk**: Multi-protocol exposure

### 📊 User Experience
- **Beautiful Dashboard**: Real-time balance tracking and earnings projections
- **Smooth Animations**: Framer Motion-powered interactions
- **Responsive Design**: Perfect on desktop and mobile
- **Wallet Integration**: Seamless Freighter wallet support

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER WALLET                           │
│              (Freighter / Stellar Account)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Set Safety Limit & Sign Transactions
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            YIELD-SWEEP SMART CONTRACT                    │
│                  (Soroban / Rust)                        │
│                                                          │
│  Core Functions:                                        │
│  ├─ check_and_sweep()    Atomic sweep logic            │
│  ├─ set_safety_limit()   User config storage           │
│  ├─ deposit()            Manual deposits               │
│  ├─ withdraw()           Partial withdrawals           │
│  └─ withdraw_all()       Emergency exit                │
│                                                          │
│  Storage (Per User):                                    │
│  ├─ safety_limit: i128                                 │
│  ├─ deposited: i128                                    │
│  └─ invested: i128                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Sweep excess funds above safety limit
                     │
         ┌───────────┴──────────┬──────────────────┐
         │                      │                  │
         ▼                      ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌────────────┐
│ BLEND PROTOCOL   │  │ AQUARIUS GAUGE   │  │   VAULT    │
│   (Lending)      │  │  (LP Rewards)    │  │  (Custody) │
│                  │  │                  │  │            │
│ Supply → bTokens │  │ Stake → AQUA     │  │ Safe Hold  │
│   📊 5% APY      │  │   📊 9.5% APY    │  │   💰       │
└──────────────────┘  └──────────────────┘  └────────────┘
```

### Smart Contract Flow

```rust
User Action: Sweep
     ↓
1. Check wallet balance
2. Calculate: excess = balance - safety_limit
3. If excess > 0:
   ├─ Transfer excess to contract
   ├─ Supply to Blend (get bTokens)
   ├─ Stake bTokens in Aquarius
   └─ Update user's invested balance
4. Emit events for transparency
```

---

## 🚀 Live Demo

### Testnet Deployment

- **Contract Address**: `CBSGX2SJQRPOMTDLA3W54V7XV3ALA7FN3G7VOTST55VLILVWUWJKD5XV`
- **Network**: Stellar Testnet
- **Explorer**: [View Contract](https://stellar.expert/explorer/testnet/contract/CBSGX2SJQRPOMTDLA3W54V7XV3ALA7FN3G7VOTST55VLILVWUWJKD5XV)

### Quick Start Demo

1. **Get Testnet XLM**: [Stellar Laboratory](https://laboratory.stellar.org/#account-creator)
2. **Install Freighter**: [Chrome Extension](https://www.freighter.app/)
3. **Run the app**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/yield-sweep
   cd yield-sweep
   ./prepare-demo.sh
   ```
4. **Open**: http://localhost:3000
5. **Connect wallet** and start earning! 🎉

---

## 💻 Tech Stack

### Backend (Smart Contract)
- **Language**: Rust 1.70+
- **Framework**: Soroban SDK 21.0
- **Lines of Code**: ~1,300 (production-ready)
- **Test Coverage**: 8+ comprehensive unit tests
- **Features**: Atomic operations, event logging, error handling

### Frontend
- **Framework**: Next.js 16 (App Router + Turbopack)
- **Language**: TypeScript 5.0
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4.0
- **Animations**: Framer Motion 12
- **Wallet**: Freighter API 6.0.1
- **Blockchain**: Stellar SDK 14.5.0

### Design System
- **Typography**: Inter font family (400-900 weights)
- **Color Palette**: Dark blue gradients, #3B82F6 primary
- **UI Pattern**: Glassmorphism with animated gradients
- **Responsive**: Mobile-first design

---

## 📦 Installation

### Prerequisites

- Node.js 18+ and pnpm
- Rust 1.70+ (for smart contract development)
- Stellar CLI (soroban-cli)
- Freighter wallet browser extension

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/yield-sweep
cd yield-sweep/Frontend

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Smart Contract Setup

```bash
cd Backend

# Build the contract
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test

# Deploy to testnet (requires Stellar CLI)
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/yield_sweep.wasm \
  --source YOUR_SECRET_KEY \
  --network testnet
```

---

## 📖 Usage

### 1. Connect Your Wallet

Click "Connect Wallet" and approve the Freighter connection.

### 2. Set Your Safety Limit

```
Example: Set safety limit to 50 XLM
├─ Your wallet has 150 XLM
├─ 50 XLM stays liquid (for spending)
└─ 100 XLM available to sweep into yield
```

Move the slider or enter an amount, then click "Update Safety Limit".

### 3. Sweep Excess Funds

Click the "Sweep" button. The contract will:
1. Approve token spending (you sign once)
2. Transfer excess funds to vault (you sign again)
3. Invest in Blend + Aquarius protocols
4. Show transaction hash - verify on Stellar Explorer

### 4. Watch Your Earnings Grow

The dashboard shows:
- **Wallet Balance**: Your liquid funds (≥ safety limit)
- **In Yield Vault**: Total deposited amount
- **Invested in Blend**: Amount earning 5% APY
- **Monthly Earnings**: Projected income at 14.5% APY

### 5. Withdraw Anytime

- **Partial Withdrawal**: Specify amount and withdraw
- **Withdraw All**: One-click emergency exit

All funds return to your wallet instantly - no lock-ups!

---

## 🔧 Development

### Project Structure

```
yield-sweep/
├── Backend/                    # Soroban smart contract
│   ├── src/
│   │   ├── lib.rs             # Main contract logic (1,292 lines)
│   │   └── test.rs            # Unit tests
│   ├── Cargo.toml
│   └── test_snapshots/        # Test output verification
│
├── Frontend/                   # Next.js application
│   ├── app/
│   │   ├── page.tsx           # Main app with routing
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles + animations
│   ├── components/
│   │   ├── views/
│   │   │   ├── LandingView.tsx      # Hero page
│   │   │   └── DashboardView.tsx    # Main dashboard
│   │   ├── modals/
│   │   │   ├── DepositModal.tsx
│   │   │   └── WithdrawModal.tsx
│   │   ├── dashboard/
│   │   │   └── GrowthChart.tsx      # Earnings chart
│   │   └── ui/                      # shadcn/ui components
│   ├── hooks/
│   │   └── useYieldVault.ts         # Core blockchain logic
│   └── lib/
│       └── utils.ts
│
└── prepare-demo.sh             # One-click demo setup
```

### Key Files Explained

#### `Backend/src/lib.rs`
The Soroban smart contract with these core functions:
- `initialize()`: Set up contract state
- `check_and_sweep()`: Main atomic sweep operation
- `set_safety_limit()`: Store user's safety threshold
- `deposit()`, `withdraw()`, `withdraw_all()`: Fund management

#### `Frontend/hooks/useYieldVault.ts`
React hook that:
- Connects to Stellar Horizon/Soroban RPC
- Manages wallet connection via Freighter
- Handles all contract interactions
- Provides error handling and loading states

#### `Frontend/components/views/DashboardView.tsx`
Main dashboard showing:
- Real-time balance fetching
- Metric cards with animations
- Action buttons (sweep, withdraw, etc.)
- Transaction notifications

### Running Tests

```bash
# Smart contract tests
cd Backend
cargo test

# Frontend (if you add e2e tests)
cd Frontend
pnpm test
```

### Building for Production

```bash
# Build smart contract
cd Backend
cargo build --release --target wasm32-unknown-unknown

# Build frontend
cd Frontend
pnpm build
pnpm start
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow Rust best practices for smart contract code
- Use TypeScript strictly (no `any` types)
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

---

## 🗺️ Roadmap

### ✅ Phase 1: MVP (Current)
- [x] Core smart contract with safety limits
- [x] Blend Protocol integration (5% APY)
- [x] Aquarius integration (9.5% APY)
- [x] Responsive web frontend
- [x] Testnet deployment
- [x] Comprehensive testing

### 🚧 Phase 2: Mainnet Launch (Q2 2026)
- [ ] Security audit by CertiK or similar
- [ ] Mainnet deployment
- [ ] Gas optimization improvements
- [ ] Multi-token support (USDC, USDT, etc.)
- [ ] Advanced analytics dashboard

### 🔮 Phase 3: Advanced Features (Q3 2026)
- [ ] AI-powered yield optimization
- [ ] Cross-chain bridges (Ethereum, Polygon)
- [ ] Mobile app (iOS + Android)
- [ ] Social features (referral program)
- [ ] DAO governance for protocol parameters

### 🌟 Phase 4: Ecosystem (Q4 2026)
- [ ] SDK for third-party integrations
- [ ] Yield aggregator marketplace
- [ ] Insurance fund for user protection
- [ ] Advanced portfolio management

---

## 🔒 Security

### Audit Status
- **Status**: Not yet audited (testnet only)
- **Planned**: CertiK audit before mainnet launch

### Best Practices
- ✅ Non-custodial design (users control keys)
- ✅ Emergency withdrawal mechanism
- ✅ Comprehensive error handling
- ✅ Event logging for transparency
- ✅ Tested on testnet extensively

### Security Considerations
⚠️ **This is experimental software on testnet**
- Do NOT use with real funds yet
- No warranty or guarantee of funds
- Smart contract risk exists
- Use at your own risk

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with amazing tools and protocols:

- [Stellar](https://stellar.org) - Fast, low-cost blockchain
- [Soroban](https://soroban.stellar.org) - Smart contract platform
- [Blend Protocol](https://blend.capital) - Lending protocol
- [Aquarius](https://aquarius.network) - Liquidity incentives
- [Freighter](https://freighter.app) - Stellar wallet
- [Next.js](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Framer Motion](https://framer.com/motion) - Animations

---

## 📬 Contact & Links

- **GitHub**: [github.com/YOUR_USERNAME/yield-sweep](https://github.com/YOUR_USERNAME/yield-sweep)
- **Website**: Coming soon
- **Twitter/X**: [@yourusername](https://twitter.com/yourusername)
- **Discord**: Join our community (link coming soon)
- **Email**: your.email@example.com

---

<div align="center">

**Built with ❤️ for the Stellar ecosystem**

⭐ Star this repo if you find it useful! ⭐

</div>
