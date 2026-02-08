'use client';

import { motion } from 'framer-motion';
import { Zap, TrendingUp, Shield, ArrowRight } from 'lucide-react';
import { SmartSlider } from '../ui/SmartSlider';

interface SweepViewProps {
    walletBalance: number;
    safetyBalance: number;
    setSafetyBalance: (value: number) => void;
    sweepableAmount: number;
    vaultBalance: number;
    onSweep: () => Promise<void>;
    onUpdateSafetyLimit: (limit: number) => Promise<void>;
    isLoading: boolean;
    formatBalance?: (amount: number) => string;
}

export default function SweepView({
    walletBalance,
    safetyBalance,
    setSafetyBalance,
    sweepableAmount,
    vaultBalance,
    onSweep,
    onUpdateSafetyLimit,
    isLoading,
    formatBalance = (amount) => amount.toFixed(2),
}: SweepViewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="px-4 sm:px-6 lg:px-8 pb-20 max-w-5xl mx-auto"
        >
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold gradient-text mb-1">Smart Sweep</h1>
                <p className="text-sm text-slate-400">Automatically move excess funds to earn yield while keeping a safety buffer</p>
            </div>

            {/* Current Status */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Wallet Balance', value: walletBalance, suffix: ' XLM', color: 'text-white', icon: Shield },
                    { label: 'Safety Limit', value: safetyBalance, suffix: ' XLM', color: 'text-blue-400', icon: Shield },
                    { label: 'Sweepable', value: sweepableAmount, suffix: ' XLM', color: 'text-emerald-400', icon: Zap },
                ].map((item, i) => (
                    <motion.div
                        key={item.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1, duration: 0.3 }}
                        className="glass p-6 rounded-xl border border-purple-500/20"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <item.icon className={`w-3 h-3 ${item.color}`} />
                            <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">{item.label}</p>
                        </div>
                        <p className="text-xl font-bold gradient-text tracking-tight">
                            {formatBalance(item.value)}{item.suffix}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Safety Limit Configuration */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="glass p-8 rounded-2xl border border-purple-500/20 mb-8"
            >
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-bold gradient-text">Set Your Safety Limit</h2>
                </div>
                
                <p className="text-slate-400 mb-4 text-sm">
                    Funds above this limit will be swept into yield-generating protocols. Keep enough liquid for daily expenses.
                </p>

                <div className="space-y-6">
                    <div className="flex justify-between items-end mb-4">
                        <label className="text-sm uppercase tracking-wide text-slate-300">
                            Keep liquid:
                        </label>
                        <span className="text-3xl font-bold text-white">{formatBalance(safetyBalance)} XLM</span>
                    </div>

                    <SmartSlider
                        value={safetyBalance}
                        max={Math.max(250, walletBalance)}
                        min={0}
                        onChange={setSafetyBalance}
                        isLoading={isLoading}
                    />

                    <div className="grid grid-cols-4 gap-2 mt-4">
                        {[25, 50, 100, 150].map((amount) => (
                            <button
                                key={amount}
                                onClick={() => setSafetyBalance(amount)}
                                className="py-2 px-4 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-400 transition-all text-sm font-medium"
                            >
                                {amount} XLM
                            </button>
                        ))}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onUpdateSafetyLimit(safetyBalance)}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25"
                    >
                        {isLoading ? 'Updating...' : 'Update Safety Limit'}
                    </motion.button>
                </div>
            </motion.div>

            {/* Sweep Preview */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="glass p-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-purple-500/5"
            >
                <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-bold gradient-text">Ready to Sweep</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-slate-400 text-xs mb-1">Amount to sweep</p>
                        <p className="text-3xl font-bold gradient-text">
                            {formatBalance(Math.max(0, walletBalance - safetyBalance))} XLM
                        </p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs mb-1">Est. Monthly Earnings</p>
                        <p className="text-3xl font-bold gradient-text">
                            +{formatBalance((walletBalance - safetyBalance) * 0.145 / 12)} XLM
                        </p>
                        <p className="text-xs text-slate-500 mt-1">at 14.5% APY</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 mb-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                            <p className="text-xs text-slate-400">Sweep Process</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                            <span>Transfer to Vault</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>Deposit to Blend</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>Stake in Aquarius</span>
                        </div>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onSweep}
                    disabled={isLoading || sweepableAmount <= 0}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                    <Zap className="w-5 h-5" />
                    {isLoading ? 'Sweeping...' : sweepableAmount > 0 ? `Sweep ${formatBalance(sweepableAmount)} XLM` : 'No Funds to Sweep'}
                </motion.button>

                {sweepableAmount <= 0 && (
                    <p className="text-center text-slate-500 text-sm mt-4">
                        Increase your wallet balance or lower your safety limit to enable sweeping
                    </p>
                )}
            </motion.div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-6 mt-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="glass p-6 rounded-xl border border-purple-500/20"
                >
                    <TrendingUp className="w-6 h-6 text-purple-400 mb-2" />
                    <h3 className="text-base font-semibold gradient-text mb-1">Earn 14.5% APY</h3>
                    <p className="text-xs text-slate-400">
                        Your swept funds earn yield through Blend (5%) and Aquarius (9.5%) protocols simultaneously through liquid restaking.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="glass p-6 rounded-xl border border-purple-500/20"
                >
                    <Shield className="w-6 h-6 text-blue-400 mb-2" />
                    <h3 className="text-base font-semibold gradient-text mb-1">Always Protected</h3>
                    <p className="text-xs text-slate-400">
                        Your safety limit ensures you always have liquid funds available. Withdraw anytime with no lock-ups or penalties.
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );
}
