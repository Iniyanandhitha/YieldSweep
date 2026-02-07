'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useYieldVault } from '../hooks/useYieldVault';
import LandingView from '@/components/views/LandingView';
import DashboardView from '@/components/views/DashboardView';
import { TransactionNotification } from '@/components/TransactionNotification';
import { DemoHelper } from '@/components/DemoHelper';

type View = 'LANDING' | 'DASHBOARD' | 'HISTORY' | 'SETTINGS';

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
  } = useYieldVault();

  const [view, setView] = useState<View>('LANDING');
  const [safetyBalance, setSafetyBalance] = useState(0);
  const [autoSweepEnabled, setAutoSweepEnabled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [demoHelperVisible, setDemoHelperVisible] = useState(true); // Show demo helper for judges

  // Derive wallet connection state from the hook
  const walletConnected = !!userAddress;

  // Sync safety balance with contract data
  useEffect(() => {
    setSafetyBalance(safetyLimit);
  }, [safetyLimit]);

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      // View transition handled by effect below
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
      <nav className="glass fixed top-0 left-0 right-0 z-40 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => !walletConnected && setView('LANDING')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-bold text-slate-950 text-sm shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              YS
            </div>
            <span className="text-lg font-bold text-white hidden sm:inline tracking-tight">Yield-Sweep</span>
          </motion.div>

          {/* Desktop Nav Links */}
          {walletConnected && (
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => setView('DASHBOARD')}
                className={`text-sm font-medium transition ${view === 'DASHBOARD' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setView('HISTORY')}
                className={`text-sm font-medium transition ${view === 'HISTORY' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                History
              </button>
              <button
                onClick={() => setView('SETTINGS')}
                className={`text-sm font-medium transition ${view === 'SETTINGS' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}
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
                className="px-6 py-2 bg-cyan-500 text-slate-950 font-bold rounded-lg hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition"
              >
                Connect Wallet
              </motion.button>
            ) : (
              <>
                <div className="glass px-4 py-2 rounded-lg text-sm font-mono text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
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
                    className="w-full px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-lg"
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
          {walletConnected && view === 'DASHBOARD' && (
            <DashboardView
              key="dashboard"
              walletBalance={balance}
              safetyBalance={safetyBalance}
              setSafetyBalance={setSafetyBalance}
              vaultBalance={vaultBalance}
              sweepableAmount={sweepableAmount}
              investedAmount={investedAmount}
              totalVaultDeposits={totalVaultDeposits}
              totalInvested={totalInvested}
              truncatedAddress={truncatedAddress}
              autoSweepEnabled={autoSweepEnabled}
              setAutoSweepEnabled={setAutoSweepEnabled}
              showNotification={showNotification}
              onUpdateSafetyLimit={handleUpdateSafetyLimit}
              onSweep={handleSweep}
              onDeposit={deposit}
              onWithdraw={withdraw}
              isLoading={isLoading}
              isContractInitialized={isContractInitialized}
              onInitialize={initializeVault}
              onWithdrawAll={withdrawAll}
              onSimulatePayment={simulateIncomingPayment}
            />
          )}
          {/* Placeholders for other views if needed or keep inline */}
          {walletConnected && view === 'HISTORY' && (
            <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400">
              <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>
              <div className="glass p-8 rounded-xl">
                <p>No recent transactions</p>
              </div>
            </div>
          )}
          {walletConnected && view === 'SETTINGS' && (
            <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400">
              <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
              <div className="glass p-8 rounded-xl max-w-lg mx-auto">
                <div className="flex items-center justify-between">
                  <span>Auto-Sweep</span>
                  <motion.button
                    onClick={() => setAutoSweepEnabled(!autoSweepEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${autoSweepEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${autoSweepEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Demo Helper - Quick Links for Judges */}
      <DemoHelper 
        userAddress={userAddress}
        isVisible={demoHelperVisible}
        onToggle={() => setDemoHelperVisible(!demoHelperVisible)}
      />

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
