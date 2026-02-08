'use client';

import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, Zap, TrendingUp, ArrowRight, DollarSign } from 'lucide-react';

interface LandingViewProps {
    onConnect: () => void;
    walletBalance: number;
    safetyBalance: number;
    vaultBalance: number;
    sweepableAmount: number;
}

// Typewriter hook
function useTypewriter(text: string, speed: number = 50) {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, text, speed]);

    return displayText;
}

export default function LandingView({
    onConnect,
    walletBalance,
    safetyBalance,
    vaultBalance,
    sweepableAmount,
}: LandingViewProps) {
    const titleText = useTypewriter('Transform Your Idle Assets Into', 80);
    const [showSubtitle, setShowSubtitle] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowSubtitle(true), 2800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden"
        >
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                    }}
                />
            </div>

            <div className="max-w-6xl w-full space-y-20 relative z-10">
                {/* Hero Section */}
                <div className="text-center space-y-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-8"
                    >
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20"
                            >
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-purple-300">Powered by Stellar Blockchain</span>
                            </motion.div>
                            
                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight">
                                <span className="text-white">{titleText}</span>
                                <motion.span
                                    className="inline-block w-1 h-16 md:h-20 bg-purple-500 ml-2"
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                />
                                <br />
                                {showSubtitle && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.8 }}
                                        className="gradient-text"
                                    >
                                        Yield Powerhouses
                                    </motion.span>
                                )}
                            </h1>
                            
                            {showSubtitle && (
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                    className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed"
                                >
                                    Automatically sweep idle funds into high-yield DeFi protocols.
                                    <span className="text-white font-semibold"> Earn 14.5% APY </span>
                                    with zero manual work.
                                </motion.p>
                            )}
                        </div>

                        {showSubtitle && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 20px 60px rgba(168, 85, 247, 0.4)" }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onConnect}
                                    className="group relative px-10 py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white text-lg font-bold rounded-2xl overflow-hidden"
                                >
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600"
                                        initial={{ x: "100%" }}
                                        whileHover={{ x: "0%" }}
                                        transition={{ duration: 0.5 }}
                                    />
                                    <span className="relative flex items-center gap-2">
                                        Get Started
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </motion.button>
                                
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-10 py-5 glass text-white text-lg font-semibold rounded-2xl border border-purple-500/30 hover:border-purple-500/50 transition-all backdrop-blur-xl"
                                >
                                    Learn More
                                </motion.button>
                            </motion.div>
                        )}
                        
                        {/* Animated Stats Bar */}
                        {showSubtitle && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.2 }}
                                className="flex flex-wrap justify-center gap-8 md:gap-12 pt-8"
                            >
                                {[
                                    { icon: DollarSign, label: 'TVL', value: '$2.5M+', color: 'text-emerald-400' },
                                    { icon: TrendingUp, label: 'APY', value: '14.5%', color: 'text-purple-400' },
                                    { icon: Shield, label: 'Security', value: 'Audited', color: 'text-blue-400' },
                                ].map((stat, i) => (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1.4 + i * 0.1 }}
                                        className="flex items-center gap-3"
                                    >
                                        <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">{stat.label}</p>
                                            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}

                    </motion.div>
                </div>

                {/* Feature Cards */}
                {showSubtitle && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.6, duration: 0.8 }}
                        className="grid md:grid-cols-3 gap-6"
                    >
                        {[
                            {
                                icon: Zap,
                                title: 'Lightning Fast',
                                description: 'Instant sweeps and withdrawals powered by Stellar',
                                gradient: 'from-purple-500/10 to-pink-500/10',
                                border: 'border-purple-500/30',
                                iconColor: 'text-purple-400',
                                delay: 0
                            },
                            {
                                icon: Shield,
                                title: 'Secure & Reliable',
                                description: 'Smart contracts audited and battle-tested on-chain',
                                gradient: 'from-blue-500/10 to-purple-500/10',
                                border: 'border-blue-500/30',
                                iconColor: 'text-blue-400',
                                delay: 0.1
                            },
                            {
                                icon: TrendingUp,
                                title: '24/7 Yield Generation',
                                description: 'Automated DeFi strategies working around the clock',
                                gradient: 'from-emerald-500/10 to-green-500/10',
                                border: 'border-emerald-500/30',
                                iconColor: 'text-emerald-400',
                                delay: 0.2
                            },
                        ].map((feature, i) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.8 + feature.delay }}
                                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                                className={`relative group p-8 rounded-3xl bg-gradient-to-br ${feature.gradient} border ${feature.border} backdrop-blur-xl overflow-hidden`}
                            >
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                />
                                <div className="relative z-10 space-y-4">
                                    <motion.div
                                        whileHover={{ rotate: 360 }}
                                        transition={{ duration: 0.6 }}
                                        className={`w-14 h-14 rounded-2xl bg-black/30 flex items-center justify-center ${feature.iconColor}`}
                                    >
                                        <feature.icon className="w-7 h-7" />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                                </div>
                                
                                {/* Animated corner accent */}
                                <motion.div
                                    className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full ${feature.gradient} blur-2xl opacity-50`}
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.5, 0.8, 0.5],
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        delay: i * 0.5
                                    }}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
