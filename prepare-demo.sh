#!/bin/bash

# Yield-Sweep Demo Preparation Script
# Run this before pitching to judges

echo "🚀 Yield-Sweep Demo Preparation"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "Frontend" ] || [ ! -d "Backend" ]; then
    echo -e "${RED}❌ Error: Run this script from the project root directory${NC}"
    exit 1
fi

echo "📋 Pre-Demo Checklist"
echo "====================="
echo ""

# 1. Check Node.js
echo -n "1. Checking Node.js installation... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found"
    echo "   Install from: https://nodejs.org/"
fi

# 2. Check pnpm
echo -n "2. Checking pnpm installation... "
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm -v)
    echo -e "${GREEN}✓${NC} pnpm $PNPM_VERSION"
else
    echo -e "${RED}✗${NC} pnpm not found"
    echo "   Install: npm install -g pnpm"
fi

# 3. Check Rust
echo -n "3. Checking Rust installation... "
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version | cut -d' ' -f2)
    echo -e "${GREEN}✓${NC} Rust $RUST_VERSION"
else
    echo -e "${RED}✗${NC} Rust not found"
    echo "   Install from: https://rustup.rs/"
fi

# 4. Check Soroban CLI
echo -n "4. Checking Soroban CLI... "
if command -v soroban &> /dev/null; then
    SOROBAN_VERSION=$(soroban version | cut -d' ' -f2)
    echo -e "${GREEN}✓${NC} Soroban CLI $SOROBAN_VERSION"
else
    echo -e "${RED}✗${NC} Soroban CLI not found"
    echo "   Install: cargo install --locked soroban-cli"
fi

echo ""
echo "📦 Installing Dependencies"
echo "========================="
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd Frontend
if pnpm install --silent; then
    echo -e "${GREEN}✓${NC} Frontend dependencies installed"
else
    echo -e "${RED}✗${NC} Failed to install frontend dependencies"
fi
cd ..

echo ""
echo "🔧 Environment Configuration"
echo "==========================="
echo ""

# Check for .env file
if [ -f "Frontend/.env.local" ]; then
    echo -e "${GREEN}✓${NC} Frontend .env.local exists"
else
    echo -e "${YELLOW}⚠${NC}  No .env.local found (optional)"
fi

echo ""
echo "🌐 Important URLs"
echo "================="
echo ""
echo "Local App:          http://localhost:3000"
echo "Contract Explorer:  https://stellar.expert/explorer/testnet/contract/CBSGX2SJQRPOMTDLA3W54V7XV3ALA7FN3G7VOTST55VLILVWUWJKD5XV"
echo "Stellar Lab:        https://laboratory.stellar.org/#account-creator?network=test"
echo "Stellar Expert:     https://stellar.expert/explorer/testnet"
echo ""

echo "💰 Wallet Preparation"
echo "===================="
echo ""
echo "1. Install Freighter wallet: https://www.freighter.app/"
echo "2. Create or import testnet account"
echo "3. Fund account with testnet XLM:"
echo "   https://laboratory.stellar.org/#account-creator?network=test"
echo ""

echo "📱 Browser Setup"
echo "==============="
echo ""
echo "Open these tabs before demo:"
echo "  1. App: http://localhost:3000"
echo "  2. Contract: https://stellar.expert/explorer/testnet/contract/CBSGX2SJQRPOMTDLA3W54V7XV3ALA7FN3G7VOTST55VLILVWUWJKD5XV"
echo "  3. Your wallet on Explorer (after connecting)"
echo ""

echo "🎬 Starting Demo Server"
echo "======================"
echo ""

read -p "Start the development server now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting Next.js development server..."
    echo "Press Ctrl+C to stop"
    echo ""
    cd Frontend
    pnpm dev
else
    echo ""
    echo "To start manually:"
    echo "  cd Frontend && pnpm dev"
    echo ""
fi

echo ""
echo "✨ Demo Preparation Complete!"
echo ""
echo "Quick Checklist:"
echo "  [ ] Freighter wallet installed and funded"
echo "  [ ] Browser tabs open (app + explorers)"
echo "  [ ] Screen sharing ready"
echo "  [ ] Read DEMO_GUIDE.md"
echo ""
echo "Good luck with your pitch! 🚀"
