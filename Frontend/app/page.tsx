'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  ArrowDown,
  Menu,
  X,
  LogOut,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useYieldVault, TransactionHistoryItem } from '../hooks/useYieldVault';
import { AlertTriangle } from 'lucide-react';

type View = 'LANDING' | 'DASHBOARD' | 'HISTORY' | 'SETTINGS';

export default function YieldSweep() {
  // Initialize the Yield Vault hook for smart contract interactions
  const {
    hasFreighter,
    userAddress,
    connectWallet,
    disconnectWallet,
    balance,            // Real XLM balance from wallet
    usdcBalance,        // Real USDC balance from wallet
    vaultBalance,       // Amount in yield vault
    safetyLimit,        // Safety limit from contract
    sweepableAmount,    // Amount that can be swept
    history,            // Real transaction history
    updateSafetyLimit,
    sweep,
    refreshData,
    isLoading,
    error: walletError,
    isContractInitialized,
    initializeVault,
  } = useYieldVault();

  const [view, setView] = useState<View>('LANDING');
  const [safetyBalance, setSafetyBalance] = useState(0);
  const [autoSweepEnabled, setAutoSweepEnabled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Derive wallet connection state from the hook
  const walletConnected = !!userAddress;

  // Sync safety balance with contract data
  useEffect(() => {
    setSafetyBalance(safetyLimit);
  }, [safetyLimit]);

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      if (userAddress) {
        setView('DASHBOARD');
        setMobileMenuOpen(false);
        showNotification('Wallet connected successfully');
      }
    } catch (e) {
      showNotification('Failed to connect wallet');
    }
  };

  // Effect to switch to dashboard when wallet connects
  useEffect(() => {
    if (userAddress && view === 'LANDING') {
      setView('DASHBOARD');
      showNotification('Wallet connected successfully');
    }
  }, [userAddress]);

  const handleDisconnect = () => {
    disconnectWallet();
    setView('LANDING');
    showNotification('Wallet disconnected');
  };

  const handleUpdateSafetyLimit = async (newLimit: number) => {
    setSafetyBalance(newLimit); // Optimistic update
    try {
      await updateSafetyLimit(newLimit);
      showNotification(`Safety limit updated to $${newLimit}`);
    } catch (e) {
      showNotification('Failed to update safety limit');
      setSafetyBalance(safetyLimit); // Revert on failure
    }
  };

  const handleSweep = async () => {
    if (sweepableAmount <= 0) {
      showNotification('No funds to sweep. Balance is at or below safety limit.');
      return;
    }
    try {
      await sweep();
      showNotification(`Swept ${sweepableAmount.toFixed(2)} XLM to Yield Vault!`);
    } catch (e) {
      showNotification('Sweep failed. Please try again.');
    }
  };

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const truncatedAddress = userAddress ? truncateAddress(userAddress) : '';

  // Show wallet errors as notifications
  useEffect(() => {
    if (walletError) {
      showNotification(walletError);
    }
  }, [walletError]);

  // All data comes from real blockchain - no mock data
  // balance = XLM in wallet (from Horizon)
  // vaultBalance = Amount in yield vault (from contract)
  // safetyLimit = Safety threshold (from contract)
  // sweepableAmount = balance - safetyLimit (calculated)

  return (
    <div className="fintech-bg min-h-screen w-full overflow-hidden">
      {/* Header/Navigation */}
      <nav className="glass fixed top-0 left-0 right-0 z-40 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => !walletConnected && setView('LANDING')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">
              YS
            </div>
            <span className="text-lg font-bold text-white hidden sm:inline">Yield-Sweep</span>
          </motion.div>

          {/* Desktop Nav Links */}
          {walletConnected && (
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => setView('DASHBOARD')}
                className={`text-sm transition ${view === 'DASHBOARD' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setView('HISTORY')}
                className={`text-sm transition ${view === 'HISTORY' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                History
              </button>
              <button
                onClick={() => setView('SETTINGS')}
                className={`text-sm transition ${view === 'SETTINGS' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                Settings
              </button>
            </div>
          )}

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-4">
            {!walletConnected ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConnectWallet}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition"
              >
                Connect Wallet
              </motion.button>
            ) : (
              <>
                <div className="glass px-4 py-2 rounded-lg text-sm font-mono text-cyan-400">
                  {truncatedAddress}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDisconnect}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <LogOut className="w-5 h-5" />
                </motion.button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden glass-alt border-t border-white/5"
            >
              <div className="px-4 py-4 space-y-3">
                {walletConnected && (
                  <>
                    <button
                      onClick={() => {
                        setView('DASHBOARD');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left text-slate-300 hover:text-white transition py-2"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setView('HISTORY');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left text-slate-300 hover:text-white transition py-2"
                    >
                      History
                    </button>
                    <button
                      onClick={() => {
                        setView('SETTINGS');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left text-slate-300 hover:text-white transition py-2"
                    >
                      Settings
                    </button>
                    <div className="border-t border-white/10 pt-3 mt-3">
                      <button
                        onClick={handleDisconnect}
                        className="w-full px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  </>
                )}
                {!walletConnected && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConnectWallet}
                    className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg"
                  >
                    Connect Wallet
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <div className="pt-20 relative z-10">
        <AnimatePresence mode="wait">
          {!walletConnected && view === 'LANDING' && (
            <LandingView
              key="landing"
              onConnect={handleConnectWallet}
              walletBalance={balance}
              safetyBalance={safetyBalance}
              vaultBalance={vaultBalance}
              sweepableAmount={sweepableAmount}
            />
          )}
          {walletConnected && view === 'DASHBOARD' && (
            <DashboardView
              key="dashboard"
              walletBalance={balance}
              safetyBalance={safetyBalance}
              setSafetyBalance={setSafetyBalance}
              vaultBalance={vaultBalance}
              sweepableAmount={sweepableAmount}
              truncatedAddress={truncatedAddress}
              autoSweepEnabled={autoSweepEnabled}
              setAutoSweepEnabled={setAutoSweepEnabled}
              showNotification={showNotification}
              onUpdateSafetyLimit={handleUpdateSafetyLimit}
              onSweep={handleSweep}
              isLoading={isLoading}
              isContractInitialized={isContractInitialized}
              onInitialize={initializeVault}
            />
          )}
          {walletConnected && view === 'HISTORY' && (
            <HistoryView key="history" history={history} />
          )}
          {walletConnected && view === 'SETTINGS' && (
            <SettingsView
              key="settings"
              autoSweepEnabled={autoSweepEnabled}
              setAutoSweepEnabled={setAutoSweepEnabled}
              showNotification={showNotification}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 glass px-6 py-4 rounded-lg border-l-2 border-cyan-400 z-50"
          >
            <p className="text-cyan-400 font-medium text-sm">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Landing View Component
function LandingView({
  onConnect,
  walletBalance,
  safetyBalance,
  vaultBalance,
  sweepableAmount,
}: {
  onConnect: () => void;
  walletBalance: number;
  safetyBalance: number;
  vaultBalance: number;
  sweepableAmount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-20"
    >
      <div className="max-w-6xl w-full space-y-20">
        {/* Hero Section */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight text-balance">
                Turn Your Wallet Into a Smart Savings Account
              </h1>
              <p className="text-lg text-slate-300 text-balance leading-relaxed">
                Yield-Sweep automatically earns yield on idle USDC on Stellar — no staking, no manual DeFi steps.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onConnect}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition"
              >
                Connect Wallet
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 glass text-white font-semibold rounded-lg hover:bg-white/10 transition"
              >
                View Demo
              </motion.button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8">
              {[
                { label: 'Users', value: '10,000+' },
                { label: 'Safe', value: '96%' },
                { label: 'Uptime', value: '24/7' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-2xl font-bold text-cyan-400">{stat.value}</p>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass p-6 rounded-2xl border border-white/10"
          >
            <div className="space-y-6">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">Wallet Balance</p>
                <motion.p
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-4xl font-bold text-white"
                >
                  {walletBalance.toFixed(2)} XLM
                </motion.p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-alt p-4 rounded-lg">
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Safety Limit</p>
                  <p className="text-xl font-bold text-white">{safetyBalance.toFixed(2)} XLM</p>
                </div>
                <div className="glass-alt p-4 rounded-lg">
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">In Vault</p>
                  <p className="text-xl font-bold text-cyan-400">{vaultBalance.toFixed(2)} XLM</p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">Sweepable Amount</p>
                <motion.div
                  key={Math.floor(sweepableAmount)}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="text-2xl font-bold text-cyan-400"
                >
                  {sweepableAmount > 0 ? `${sweepableAmount.toFixed(2)} XLM` : 'No excess funds'}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* How It Works Section */}
        <div className="space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-white">How It Works</h2>
            <p className="text-slate-400">Three simple steps to start earning yield automatically</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: 1,
                title: 'Set Safety Balance',
                description: 'Choose how much USDC stays liquid for spending.',
              },
              {
                num: 2,
                title: 'Auto-Sweep Excess',
                description: 'Extra funds are automatically deposited into Blend to earn yield.',
              },
              {
                num: 3,
                title: 'Earn Yield Instantly',
                description: 'Interest accrues every second and compounds automatically.',
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass p-8 rounded-xl border border-white/10 hover:border-cyan-400/50 transition group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/30 transition">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-white">What is Yield-Sweep?</h2>
            <p className="text-slate-400">Enterprise-grade DeFi automation</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '🔒',
                title: 'Non-Custodial Smart Contracts',
                description: 'Your funds stay in your control at all times.',
              },
              {
                icon: '⚡',
                title: 'Instant Withdraw Anytime',
                description: 'Access your funds instantly whenever needed.',
              },
              {
                icon: '🚀',
                title: 'Fully Automated Yield Optimization',
                description: 'Maximize returns with zero manual intervention.',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass p-6 rounded-xl border border-white/10 hover:border-cyan-400/50 transition text-center"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center space-y-6 py-12">
          <h2 className="text-4xl font-bold text-white">Start Earning in One Click</h2>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConnect}
            className="inline-block px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition text-lg"
          >
            Connect Wallet
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// Dashboard View Component
function DashboardView({
  walletBalance,
  safetyBalance,
  setSafetyBalance,
  vaultBalance,
  sweepableAmount,
  truncatedAddress,
  autoSweepEnabled,
  setAutoSweepEnabled,
  showNotification,
  onUpdateSafetyLimit,
  onSweep,
  isLoading,
  isContractInitialized,
  onInitialize,
}: {
  walletBalance: number;
  safetyBalance: number;
  setSafetyBalance: (value: number) => void;
  vaultBalance: number;
  sweepableAmount: number;
  truncatedAddress: string;
  autoSweepEnabled: boolean;
  setAutoSweepEnabled: (value: boolean) => void;
  showNotification: (msg: string) => void;
  onUpdateSafetyLimit: (limit: number) => Promise<void>;
  onSweep: () => Promise<void>;
  isLoading: boolean;
  isContractInitialized: boolean;
  onInitialize: () => Promise<void>;
}) {

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 sm:px-6 lg:px-8 pb-20"
    >
      <div className="max-w-7xl mx-auto space-y-8">

        {!isContractInitialized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-cyan-500/10 border border-cyan-500/50 p-6 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 text-cyan-400" />
              <div>
                <h3 className="text-cyan-400 font-bold text-lg">Contract Not Initialized</h3>
                <p className="text-cyan-200/70">The yield sweep vault needs to be initialized before use.</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onInitialize}
              disabled={isLoading}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition"
            >
              {isLoading ? 'Initializing...' : 'Initialize Now'}
            </motion.button>
          </motion.div>
        )}

        {/* Section 1: Wallet Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              label: 'Wallet Balance',
              value: walletBalance,
              suffix: ' XLM',
              color: 'text-white',
            },
            {
              label: 'In Yield Vault',
              value: vaultBalance,
              suffix: ' XLM',
              color: 'text-cyan-400',
            },
            {
              label: 'Sweepable',
              value: sweepableAmount,
              suffix: ' XLM',
              subtext: sweepableAmount > 0 ? 'Ready to sweep' : 'No excess funds',
              color: 'text-cyan-400',
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              whileHover={{ y: -5 }}
              className="glass p-8 rounded-xl border border-white/10 hover:border-cyan-400/50 transition"
            >
              <p className="text-slate-400 text-sm uppercase tracking-wide mb-3">{card.label}</p>
              <motion.p
                key={Math.floor(card.value)}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className={`text-4xl font-bold ${card.color} mb-2`}
              >
                {card.value.toFixed(2)}{card.suffix}
              </motion.p>
              {card.subtext && (
                <p className="text-slate-400 text-sm">{card.subtext}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Section 2: Safety Balance Control */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -2 }}
          className="glass p-8 rounded-xl border border-white/10"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Safety Balance</h2>
          <div className="space-y-6">
            <div>
              <label className="text-sm uppercase tracking-wide text-slate-300 block mb-4">
                Keep liquid: ${safetyBalance.toFixed(2)} USDC
              </label>
              <input
                type="range"
                min="0"
                max="250"
                value={safetyBalance}
                onChange={(e) => setSafetyBalance(Number(e.target.value))}
                className="w-full h-2 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 bg-slate-800/20 p-4 rounded-lg">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">Will be swept</p>
                <p className="text-2xl font-bold text-cyan-400">{sweepableAmount.toFixed(2)} XLM</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">Current in vault</p>
                <p className="text-2xl font-bold text-cyan-400">{vaultBalance.toFixed(2)} XLM</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onUpdateSafetyLimit(safetyBalance)}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Safety Balance'}
            </motion.button>
          </div>
        </motion.div>

        {/* Section 3: Earnings Overview */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -2 }}
          className="glass p-8 rounded-xl border border-white/10"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Earnings Overview</h2>
          <div className="space-y-8">
            {/* Chart Placeholder */}
            <div className="bg-slate-800/20 rounded-lg p-6 h-64 flex items-center justify-center border border-white/5">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-cyan-400/50 mx-auto mb-3" />
                <p className="text-slate-400">Chart visualization</p>
              </div>
            </div>

            <div className="grid md:grid-cols-1 gap-6">
              <div className="bg-slate-800/20 p-6 rounded-lg border border-white/5">
                <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">Yield Strategy</p>
                <p className="text-xl font-bold text-cyan-400">Stellar Testnet Yield Vault</p>
                <p className="text-slate-500 text-sm mt-1">Funds are swept to the Soroban contract</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-800/20 p-6 rounded-lg border border-white/5">
              <div>
                <p className="text-slate-300 font-medium">Auto-Sweep</p>
                <p className="text-slate-400 text-sm">Automatically sweep excess funds to yield</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  if (!autoSweepEnabled) {
                    // When enabling auto-sweep, trigger a sweep
                    await onSweep();
                  }
                  setAutoSweepEnabled(!autoSweepEnabled);
                  showNotification(`Auto-Sweep ${!autoSweepEnabled ? 'enabled' : 'disabled'}`);
                }}
                disabled={isLoading}
                className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all ${autoSweepEnabled
                  ? 'bg-cyan-500/30 border border-cyan-400'
                  : 'bg-slate-700 border border-slate-600'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <motion.span
                  layout
                  className={`inline-block h-8 w-8 transform rounded-full transition-all ${autoSweepEnabled
                    ? 'translate-x-10 bg-cyan-400'
                    : 'translate-x-1 bg-slate-400'
                    }`}
                />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Section 4: Transaction History */}

        {/* Section 5: Quick Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            { label: 'Withdraw All', icon: ArrowDown },
            { label: 'Rebalance Portfolio', icon: TrendingUp },
            { label: 'View on Explorer', icon: ExternalLink },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={i}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => showNotification(`${action.label} initiated`)}
                className="glass p-6 rounded-xl border border-white/10 hover:border-cyan-400/50 transition flex flex-col items-center justify-center gap-3 group"
              >
                <Icon className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition" />
                <span className="text-white font-semibold">{action.label}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}

// History View Component
function HistoryView({ history }: { history: TransactionHistoryItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 sm:px-6 lg:px-8 pb-20"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
          <p className="text-slate-400">View all your transactions and activities</p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass p-8 rounded-xl border border-white/10"
        >
          <div className="overflow-x-auto">
            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <p>No recent transactions found on chain.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-slate-400 text-sm uppercase tracking-wide font-semibold">Type</th>
                    <th className="text-left py-3 px-4 text-slate-400 text-sm uppercase tracking-wide font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-slate-400 text-sm uppercase tracking-wide font-semibold">Hash</th>
                    <th className="text-left py-3 px-4 text-slate-400 text-sm uppercase tracking-wide font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="py-4 px-4 text-white font-medium">{tx.type}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-2 text-sm ${tx.status === 'Success' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.status === 'Success' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-sm font-mono">{tx.hash}</td>
                      <td className="py-4 px-4 text-slate-400 text-sm">{tx.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}


// Settings View Component
// Settings View Component
function SettingsView({
  autoSweepEnabled,
  setAutoSweepEnabled,
  showNotification,
}: {
  autoSweepEnabled: boolean;
  setAutoSweepEnabled: (value: boolean) => void;
  showNotification: (msg: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 sm:px-6 lg:px-8 pb-20"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Manage your preferences and account settings</p>
        </div>

        {/* Compounding Setting */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass p-8 rounded-xl border border-white/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Compounding</h2>
              <p className="text-slate-400">Automatically reinvest earnings into your vault</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setAutoSweepEnabled(!autoSweepEnabled);
                showNotification(`Auto-Sweep ${!autoSweepEnabled ? 'enabled' : 'disabled'}`);
              }}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all ${autoSweepEnabled
                ? 'bg-cyan-500/30 border border-cyan-400'
                : 'bg-slate-700 border border-slate-600'
                }`}
            >
              <motion.span
                layout
                className={`inline-block h-8 w-8 transform rounded-full transition-all ${autoSweepEnabled
                  ? 'translate-x-10 bg-cyan-400'
                  : 'translate-x-1 bg-slate-400'
                  }`}
              />
            </motion.button>
          </div>
        </motion.div>

        {/* Notifications Setting */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass p-8 rounded-xl border border-white/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Email Notifications</h2>
              <p className="text-slate-400">Get notified about sweeps and yield updates</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => showNotification('Notification preference updated')}
              className="relative inline-flex h-10 w-20 items-center rounded-full transition-all bg-cyan-500/30 border border-cyan-400"
            >
              <motion.span
                layout
                className="inline-block h-8 w-8 transform rounded-full transition-all translate-x-10 bg-cyan-400"
              />
            </motion.button>
          </div>
        </motion.div>

        {/* API Key Setting */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass p-8 rounded-xl border border-white/10"
        >
          <h2 className="text-lg font-semibold text-white mb-4">API Key</h2>
          <div className="space-y-4">
            <div className="bg-slate-800/20 p-3 rounded-lg border border-white/5 font-mono text-sm text-slate-400 break-all">
              sk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => showNotification('API key copied to clipboard')}
                className="px-4 py-2 glass text-white font-medium rounded-lg hover:bg-white/10 transition"
              >
                Copy Key
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => showNotification('API key regenerated')}
                className="px-4 py-2 glass text-white font-medium rounded-lg hover:bg-white/10 transition"
              >
                Regenerate
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
