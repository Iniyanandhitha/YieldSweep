'use client';

import { motion } from 'framer-motion';

interface LandingViewProps {
    onConnect: () => void;
    walletBalance: number;
    safetyBalance: number;
    vaultBalance: number;
    sweepableAmount: number;
}

export default function LandingView({
    onConnect,
    walletBalance,
    safetyBalance,
    vaultBalance,
    sweepableAmount,
}: LandingViewProps) {
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
                                Turn Your Wallet Into a <span className="text-cyan-400">Smart Savings Account</span>
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
                                className="px-8 py-3 bg-cyan-500 text-slate-950 font-bold rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition"
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
                                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold mb-4 group-hover:bg-cyan-400 group-hover:text-black transition">
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
                        className="inline-block px-12 py-4 bg-cyan-500 text-slate-950 font-bold rounded-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition text-lg"
                    >
                        Connect Wallet
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
