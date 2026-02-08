'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, ArrowUpCircle, ArrowDownCircle, Zap } from 'lucide-react';
import { SmartSlider } from '../ui/SmartSlider';
import { GrowthChart } from '../dashboard/GrowthChart';
import DepositModal from '../modals/DepositModal';
import WithdrawModal from '../modals/WithdrawModal';

interface DashboardViewProps {
    walletBalance: number;
    safetyBalance: number;
    setSafetyBalance: (value: number) => void;
    vaultBalance: number;
    sweepableAmount: number;
    investedAmount: number;
    totalVaultDeposits: number;
    totalInvested: number;
    truncatedAddress: string;
    autoSweepEnabled: boolean;
    setAutoSweepEnabled: (value: boolean) => void;
    showNotification: (msg: string) => void;
    onUpdateSafetyLimit: (limit: number) => Promise<void>;
    onSweep: () => Promise<void>;
    onDeposit?: (amount: number) => Promise<any>;
    onWithdraw?: (amount: number) => Promise<any>;
    isLoading: boolean;
    isContractInitialized: boolean;
    onInitialize: () => Promise<void>;
    onWithdrawAll: () => Promise<boolean | undefined>;
    onSimulatePayment: (amount: number) => Promise<void>;
    // Liquid Restaking props
    onAtomicSweep?: () => Promise<boolean | undefined>;
    blendAPY?: number;
    aquaAPY?: number;
    totalAPY?: number;
    projectedMonthlyEarnings?: number;
    // Privacy mode props
    privacyMode?: boolean;
    formatBalance?: (amount: number) => string;
}

