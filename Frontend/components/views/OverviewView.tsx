'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Wallet, Vault, Zap, RefreshCw, Activity } from 'lucide-react';
import { GrowthChart } from '../dashboard/GrowthChart';

interface OverviewViewProps {
    walletBalance: number;
    vaultBalance: number;
    investedAmount: number;
    projectedMonthlyEarnings: number;
    blendAPY?: number;
    aquaAPY?: number;
    totalAPY?: number;
    apyLastUpdated?: Date | null;
    onRefreshAPY?: () => void;
    formatBalance?: (amount: number) => string;
}

export default function OverviewView({
    walletBalance,
    vaultBalance,
    investedAmount,
    projectedMonthlyEarnings,
    blendAPY = 5.0,
    aquaAPY = 9.5,
    totalAPY = 14.5,
    apyLastUpdated,
    onRefreshAPY,
    formatBalance = (amount) => amount.toFixed(2),
}: OverviewViewProps) {
    const getTimeAgo = (date: Date | null) => {
        if (!date) return 'Never';
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 10) return 'Just now';
        if (seconds < 60) return `${seconds}s ago`;
        return `${Math.floor(seconds / 60)}m ago`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="px-4 sm:px-6 lg:px-8 pb-20 max-w-7xl mx-auto"
        >
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold gradient-text mb-1">Portfolio Overview</h1>
                <p className="text-sm text-slate-400">Track your yield performance across all protocols</p>
            </div>

            {/* Key Metrics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    {
                        label: 'Total Balance',
                        value: walletBalance + vaultBalance,
                        suffix: ' XLM',
                        icon: Wallet,
                        color: 'text-purple-400',
                        bgColor: 'bg-purple-500/10',
                        borderColor: 'border-purple-500/30',
                    },
                    {
                        label: 'In Yield Vault',
                        value: vaultBalance,
                        suffix: ' XLM',
                        icon: Vault,
                        color: 'text-blue-400',
                        bgColor: 'bg-blue-500/10',
                        borderColor: 'border-blue-500/30',
                    },
                    {
                        label: 'Invested Amount',
                        value: investedAmount,
                        suffix: ' XLM',
                        icon: Zap,
                        color: 'text-emerald-400',
                        bgColor: 'bg-emerald-500/10',
                        borderColor: 'border-emerald-500/30',
                    },
                    {
                        label: 'Monthly Earnings',
                        value: projectedMonthlyEarnings,
                        suffix: ' XLM',
                        icon: TrendingUp,
                        color: 'text-pink-400',
                        bgColor: 'bg-pink-500/10',
                        borderColor: 'border-pink-500/30',
                    },
                ].map((metric, i) => (
                    <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                        whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
                        className={`glass p-6 rounded-2xl border ${metric.borderColor} relative overflow-hidden group cursor-pointer`}
                    >
                        <div className={`absolute inset-0 ${metric.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                        <motion.div
                            className={`absolute -right-6 -top-6 w-24 h-24 ${metric.bgColor} rounded-full blur-2xl opacity-50`}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.6, 0.3],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: i * 0.5
                            }}
                        />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">{metric.label}</p>
                                <motion.div
                                    whileHover={{ rotate: 360, scale: 1.1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <metric.icon className={`w-4 h-4 ${metric.color}`} />
                                </motion.div>
                            </div>
                            <motion.p
                                className="text-2xl font-bold gradient-text tracking-tight"
                                animate={{
                                    opacity: [0.8, 1, 0.8],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                {formatBalance(metric.value)}{metric.suffix}
                            </motion.p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Growth Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="glass p-8 rounded-2xl border border-purple-500/20 mb-8"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold gradient-text mb-1">Projected Growth</h2>
                        <p className="text-slate-400 text-xs">90-day earnings forecast</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <span className="text-xs text-slate-400">Earnings</span>
                        </div>
                    </div>
                </div>
                <GrowthChart currentBalance={vaultBalance} monthlyRate={totalAPY / 12 / 100} />
            </motion.div>

            {/* APY Breakdown */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="glass p-8 rounded-2xl border border-purple-500/20"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold gradient-text">Yield Composition</h2>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                <Activity className="w-3 h-3 text-emerald-400" />
                            </motion.div>
                            <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
                            <span className="text-[10px] text-slate-400">• {getTimeAgo(apyLastUpdated || null)}</span>
                        </div>
                        {onRefreshAPY && (
                            <motion.button
                                onClick={onRefreshAPY}
                                whileHover={{ scale: 1.1, rotate: 180 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 rounded-full bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
                                title="Refresh APY data"
                            >
                                <RefreshCw className="w-4 h-4 text-purple-400" />
                            </motion.button>
                        )}
                    </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                        <div className="text-blue-400 text-[10px] font-medium uppercase tracking-wider mb-1">Blend Protocol</div>
                        <div className="text-3xl font-bold gradient-text mb-1">{blendAPY}%</div>
                        <div className="text-[10px] text-slate-400">Lending Yield</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                        <div className="text-purple-400 text-[10px] font-medium uppercase tracking-wider mb-1">Aquarius Gauge</div>
                        <div className="text-3xl font-bold gradient-text mb-1">{aquaAPY}%</div>
                        <div className="text-[10px] text-slate-400">LP Rewards</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <div className="text-emerald-400 text-[10px] font-medium uppercase tracking-wider mb-1">Total APY</div>
                        <div className="text-3xl font-bold gradient-text mb-1">{totalAPY}%</div>
                        <div className="text-[10px] text-slate-400">Combined</div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
