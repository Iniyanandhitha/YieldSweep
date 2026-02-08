'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Vault, History } from 'lucide-react';

interface TransactViewProps {
    walletBalance: number;
    vaultBalance: number;
    onDeposit?: (amount: number) => Promise<any>;
    onWithdraw?: (amount: number) => Promise<any>;
    onWithdrawAll: () => Promise<boolean | undefined>;
    isLoading: boolean;
    formatBalance?: (amount: number) => string;
}

export default function TransactView({
    walletBalance,
    vaultBalance,
    onDeposit,
    onWithdraw,
    onWithdrawAll,
    isLoading,
    formatBalance = (amount) => amount.toFixed(2),
}: TransactViewProps) {
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

    const handleDeposit = async () => {
        const amount = parseFloat(depositAmount);
        if (onDeposit && amount > 0 && amount <= walletBalance) {
            await onDeposit(amount);
            setDepositAmount('');
        }
    };

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (onWithdraw && amount > 0 && amount <= vaultBalance) {
            await onWithdraw(amount);
            setWithdrawAmount('');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="px-4 sm:px-6 lg:px-8 pb-20 max-w-4xl mx-auto"
        >
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold gradient-text mb-1">Manage Funds</h1>
                <p className="text-sm text-slate-400">Deposit into or withdraw from your yield vault</p>
            </div>

            {/* Balance Overview */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="glass p-6 rounded-2xl border border-purple-500/20"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Wallet className="w-4 h-4 text-blue-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Wallet Balance</p>
                    </div>
                    <p className="text-2xl font-bold gradient-text tracking-tight">{formatBalance(walletBalance)} XLM</p>
                    <p className="text-[10px] text-slate-500 mt-1">Available to deposit</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="glass p-6 rounded-2xl border border-purple-500/20"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Vault className="w-4 h-4 text-purple-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Vault Balance</p>
                    </div>
                    <p className="text-2xl font-bold gradient-text tracking-tight">{formatBalance(vaultBalance)} XLM</p>
                    <p className="text-[10px] text-slate-500 mt-1">Available to withdraw</p>
                </motion.div>
            </div>

            {/* Tab Selector */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="flex gap-2 mb-6"
            >
                <button
                    onClick={() => setActiveTab('deposit')}
                    className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                        activeTab === 'deposit'
                            ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/25'
                            : 'glass border border-slate-700 text-slate-400 hover:text-white'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <ArrowDownCircle className="w-5 h-5" />
                        Deposit
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('withdraw')}
                    className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                        activeTab === 'withdraw'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                            : 'glass border border-slate-700 text-slate-400 hover:text-white'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <ArrowUpCircle className="w-5 h-5" />
                        Withdraw
                    </div>
                </button>
            </motion.div>

            {/* Transaction Forms */}
            <AnimatePresence mode="wait">
                {activeTab === 'deposit' ? (
                    <motion.div
                        key="deposit"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="glass p-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-purple-500/5"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <ArrowDownCircle className="w-6 h-6 text-emerald-400" />
                            <h2 className="text-2xl font-bold text-white">Deposit to Vault</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Amount to Deposit</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-4 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">XLM</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {[25, 50, 75, 100].map((percent) => (
                                    <button
                                        key={percent}
                                        onClick={() => setDepositAmount((walletBalance * percent / 100).toFixed(2))}
                                        className="py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-400 transition-all text-sm font-medium"
                                    >
                                        {percent}%
                                    </button>
                                ))}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDeposit}
                                disabled={isLoading || !depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > walletBalance}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
                            >
                                {isLoading ? 'Depositing...' : `Deposit ${depositAmount || '0'} XLM`}
                            </motion.button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="withdraw"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="glass p-8 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <ArrowUpCircle className="w-6 h-6 text-purple-400" />
                            <h2 className="text-2xl font-bold text-white">Withdraw from Vault</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Amount to Withdraw</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-4 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">XLM</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {[25, 50, 75, 100].map((percent) => (
                                    <button
                                        key={percent}
                                        onClick={() => setWithdrawAmount((vaultBalance * percent / 100).toFixed(2))}
                                        className="py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-400 transition-all text-sm font-medium"
                                    >
                                        {percent}%
                                    </button>
                                ))}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleWithdraw}
                                disabled={isLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > vaultBalance}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25"
                            >
                                {isLoading ? 'Withdrawing...' : `Withdraw ${withdrawAmount || '0'} XLM`}
                            </motion.button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-700"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-slate-900 px-2 text-slate-500">Or</span>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onWithdrawAll}
                                disabled={isLoading || vaultBalance <= 0}
                                className="w-full py-3 rounded-xl border-2 border-pink-500/50 text-pink-400 hover:bg-pink-500/10 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Withdraw All ({formatBalance(vaultBalance)} XLM)
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Info Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="glass p-6 rounded-xl border border-purple-500/20 mt-8"
            >
                <div className="flex items-start gap-3">
                    <History className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                        <h3 className="text-white font-semibold mb-2">Transaction Info</h3>
                        <ul className="text-sm text-slate-400 space-y-1">
                            <li>• Deposits are immediately invested in yield protocols</li>
                            <li>• Withdrawals are processed instantly with no lock-up period</li>
                            <li>• All transactions are recorded on the Stellar blockchain</li>
                            <li>• You maintain full custody of your assets at all times</li>
                        </ul>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