export default function DashboardView({
    walletBalance,
    safetyBalance,
    setSafetyBalance,
    vaultBalance,
    sweepableAmount,
    investedAmount,
    totalVaultDeposits,
    totalInvested,
    truncatedAddress,
    autoSweepEnabled,
    setAutoSweepEnabled,
    showNotification,
    onUpdateSafetyLimit,
    onSweep,
    onDeposit,
    onWithdraw,
    isLoading,
    isContractInitialized,
    onInitialize,
    onWithdrawAll,
    onSimulatePayment,
    onAtomicSweep,
    blendAPY = 5.0,
    aquaAPY = 9.5,
    totalAPY = 14.5,
    projectedMonthlyEarnings = 0,
    privacyMode = false,
    formatBalance,
}: DashboardViewProps) {
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);

    // Default format function if not provided
    const displayBalance = formatBalance || ((amount: number) => amount.toFixed(2));

    const handleDeposit = async (amount: number) => {
        if (onDeposit) {
            await onDeposit(amount);
            showNotification(`Deposited ${amount.toFixed(2)} XLM to vault`);
        }
    };

    const handleWithdraw = async (amount: number) => {
        if (onWithdraw) {
            await onWithdraw(amount);
            showNotification(`Withdrawn ${amount.toFixed(2)} XLM from vault`);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="px-4 sm:px-6 lg:px-8 pb-20"
        >
            <div className="max-w-7xl mx-auto space-y-8">

                {!isContractInitialized && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, y: -20 }}
                        animate={{ height: 'auto', opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-gradient-to-r from-red-500/20 via-red-600/20 to-orange-500/20 border-2 border-red-500/50 p-6 rounded-2xl flex items-center justify-between shadow-xl shadow-red-500/20"
                    >
                        <div className="flex items-center gap-4">
                            <motion.div 
                                className="bg-red-500/20 p-3 rounded-xl"
                                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </motion.div>
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                <h3 className="text-red-300 font-bold text-base mb-1">Contract Not Initialized</h3>
                                <p className="text-red-200/80 text-xs font-normal">The yield sweep vault needs to be initialized before use. This is a one-time setup.</p>
                            </motion.div>
                        </div>
                        <motion.button
                            whileHover={{ 
                                scale: 1.05,
                                boxShadow: "0 10px 30px rgba(239, 68, 68, 0.4)",
                                transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            onClick={onInitialize}
                            disabled={isLoading}
                            className="px-8 py-3 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Initializing...' : 'Initialize Now'}
                        </motion.button>
                    </motion.div>
                )}

                {/* Section 1: Wallet Overview - Actionable Data */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        {
                            label: 'Wallet Balance',
                            value: walletBalance,
                            suffix: ' XLM',
                            color: 'text-white',
                            subtext: 'Liquid funds'
                        },
                        {
                            label: 'In Yield Vault',
                            value: vaultBalance,
                            suffix: ' XLM',
                            color: 'text-blue-400',
                            subtext: (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-[10px] font-medium rounded-lg border border-blue-500/30">
                                        Blend {blendAPY}%
                                    </span>
                                    <span className="text-[10px] text-slate-500">+</span>
                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-[10px] font-medium rounded-lg border border-purple-500/30">
                                        Aqua {aquaAPY}%
                                    </span>
                                    <span className="text-[10px] text-green-400 font-bold ml-1">= {totalAPY}%</span>
                                </div>
                            )
                        },
                        {
                            label: 'Invested in Blend',
                            value: investedAmount,
                            suffix: ' XLM',
                            color: 'text-blue-400',
                            subtext: 'Earning yield'
                        },
                        {
                            label: 'Est. Monthly Earnings',
                            value: projectedMonthlyEarnings,
                            suffix: ' XLM',
                            color: 'text-green-400',
                            subtext: 'Auto-compounding'
                        },
                    ].map((card, i) => (
                        <motion.div
                            key={i}
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            whileHover={{ 
                                y: -6, 
                                scale: 1.02,
                                boxShadow: "0 20px 40px rgba(59, 130, 246, 0.2)",
                                transition: { duration: 0.3 }
                            }}
                            className={`glass p-6 rounded-2xl border border-white/10 hover:border-blue-500/40 transition-all duration-300 ${(card as any).pulse ? 'trust-pulse border-emerald-500/30' : ''}`}
                        >
                            <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest mb-3">{card.label}</p>
                            <motion.p
                                key={Math.floor(card.value)}
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className={`text-2xl lg:text-3xl font-bold ${card.color} mb-2 tracking-tight`}
                            >
                                {displayBalance(card.value)}{card.suffix}
                            </motion.p>
                            {card.subtext && (
                                <motion.div 
                                    className="text-slate-400 text-[10px]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                                >
                                    {card.subtext}
                                </motion.div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Action Buttons Section */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    <motion.button
                        whileHover={{ 
                            scale: 1.05, 
                            y: -4,
                            boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)",
                            transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowDepositModal(true)}
                        disabled={isLoading || !isContractInitialized}
                        className="glass p-6 rounded-2xl border border-white/10 hover:border-blue-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="flex flex-col items-center gap-3">
                            <motion.div 
                                className="p-4 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-all duration-300"
                                whileHover={{ scale: 1.15, rotate: 5 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ArrowUpCircle className="w-6 h-6 text-blue-400" />
                            </motion.div>
                            <span className="text-white font-semibold text-xs tracking-wide">Deposit</span>
                        </div>
                    </motion.button>

                    <motion.button
                        whileHover={{ 
                            scale: 1.05, 
                            y: -4,
                            boxShadow: "0 20px 40px rgba(168, 85, 247, 0.3)",
                            transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowWithdrawModal(true)}
                        disabled={isLoading || !isContractInitialized || vaultBalance <= 0}
                        className="glass p-6 rounded-2xl border border-white/10 hover:border-purple-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="flex flex-col items-center gap-3">
                            <motion.div 
                                className="p-4 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-all duration-300"
                                whileHover={{ scale: 1.15, rotate: -5 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ArrowDownCircle className="w-6 h-6 text-purple-400" />
                            </motion.div>
                            <span className="text-white font-semibold text-xs tracking-wide">Withdraw</span>
                        </div>
                    </motion.button>

                    <motion.button
                        whileHover={{ 
                            scale: 1.05, 
                            y: -4,
                            boxShadow: "0 20px 40px rgba(34, 197, 94, 0.3)",
                            transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onSweep}
                        disabled={isLoading || !isContractInitialized || sweepableAmount <= 0}
                        className="glass p-6 rounded-2xl border border-white/10 hover:border-green-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="flex flex-col items-center gap-3">
                            <motion.div 
                                className="p-4 bg-green-500/20 rounded-xl group-hover:bg-green-500/30 transition-all duration-300"
                                whileHover={{ scale: 1.15, rotate: 10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Zap className="w-6 h-6 text-green-400" />
                            </motion.div>
                            <span className="text-white font-semibold text-xs tracking-wide">Sweep</span>
                        </div>
                    </motion.button>

                    <motion.button
                        whileHover={{ 
                            scale: 1.05, 
                            y: -4,
                            boxShadow: "0 20px 40px rgba(239, 68, 68, 0.3)",
                            transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onWithdrawAll}
                        disabled={isLoading || !isContractInitialized || vaultBalance <= 0}
                        className="glass p-6 rounded-2xl border border-white/10 hover:border-red-500/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="flex flex-col items-center gap-3">
                            <motion.div 
                                className="p-4 bg-red-500/20 rounded-xl group-hover:bg-red-500/30 transition-all duration-300"
                                whileHover={{ scale: 1.15, rotate: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <TrendingUp className="w-6 h-6 text-red-400" />
                            </motion.div>
                            <span className="text-white font-semibold text-xs tracking-wide">Exit All</span>
                        </div>
                    </motion.button>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Section 2: Safety Balance Control */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="glass p-8 rounded-xl border border-white/10"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Safety Balance</h2>
                            <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full">
                                Max: ${walletBalance.toFixed(0)}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between mb-4">
                                    <label className="text-sm uppercase tracking-wide text-slate-300">
                                        Keep liquid:
                                    </label>
                                    <span className="text-xl font-bold text-white">{displayBalance(safetyBalance)} XLM</span>
                                </div>

                                <SmartSlider
                                    value={safetyBalance}
                                    max={Math.max(250, walletBalance)}
                                    min={0}
                                    onChange={setSafetyBalance}
                                    isLoading={isLoading}
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Move slider to adjust how much you want to keep in your wallet.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-950/30 p-4 rounded-lg border border-white/5">
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">New Sweep Amount</p>
                                    <p className="text-xl font-bold text-emerald-400">
                                        {displayBalance(Math.max(0, walletBalance - safetyBalance))} XLM
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Est. Monthly Interest</p>
                                    <p className="text-xl font-bold text-cyan-400">
                                        +{displayBalance(vaultBalance * 0.05 / 12)} XLM
                                    </p>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onUpdateSafetyLimit(safetyBalance)}
                                disabled={isLoading}
                                className="w-full px-6 py-4 bg-cyan-500 text-slate-950 font-bold rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    'Updating...'
                                ) : (
                                    <>
                                        <span>Update Safety Limit</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Section 3: Earnings & Charts */}
                    <div className="space-y-6">
                        <GrowthChart currentBalance={vaultBalance} monthlyRate={0.05 / 12} />

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="glass p-6 rounded-xl border border-white/10"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-300 font-bold">Auto-Sweep</p>
                                    <p className="text-slate-400 text-sm">Automatically move excess funds to vault</p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={async () => {
                                        if (!autoSweepEnabled) {
                                            await onSweep();
                                        }
                                        setAutoSweepEnabled(!autoSweepEnabled);
                                        showNotification(`Auto-Sweep ${!autoSweepEnabled ? 'enabled' : 'disabled'}`);
                                    }}
                                    disabled={isLoading}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${autoSweepEnabled
                                        ? 'bg-emerald-500/20 border border-emerald-500'
                                        : 'bg-slate-700 border border-slate-600'
                                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <motion.span
                                        layout
                                        className={`inline-block h-6 w-6 transform rounded-full transition-all ${autoSweepEnabled
                                            ? 'translate-x-7 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                            : 'translate-x-1 bg-slate-400'
                                            }`}
                                    />
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Simulation Demo Control */}
                        <div className="p-4 border border-dashed border-slate-700 rounded-lg bg-slate-900/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-300 font-medium text-sm">Demo Simulation</p>
                                    <p className="text-slate-500 text-xs">Simulate receiving 100 XLM</p>
                                </div>
                                <button
                                    onClick={() => onSimulatePayment(100)}
                                    className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded border border-slate-700 transition"
                                >
                                    Receive +100 XLM
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <DepositModal
                isOpen={showDepositModal}
                onClose={() => setShowDepositModal(false)}
                onDeposit={handleDeposit}
                walletBalance={walletBalance}
                isLoading={isLoading}
            />

            <WithdrawModal
                isOpen={showWithdrawModal}
                onClose={() => setShowWithdrawModal(false)}
                onWithdraw={handleWithdraw}
                vaultBalance={vaultBalance}
                investedAmount={investedAmount}
                isLoading={isLoading}
            />
        </motion.div>
    );
}
