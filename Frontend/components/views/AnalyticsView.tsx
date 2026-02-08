'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Zap, DollarSign, Percent, BarChart3, PieChart } from 'lucide-react';
import { GrowthChart } from '../dashboard/GrowthChart';

interface AnalyticsViewProps {
    vaultBalance: number;
    investedAmount: number;
    projectedMonthlyEarnings: number;
    blendAPY?: number;
    aquaAPY?: number;
    totalAPY?: number;
    formatBalance?: (amount: number) => string;
}

export default function AnalyticsView({
    vaultBalance,
    investedAmount,
    projectedMonthlyEarnings,
    blendAPY = 5.0,
    aquaAPY = 9.5,
    totalAPY = 14.5,
    formatBalance = (amount) => amount.toFixed(2),
}: AnalyticsViewProps) {
    const projectedYearlyEarnings = projectedMonthlyEarnings * 12;
    const utilizationRate = vaultBalance > 0 ? (investedAmount / vaultBalance) * 100 : 0;

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
                <h1 className="text-3xl font-bold gradient-text mb-1">Analytics & Performance</h1>
                <p className="text-sm text-slate-400">Detailed insights into your yield generation and portfolio performance</p>
            </div>

            {/* Key Performance Metrics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    {
                        label: 'Total APY',
                        value: totalAPY,
                        suffix: '%',
                        icon: Percent,
                        color: 'text-emerald-400',
                        bgColor: 'bg-emerald-500/10',
                        borderColor: 'border-emerald-500/30',
                    },
                    {
                        label: 'Monthly Earnings',
                        value: projectedMonthlyEarnings,
                        suffix: ' XLM',
                        icon: DollarSign,
                        color: 'text-blue-400',
                        bgColor: 'bg-blue-500/10',
                        borderColor: 'border-blue-500/30',
                    },
                    {
                        label: 'Yearly Projection',
                        value: projectedYearlyEarnings,
                        suffix: ' XLM',
                        icon: TrendingUp,
                        color: 'text-purple-400',
                        bgColor: 'bg-purple-500/10',
                        borderColor: 'border-purple-500/30',
                    },
                    {
                        label: 'Utilization Rate',
                        value: utilizationRate,
                        suffix: '%',
                        icon: Zap,
                        color: 'text-pink-400',
                        bgColor: 'bg-pink-500/10',
                        borderColor: 'border-pink-500/30',
                    },
                ].map((metric, i) => (
                    <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1, duration: 0.3 }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className={`glass p-6 rounded-2xl border ${metric.borderColor} relative overflow-hidden group`}
                    >
                        <div className={`absolute inset-0 ${metric.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">{metric.label}</p>
                                <metric.icon className={`w-4 h-4 ${metric.color}`} />
                            </div>
                            <p className="text-2xl font-bold gradient-text tracking-tight">
                                {formatBalance(metric.value)}{metric.suffix}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Growth Projection Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="glass p-8 rounded-2xl border border-purple-500/20 mb-8"
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold gradient-text mb-1">90-Day Forecast</h2>
                        <p className="text-slate-400 text-xs">Projected earnings with compound interest</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span className="text-sm text-slate-400">Balance Growth</span>
                        </div>
                    </div>
                </div>
                <GrowthChart currentBalance={vaultBalance} monthlyRate={totalAPY / 12 / 100} />
            </motion.div>

            {/* Protocol Distribution */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="glass p-8 rounded-2xl border border-purple-500/20"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <PieChart className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-bold gradient-text">Yield Breakdown</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span className="text-white font-medium">Blend Protocol</span>
                                </div>
                                <span className="text-blue-400 font-bold">{blendAPY}%</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${(blendAPY / totalAPY) * 100}%` }}></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Lending income from stablecoin supply</p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    <span className="text-white font-medium">Aquarius Gauge</span>
                                </div>
                                <span className="text-purple-400 font-bold">{aquaAPY}%</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400" style={{ width: `${(aquaAPY / totalAPY) * 100}%` }}></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">LP rewards from bToken staking</p>
                        </div>

                        <div className="pt-4 border-t border-slate-700">
                            <div className="flex justify-between items-center">
                                <span className="text-white font-semibold">Total Combined APY</span>
                                <span className="gradient-text font-bold text-xl">{totalAPY}%</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="glass p-8 rounded-2xl border border-purple-500/20"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <BarChart3 className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-bold gradient-text">Earnings Timeline</h2>
                    </div>

                    <div className="space-y-4">
                        {[
                            { period: 'Daily', amount: projectedMonthlyEarnings / 30, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
                            { period: 'Weekly', amount: projectedMonthlyEarnings / 4.33, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
                            { period: 'Monthly', amount: projectedMonthlyEarnings, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
                            { period: 'Yearly', amount: projectedYearlyEarnings, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
                        ].map((item, i) => (
                            <motion.div
                                key={item.period}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
                                className={`p-4 rounded-xl ${item.bgColor} border border-slate-700/50`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-300 font-medium">{item.period}</span>
                                    <span className={`${item.color} font-bold text-lg`}>
                                        +{formatBalance(item.amount)} XLM
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Performance Insights */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="glass p-8 rounded-2xl border border-purple-500/20"
            >
                <h2 className="text-lg font-bold gradient-text mb-4">Performance Insights</h2>
                
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30">
                        <TrendingUp className="w-6 h-6 text-blue-400 mb-2" />
                        <h3 className="gradient-text font-semibold mb-1 text-sm">Efficient Strategy</h3>
                        <p className="text-xs text-slate-400">
                            Liquid restaking maximizes yields by stacking multiple protocols simultaneously
                        </p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                        <Zap className="w-6 h-6 text-purple-400 mb-2" />
                        <h3 className="gradient-text font-semibold mb-1 text-sm">Auto-Compounding</h3>
                        <p className="text-xs text-slate-400">
                            Earnings are automatically reinvested to accelerate growth through compound interest
                        </p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30">
                        <DollarSign className="w-6 h-6 text-emerald-400 mb-2" />
                        <h3 className="gradient-text font-semibold mb-1 text-sm">Diversified Income</h3>
                        <p className="text-xs text-slate-400">
                            Earn from lending yields and liquidity mining rewards across Stellar DeFi
                        </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
