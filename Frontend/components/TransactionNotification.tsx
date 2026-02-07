'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export type TransactionNotification = {
    message: string;
    hash?: string;
    explorerUrl?: string;
    type: 'success' | 'error' | 'info';
};

interface TransactionNotificationProps {
    notification: TransactionNotification | null;
    onClose: () => void;
}

export function TransactionNotification({ notification, onClose }: TransactionNotificationProps) {
    const [copied, setCopied] = useState(false);

    if (!notification) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const truncateHash = (hash: string) => {
        return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
    };

    const iconMap = {
        success: <CheckCircle className="w-5 h-5 text-green-400" />,
        error: <XCircle className="w-5 h-5 text-red-400" />,
        info: <Info className="w-5 h-5 text-cyan-400" />,
    };

    const colorMap = {
        success: 'border-green-400 bg-green-500/10',
        error: 'border-red-400 bg-red-500/10',
        info: 'border-cyan-400 bg-cyan-500/10',
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className={`fixed bottom-6 right-6 glass border-l-4 ${colorMap[notification.type]} rounded-xl z-50 shadow-2xl max-w-md`}
            >
                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                            {iconMap[notification.type]}
                            <div>
                                <p className={`font-bold text-sm ${
                                    notification.type === 'success' ? 'text-green-400' :
                                    notification.type === 'error' ? 'text-red-400' : 'text-cyan-400'
                                }`}>
                                    {notification.type === 'success' ? 'Transaction Successful' :
                                     notification.type === 'error' ? 'Transaction Failed' : 'Info'}
                                </p>
                                <p className="text-white text-sm mt-1">{notification.message}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/5"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Transaction Hash */}
                    {notification.hash && (
                        <div className="space-y-2 mt-4 pt-3 border-t border-white/10">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-slate-400 text-xs font-medium">Transaction Hash:</p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => copyToClipboard(notification.hash!)}
                                        className="text-slate-400 hover:text-cyan-400 transition p-1.5 rounded-lg hover:bg-white/5"
                                        title="Copy hash"
                                    >
                                        {copied ? (
                                            <Check className="w-3.5 h-3.5 text-green-400" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="glass-alt p-2 rounded-lg">
                                <code className="text-cyan-400 text-xs font-mono break-all">
                                    {truncateHash(notification.hash)}
                                </code>
                            </div>
                        </div>
                    )}

                    {/* Explorer Link */}
                    {notification.explorerUrl && (
                        <motion.a
                            href={notification.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-2 mt-3 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium transition group"
                        >
                            <span>View on Stellar Expert</span>
                            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </motion.a>
                    )}

                    {/* Demo Tip */}
                    {notification.type === 'success' && (
                        <div className="mt-3 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                            <p className="text-slate-400 text-xs">
                                💡 <span className="font-semibold">Demo Tip:</span> Click the link above to show judges the transaction on Stellar Explorer
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
