'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Eye, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { CONTRACT_ID, RPC_URL } from '../constants';

interface DemoHelperProps {
    userAddress: string | undefined;
    isVisible: boolean;
    onToggle: () => void;
}

export function DemoHelper({ userAddress, isVisible, onToggle }: DemoHelperProps) {
    const [copiedWallet, setCopiedWallet] = useState(false);
    const [copiedContract, setCopiedContract] = useState(false);

    const copyToClipboard = (text: string, type: 'wallet' | 'contract') => {
        navigator.clipboard.writeText(text);
        if (type === 'wallet') {
            setCopiedWallet(true);
            setTimeout(() => setCopiedWallet(false), 2000);
        } else {
            setCopiedContract(true);
            setTimeout(() => setCopiedContract(false), 2000);
        }
    };

    const explorerLinks = {
        contract: `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`,
        wallet: userAddress ? `https://stellar.expert/explorer/testnet/account/${userAddress}` : null,
        network: 'https://stellar.expert/explorer/testnet',
    };

    if (!isVisible) {
        return (
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onToggle}
                className="fixed bottom-6 left-6 z-40 p-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-full backdrop-blur-xl shadow-lg group"
                title="Show Demo Helper"
            >
                <Eye className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
            </motion.button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="fixed bottom-6 left-6 z-40 glass border border-purple-500/30 rounded-xl p-4 max-w-sm shadow-2xl"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    <h3 className="text-purple-400 font-bold text-sm">Demo Helper</h3>
                </div>
                <button
                    onClick={onToggle}
                    className="text-slate-400 hover:text-white transition p-1"
                >
                    <Eye className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-3">
                {/* Contract Link */}
                <div className="glass-alt p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-slate-400 text-xs font-semibold">Smart Contract</p>
                        <button
                            onClick={() => copyToClipboard(CONTRACT_ID, 'contract')}
                            className="text-slate-400 hover:text-cyan-400 transition"
                        >
                            {copiedContract ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                                <Copy className="w-3.5 h-3.5" />
                            )}
                        </button>
                    </div>
                    <code className="text-cyan-400 text-[10px] font-mono break-all block mb-2">
                        {CONTRACT_ID.slice(0, 16)}...{CONTRACT_ID.slice(-16)}
                    </code>
                    <a
                        href={explorerLinks.contract}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs transition group"
                    >
                        <span>View Contract</span>
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                </div>

                {/* Wallet Link */}
                {userAddress && (
                    <div className="glass-alt p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-slate-400 text-xs font-semibold">Your Wallet</p>
                            <button
                                onClick={() => copyToClipboard(userAddress, 'wallet')}
                                className="text-slate-400 hover:text-cyan-400 transition"
                            >
                                {copiedWallet ? (
                                    <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                        <code className="text-cyan-400 text-[10px] font-mono break-all block mb-2">
                            {userAddress.slice(0, 16)}...{userAddress.slice(-16)}
                        </code>
                        <a
                            href={explorerLinks.wallet!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs transition group"
                        >
                            <span>View on Explorer</span>
                            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                    </div>
                )}

                {/* Quick Links */}
                <div className="glass-alt p-3 rounded-lg">
                    <p className="text-slate-400 text-xs font-semibold mb-2">Quick Links</p>
                    <div className="space-y-2">
                        <a
                            href="https://laboratory.stellar.org/#account-creator?network=test"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs transition group"
                        >
                            <span>Fund Account (Friendbot)</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                            href={explorerLinks.network}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs transition group"
                        >
                            <span>Stellar Expert Testnet</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>

                {/* Demo Tips */}
                <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-lg">
                    <p className="text-purple-400 text-xs font-semibold mb-2">💡 Demo Tips</p>
                    <ul className="text-slate-400 text-[10px] space-y-1.5">
                        <li>• Click transaction links to verify on-chain</li>
                        <li>• Show balance matches on Explorer</li>
                        <li>• Demonstrate emergency withdrawal</li>
                        <li>• Explain 14.5% APY (Blend + Aqua)</li>
                    </ul>
                </div>
            </div>
        </motion.div>
    );
}
