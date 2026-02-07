'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, AlertCircle } from 'lucide-react';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeposit: (amount: number) => Promise<void>;
    walletBalance: number;
    isLoading: boolean;
}

export default function DepositModal({
    isOpen,
    onClose,
    onDeposit,
    walletBalance,
    isLoading
}: DepositModalProps) {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleDeposit = async () => {
        setError(null);

        const depositAmount = parseFloat(amount);

        // Validation
        if (isNaN(depositAmount) || depositAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (depositAmount > walletBalance) {
            setError('Insufficient wallet balance');
            return;
        }

        try {
            await onDeposit(depositAmount);
            setAmount('');
            onClose();
        } catch (e: any) {
            setError(e.message || 'Deposit failed');
        }
    };

    const setPercentage = (percent: number) => {
        const value = (walletBalance * percent / 100).toFixed(2);
        setAmount(value);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative glass border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-cyan-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Deposit Funds</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Balance Info */}
                    <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-white/5">
                        <p className="text-slate-400 text-sm mb-1">Available Balance</p>
                        <p className="text-2xl font-bold text-white">{walletBalance.toFixed(2)} XLM</p>
                    </div>

                    {/* Amount Input */}
                    <div className="mb-4">
                        <label className="text-slate-300 text-sm font-medium mb-2 block">
                            Deposit Amount
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white text-lg focus:outline-none focus:border-cyan-500/50 transition"
                                disabled={isLoading}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                                XLM
                            </span>
                        </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-4 gap-2 mb-6">
                        {[25, 50, 75, 100].map((percent) => (
                            <button
                                key={percent}
                                onClick={() => setPercentage(percent)}
                                disabled={isLoading}
                                className="px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 rounded-lg text-slate-300 text-sm font-medium transition disabled:opacity-50"
                            >
                                {percent}%
                            </button>
                        ))}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2"
                        >
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeposit}
                            disabled={isLoading || !amount}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-lg shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : 'Deposit'}
                        </button>
                    </div>

                    {/* Info Note */}
                    <p className="mt-4 text-xs text-slate-500 text-center">
                        Funds will be deposited into the yield vault and can be withdrawn anytime.
                    </p>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
