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
            transition={{ duration: 0.5 }}
            className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-20"
        >
            <div className="max-w-6xl w-full space-y-20">
                {/* Hero Section */}
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="space-y-8"
                    >
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight text-balance tracking-tight">
                                Turn Your Wallet Into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Smart Savings Account</span>
                            </h1>
                            <p className="text-base md:text-lg text-slate-300 text-balance leading-relaxed font-normal">
                                Yield-Sweep automatically earns yield on idle USDC on Stellar — no staking, no manual DeFi steps.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)" }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                onClick={onConnect}
                                className="px-8 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
                            >
                                Connect Wallet
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="px-8 py-3 glass text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
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
                                    transition={{ delay: 0.4 + i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                    className="text-center"
                                >
                                    <motion.p 
                                        className="text-2xl font-bold text-blue-400"
                                        whileHover={{ scale: 1.1, y: -2 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {stat.value}
                                    </motion.p>
                                    <p className="text-slate-400 text-xs font-medium tracking-wide">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Dashboard Preview */}
                    <motion.div
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        whileHover={{ y: -8, transition: { duration: 0.3 } }}
                        className="glass p-8 rounded-3xl border border-white/10 shadow-2xl hover:shadow-blue-500/10 transition-shadow duration-500"
                    >
                        <div className="space-y-6">
                            <div>
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Wallet Balance</p>
                                <motion.p
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    className="text-3xl font-bold text-white"
                                >
                                    {walletBalance.toFixed(2)} XLM
                                </motion.p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-alt p-4 rounded-xl">
                                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Safety Limit</p>
                                    <p className="text-xl font-bold text-white">{safetyBalance.toFixed(2)} XLM</p>
                                </div>
                                <div className="glass-alt p-4 rounded-xl">
                                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">In Vault</p>
                                    <p className="text-xl font-bold text-blue-400">{vaultBalance.toFixed(2)} XLM</p>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Sweepable Amount</p>
                                <motion.div
                                    key={Math.floor(sweepableAmount)}
                                    initial={{ scale: 0.95 }}
                                    animate={{ scale: 1 }}
                                    className="text-2xl font-bold text-blue-400"
                                >
                                    {sweepableAmount > 0 ? `${sweepableAmount.toFixed(2)} XLM` : 'No excess funds'}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* How It Works Section */}
                <div className="space-y-12">
                    <div className="text-center space-y-3 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">How It Works</h2>
                        <p className="text-base text-slate-400 font-normal">Three simple steps to start earning yield automatically</p>
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
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ 
                                    delay: 0.4 + i * 0.15, 
                                    duration: 0.6, 
                                    ease: [0.22, 1, 0.36, 1] 
                                }}
                                whileHover={{ 
                                    y: -8, 
                                    scale: 1.03,
                                    boxShadow: "0 20px 40px rgba(59, 130, 246, 0.2)",
                                    transition: { duration: 0.3 }
                                }}
                                className="glass p-8 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all duration-300 group"
                            >
                                <motion.div 
                                    className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-lg mb-4 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300"
                                    whileHover={{ rotate: 360, scale: 1.1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    {step.num}
                                </motion.div>
                                <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">{step.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Features Section */}
                <div className="space-y-12">
                    <div className="text-center space-y-3 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">What is Yield-Sweep?</h2>
                        <p className="text-base text-slate-400 font-normal">Enterprise-grade DeFi automation</p>
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
