'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Zap,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
} from 'lucide-react';
import { useYieldVault } from '../hooks/useYieldVault';
import LandingView from '@/components/views/LandingView';
import OverviewView from '@/components/views/OverviewView';
import SweepView from '@/components/views/SweepView';
import TransactView from '@/components/views/TransactView';
import AnalyticsView from '@/components/views/AnalyticsView';
import { TransactionNotification } from '@/components/TransactionNotification';

type View = 'LANDING' | 'OVERVIEW' | 'SWEEP' | 'TRANSACT' | 'ANALYTICS' | 'SETTINGS';

export default function YieldSweep() {
  // Initialize the Yield Vault hook for smart contract interactions
  const {
    userAddress,
    connectWallet,
    disconnectWallet,
    balance,            // Real XLM balance from wallet
    vaultBalance,       // Amount in yield vault
    safetyLimit,        // Safety limit from contract
    sweepableAmount,    // Amount that can be swept
    investedAmount,     // Amount invested in Blend
    totalVaultDeposits, // Total deposits across all users
    totalInvested,      // Total invested in Blend
    history,            // Real transaction history
    updateSafetyLimit,
    sweep,
    deposit,
    withdraw,
    isLoading,
    error: walletError,
    isContractInitialized,
    initializeVault,
    withdrawAll,
    simulateIncomingPayment,
    lastTransactionHash,
    transactionNotification,
    setTransactionNotification,
    // Real-time APY data
    blendAPY,
    aquaAPY,
    totalAPY,
    projectedMonthlyEarnings,
    apyLastUpdated,
    refreshAPYData,
  } = useYieldVault();

  const [view, setView] = useState<View>('LANDING');
  const [safetyBalance, setSafetyBalance] = useState(0);
  const [autoSweepEnabled, setAutoSweepEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autoSweepEnabled') === 'true';
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Settings state
  const [autoCompound, setAutoCompound] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autoCompound') === 'true';
    }
    return false;
  });
  const [privacyMode, setPrivacyMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('privacyMode') === 'true';
    }
    return false;
  });
  const [currency, setCurrency] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currency') || 'XLM';
    }
    return 'XLM';
  });
  const [transactionAlerts, setTransactionAlerts] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('transactionAlerts') !== 'false';
    }
    return true;
  });
  const [sweepAlerts, setSweepAlerts] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sweepAlerts') === 'true';
    }
    return false;
  });
  const [yieldUpdates, setYieldUpdates] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('yieldUpdates') === 'true';
    }
    return false;
  });
  const [slippage, setSlippage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('slippage') || '0.1';
    }
    return '0.1';
  });
  const [transactionSpeed, setTransactionSpeed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('transactionSpeed') || 'Fast';
    }
    return 'Fast';
  });

  // Derive wallet connection state from the hook
  const walletConnected = !!userAddress;

  // Sync safety balance with contract data
  useEffect(() => {
    setSafetyBalance(safetyLimit);
  }, [safetyLimit]);

  // Persist settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoSweepEnabled', autoSweepEnabled.toString());
      localStorage.setItem('autoCompound', autoCompound.toString());
      localStorage.setItem('privacyMode', privacyMode.toString());
      localStorage.setItem('currency', currency);
      localStorage.setItem('transactionAlerts', transactionAlerts.toString());
      localStorage.setItem('sweepAlerts', sweepAlerts.toString());
      localStorage.setItem('yieldUpdates', yieldUpdates.toString());
      localStorage.setItem('slippage', slippage);
      localStorage.setItem('transactionSpeed', transactionSpeed);
    }
  }, [autoSweepEnabled, autoCompound, privacyMode, currency, transactionAlerts, sweepAlerts, yieldUpdates, slippage, transactionSpeed]);

  // Helper to format balance based on privacy mode
  const formatBalance = (amount: number) => {
    if (privacyMode) return '••••';
    return amount.toFixed(2);
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      // View transition handled by effect below
    } catch (e) {
      showNotification('Failed to connect wallet');
    }
  };

  // Effect to switch to overview when wallet connects
  useEffect(() => {
    if (userAddress && view === 'LANDING') {
      setView('OVERVIEW');
      showNotification('Wallet connected successfully');
    }
  }, [userAddress, view]);

  const handleDisconnect = () => {
    disconnectWallet();
    setView('LANDING');
    showNotification('Wallet disconnected');
  };

  const handleUpdateSafetyLimit = async (newLimit: number) => {
    // Optimistic update handled by local state
    try {
      await updateSafetyLimit(newLimit);
      showNotification(`Safety limit updated to $${newLimit}`);
    } catch (e) {
      showNotification('Failed to update safety limit');
      // Revert handled by effect syncing with safetyLimit
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

  return (
    <div className="fintech-bg min-h-screen w-full overflow-hidden font-sans">
      {/* Header/Navigation */}
      <motion.nav 
        className="glass fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={() => !walletConnected && setView('LANDING')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <motion.div 
              className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-purple-500/30"
              whileHover={{ boxShadow: "0 8px 30px rgba(147, 51, 234, 0.5)" }}
              transition={{ duration: 0.3 }}
            >
              YS
            </motion.div>
            <span className="text-lg font-bold gradient-text hidden sm:inline tracking-tight">Yield-Sweep</span>
          </motion.div>

          {/* Desktop Nav Links */}
          {walletConnected && (
            <motion.div 
              className="hidden md:flex items-center gap-6"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <motion.button
                onClick={() => setView('OVERVIEW')}
                className={`text-sm font-medium transition flex items-center gap-2 ${view === 'OVERVIEW' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <LayoutDashboard className="w-4 h-4" />
                Overview
              </motion.button>
              <motion.button
                onClick={() => setView('SWEEP')}
                className={`text-sm font-medium transition flex items-center gap-2 ${view === 'SWEEP' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Zap className="w-4 h-4" />
                Sweep
              </motion.button>
              <motion.button
                onClick={() => setView('TRANSACT')}
                className={`text-sm font-medium transition flex items-center gap-2 ${view === 'TRANSACT' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <ArrowDownCircle className="w-4 h-4" />
                Transact
              </motion.button>
              <motion.button
                onClick={() => setView('ANALYTICS')}
                className={`text-sm font-medium transition flex items-center gap-2 ${view === 'ANALYTICS' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </motion.button>
              <motion.button
                onClick={() => setView('SETTINGS')}
                className={`text-sm font-medium transition ${view === 'SETTINGS' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                Settings
              </motion.button>
            </motion.div>
          )}

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-4">
            {!walletConnected ? (
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 10px 30px rgba(147, 51, 234, 0.4)",
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConnectWallet}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
              >
                Connect Wallet
              </motion.button>
            ) : (
              <>
                <motion.div 
                  className="glass px-4 py-2 rounded-xl text-xs font-mono text-blue-400 border border-blue-500/30 shadow-lg tracking-wider"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 8px 30px rgba(59, 130, 246, 0.3)",
                    transition: { duration: 0.2 }
                  }}
                >
                  {truncatedAddress}
                </motion.div>
                <motion.button
                  whileHover={{ 
                    scale: 1.05, 
                    rotate: 5,
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDisconnect}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
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
              className="md:hidden glass-alt border-t border-white/10"
            >
              <div className="px-4 py-4 space-y-3">
                {walletConnected && (
                  <>
                    <button
                      onClick={() => {
                        setView('OVERVIEW');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left text-slate-300 hover:text-white transition-all py-2 font-semibold"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Overview
                    </button>
                    <button
                      onClick={() => {
                        setView('SWEEP');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left text-slate-300 hover:text-white transition-all py-2 font-semibold"
                    >
                      <Zap className="w-4 h-4" />
                      Sweep
                    </button>
                    <button
                      onClick={() => {
                        setView('TRANSACT');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left text-slate-300 hover:text-white transition-all py-2 font-semibold"
                    >
                      <ArrowDownCircle className="w-4 h-4" />
                      Transact
                    </button>
                    <button
                      onClick={() => {
                        setView('ANALYTICS');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left text-slate-300 hover:text-white transition-all py-2 font-semibold"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Analytics
                    </button>
                    <button
                      onClick={() => {
                        setView('SETTINGS');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left text-slate-300 hover:text-white transition-all py-2 font-semibold"
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
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0 10px 30px rgba(147, 51, 234, 0.4)",
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConnectWallet}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg transition-all duration-300"
                  >
                    Connect Wallet
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Main Content */}
      <div className="pt-24 relative z-10">
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
          
          {/* Main Content */}
          {walletConnected && (
            <div className="w-full">
                {view === 'OVERVIEW' && (
                  <OverviewView
                    key="overview"
                    walletBalance={balance}
                    vaultBalance={vaultBalance}
                    investedAmount={investedAmount}
                    projectedMonthlyEarnings={projectedMonthlyEarnings}
                    blendAPY={blendAPY}
                    aquaAPY={aquaAPY}
                    totalAPY={totalAPY}
                    apyLastUpdated={apyLastUpdated}
                    onRefreshAPY={refreshAPYData}
                    formatBalance={formatBalance}
                  />
                )}
                {view === 'SWEEP' && (
                  <SweepView
                    key="sweep"
                    walletBalance={balance}
                    safetyBalance={safetyBalance}
                    setSafetyBalance={setSafetyBalance}
                    sweepableAmount={sweepableAmount}
                    vaultBalance={vaultBalance}
                    onSweep={handleSweep}
                    onUpdateSafetyLimit={handleUpdateSafetyLimit}
                    isLoading={isLoading}
                    formatBalance={formatBalance}
                  />
                )}
                {view === 'TRANSACT' && (
                  <TransactView
                    key="transact"
                    walletBalance={balance}
                    vaultBalance={vaultBalance}
                    onDeposit={deposit}
                    onWithdraw={withdraw}
                    onWithdrawAll={withdrawAll}
                    isLoading={isLoading}
                    formatBalance={formatBalance}
                  />
                )}
                {view === 'ANALYTICS' && (
                  <AnalyticsView
                    key="analytics"
                    vaultBalance={vaultBalance}
                    investedAmount={investedAmount}
                    projectedMonthlyEarnings={projectedMonthlyEarnings}
                    blendAPY={blendAPY}
                    aquaAPY={aquaAPY}
                    totalAPY={totalAPY}
                    formatBalance={formatBalance}
                  />
                )}
                {view === 'SETTINGS' && (
            <div className="max-w-7xl mx-auto px-4 py-12">
              <h2 className="text-2xl font-bold gradient-text mb-6">Settings</h2>
              
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Automation Settings */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass p-6 rounded-xl"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Automation</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Auto-Sweep</span>
                        <p className="text-xs text-slate-400 mt-1">Automatically sweep excess funds when detected</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAutoSweepEnabled(!autoSweepEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${autoSweepEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${autoSweepEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </motion.button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Auto-Compound</span>
                        <p className="text-xs text-slate-400 mt-1">Automatically reinvest earned yields</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAutoCompound(!autoCompound)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${autoCompound ? 'bg-blue-500' : 'bg-slate-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${autoCompound ? 'translate-x-6' : 'translate-x-1'}`} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>

                {/* Display Preferences */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass p-6 rounded-xl"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Display</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Privacy Mode</span>
                        <p className="text-xs text-slate-400 mt-1">Hide balance amounts from display</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPrivacyMode(!privacyMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${privacyMode ? 'bg-blue-500' : 'bg-slate-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${privacyMode ? 'translate-x-6' : 'translate-x-1'}`} />
                      </motion.button>
                    </div>
                    
                    <div>
                      <label className="text-white font-medium">Currency Display</label>
                      <p className="text-xs text-slate-400 mt-1 mb-2">Choose your preferred currency</p>
                      <select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="XLM">XLM (Stellar Lumens)</option>
                        <option value="USD">USD (US Dollar)</option>
                        <option value="EUR">EUR (Euro)</option>
                      </select>
                    </div>
                  </div>
                </motion.div>

                {/* Notifications */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass p-6 rounded-xl"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Transaction Alerts</span>
                        <p className="text-xs text-slate-400 mt-1">Notify me when transactions complete</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTransactionAlerts(!transactionAlerts)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${transactionAlerts ? 'bg-blue-500' : 'bg-slate-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${transactionAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                      </motion.button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Sweep Opportunities</span>
                        <p className="text-xs text-slate-400 mt-1">Alert when sweepable amount exceeds threshold</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSweepAlerts(!sweepAlerts)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${sweepAlerts ? 'bg-blue-500' : 'bg-slate-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${sweepAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                      </motion.button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Yield Updates</span>
                        <p className="text-xs text-slate-400 mt-1">Weekly earnings summary reports</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setYieldUpdates(!yieldUpdates)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${yieldUpdates ? 'bg-blue-500' : 'bg-slate-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${yieldUpdates ? 'translate-x-6' : 'translate-x-1'}`} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>

                {/* Advanced Settings */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass p-6 rounded-xl"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Advanced</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-white font-medium">Slippage Tolerance</label>
                      <p className="text-xs text-slate-400 mt-1 mb-2">Maximum price slippage for swaps</p>
                      <select 
                        value={slippage}
                        onChange={(e) => setSlippage(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="0.1">0.1% (Recommended)</option>
                        <option value="0.5">0.5%</option>
                        <option value="1.0">1.0%</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-white font-medium">Transaction Speed</label>
                      <p className="text-xs text-slate-400 mt-1 mb-2">Gas price preference</p>
                      <select 
                        value={transactionSpeed}
                        onChange={(e) => setTransactionSpeed(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Standard">Standard (Lower fees)</option>
                        <option value="Fast">Fast (Recommended)</option>
                        <option value="Instant">Instant (Higher fees)</option>
                      </select>
                    </div>
                  </div>
                </motion.div>

                {/* Account Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="glass p-6 rounded-xl"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Connected Wallet</span>
                      <span className="text-white font-mono text-sm">{truncatedAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Network</span>
                      <span className="text-white">Stellar Testnet</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contract Version</span>
                      <span className="text-white">v1.0.0</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
                )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Transaction Notification with Explorer Link */}
      <TransactionNotification 
        notification={transactionNotification}
        onClose={() => setTransactionNotification(null)}
      />

      {/* Toast Notification (fallback for non-transaction messages) */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 glass px-6 py-4 rounded-lg border-l-4 border-cyan-400 z-50 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          >
            <p className="text-cyan-400 font-bold text-sm tracking-wide">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
