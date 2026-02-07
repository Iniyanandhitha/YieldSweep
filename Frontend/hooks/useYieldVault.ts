import { useState, useEffect, useCallback } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
    isConnected,
    requestAccess,
    getAddress,
    signTransaction,
} from '@stellar/freighter-api';
import { CONTRACT_ID, RPC_URL, NETWORK_PASSPHRASE, USDC_CONTRACT } from '../constants';

const { Address, Contract, TransactionBuilder, nativeToScVal, Horizon, scValToNative } = StellarSdk;

// Horizon server for fetching account balances (use testnet)
const horizonServer = new Horizon.Server('https://horizon-testnet.stellar.org');

// Soroban RPC server for contract interactions
const sorobanServer = new StellarSdk.rpc.Server(RPC_URL);

// Create contract instance
let contract: StellarSdk.Contract | null = null;
try {
    contract = new Contract(CONTRACT_ID);
    console.log('Contract initialized:', CONTRACT_ID);
} catch (e) {
    console.warn('Failed to initialize contract:', e);
}

export type TransactionHistoryItem = {
    type: 'Sweep' | 'Withdraw' | 'Deposit' | 'Limit Set' | 'Contract Call';
    amount: number;
    status: string;
    time: string;
    hash: string;
};

export const useYieldVault = () => {
    const [hasFreighter, setHasFreighter] = useState(false);
    const [userAddress, setUserAddress] = useState<string>('');
    const [balance, setBalance] = useState<number>(0); // Real XLM balance from wallet
    const [usdcBalance, setUsdcBalance] = useState<number>(0); // Real USDC balance
    const [vaultBalance, setVaultBalance] = useState<number>(0); // Amount swept to yield vault
    const [safetyLimit, setSafetyLimit] = useState<number>(0); // Safety limit from contract
    const [totalSwept, setTotalSwept] = useState<number>(0); // Total amount swept historically
    const [history, setHistory] = useState<TransactionHistoryItem[]>([]); // Real transaction history
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isContractInitialized, setIsContractInitialized] = useState<boolean>(false); // Default false for safety

    // Fetch real balance from Horizon
    const fetchWalletBalance = useCallback(async (address: string) => {
        try {
            console.log('Fetching wallet balance for:', address);
            const account = await horizonServer.loadAccount(address);

            let xlmBalance = 0;
            let usdc = 0;

            account.balances.forEach((bal: any) => {
                if (bal.asset_type === 'native') {
                    xlmBalance = parseFloat(bal.balance);
                }
                if (bal.asset_code === 'USDC' || bal.asset_code === 'USD') {
                    usdc = parseFloat(bal.balance);
                }
            });

            setBalance(xlmBalance);
            setUsdcBalance(usdc);
            return { xlmBalance, usdc };
        } catch (e: any) {
            console.error('Error fetching wallet balance:', e);
            if (e.response?.status === 404) {
                setError('Account not found on testnet. Fund it at friendbot.stellar.org');
                setBalance(0);
                setUsdcBalance(0);
            }
            return { xlmBalance: 0, usdc: 0 };
        }
    }, []);

    // Fetch account transaction history from Horizon
    const fetchHistory = useCallback(async (address: string) => {
        try {
            const resp = await horizonServer.transactions().forAccount(address).limit(10).order("desc").call();

            const historyItems: TransactionHistoryItem[] = resp.records.map((record: any) => {
                // Heuristic to determine type
                let type: TransactionHistoryItem['type'] = 'Contract Call';
                let amount = 0;

                // Simple time formatting
                const date = new Date(record.created_at);
                const timeDiff = (new Date().getTime() - date.getTime()) / 1000;
                let timeStr = 'Just now';
                if (timeDiff < 60) timeStr = `${Math.floor(timeDiff)}s ago`;
                else if (timeDiff < 3600) timeStr = `${Math.floor(timeDiff / 60)}m ago`;
                else if (timeDiff < 86400) timeStr = `${Math.floor(timeDiff / 3600)}h ago`;
                else timeStr = date.toLocaleDateString();

                return {
                    type,
                    amount,
                    status: record.successful ? 'Success' : 'Failed',
                    time: timeStr,
                    hash: record.hash.substring(0, 8) + '...'
                };
            });
            setHistory(historyItems);
        } catch (e) {
            console.warn('Failed to fetch history:', e);
        }
    }, []);

    // Fetch user data from smart contract
    const fetchContractData = useCallback(async (address: string) => {
        if (!contract) return;

        try {
            // Check if contract is initialized first
            try {
                const account = await sorobanServer.getAccount(address);
                const initTx = new TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
                    .addOperation(contract.call('is_initialized'))
                    .setTimeout(30).build();
                const initSim = await sorobanServer.simulateTransaction(initTx);

                // Type guard for successful simulation response
                if ('result' in initSim && initSim.result && 'retval' in (initSim.result as any)) {
                    const initialized = scValToNative((initSim.result as any).retval);
                    setIsContractInitialized(!!initialized);
                    if (!initialized) return; // Don't fetch user config if not initialized
                }
            } catch (e) {
                // Ignore init check errors, assume initialized or will fail later
                console.warn("Init check failed:", e);
            }

            // Fetch User Config
            const account = await sorobanServer.getAccount(address);
            const tx = new TransactionBuilder(account, {
                fee: '100',
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(
                    contract.call(
                        'get_user_config',
                        new Address(address).toScVal()
                    )
                )
                .setTimeout(30)
                .build();

            const simResult = await sorobanServer.simulateTransaction(tx);

            // Type guard for successful simulation response
            if ('result' in simResult && simResult.result && 'retval' in (simResult.result as any)) {
                const data = scValToNative((simResult.result as any).retval);
                if (data.safety_limit !== undefined) {
                    setSafetyLimit(Number(data.safety_limit) / 10000000);
                }
                if (data.deposited !== undefined) {
                    setVaultBalance(Number(data.deposited) / 10000000);
                }
            }
        } catch (e: any) {
            console.log('Contract read error (likely user not enrolled):', e.message);
        }
    }, []);

    // Check for Freighter on mount
    useEffect(() => {
        const checkFreighter = async () => {
            try {
                const connected = await isConnected();
                if (connected) {
                    setHasFreighter(true);
                    try {
                        const addressResult = await getAddress();
                        if (addressResult.address) {
                            setUserAddress(addressResult.address);
                            await fetchWalletBalance(addressResult.address);
                            await fetchContractData(addressResult.address);
                            await fetchHistory(addressResult.address); // Fetch real history
                        }
                    } catch (e) {
                        console.log('No existing connection');
                    }
                }
            } catch (e) {
                console.error('Error checking Freighter:', e);
            }
        };
        setTimeout(checkFreighter, 500);
    }, [fetchWalletBalance, fetchContractData, fetchHistory]);

    // Connect Wallet
    const connectWallet = async () => {
        setError(null);
        setIsLoading(true);

        try {
            const connected = await isConnected();
            if (!connected) {
                setError('Freighter wallet not detected.');
                setIsLoading(false);
                return;
            }

            setHasFreighter(true);
            const accessResult = await requestAccess();
            if (accessResult.error) {
                setError(accessResult.error);
                return;
            }

            const addressResult = await getAddress();
            if (addressResult.error || !addressResult.address) {
                setError(addressResult.error || 'Could not get wallet address');
                return;
            }

            setUserAddress(addressResult.address);
            await fetchWalletBalance(addressResult.address);
            await fetchContractData(addressResult.address);
            await fetchHistory(addressResult.address);

        } catch (e: any) {
            console.error('Error connecting wallet:', e);
            setError(e.message || 'Failed to connect wallet');
        } finally {
            setIsLoading(false);
        }
    };

    // Disconnect wallet
    const disconnectWallet = () => {
        setUserAddress('');
        setBalance(0);
        setUsdcBalance(0);
        setVaultBalance(0);
        setSafetyLimit(0);
        setTotalSwept(0);
        setHistory([]);
        setError(null);
    };

    const refreshData = async () => {
        if (userAddress) {
            setIsLoading(true);
            await fetchWalletBalance(userAddress);
            await fetchContractData(userAddress);
            await fetchHistory(userAddress);
            setIsLoading(false);
        }
    };

    const initializeVault = async () => {
        if (!userAddress || !contract) return;
        try {
            setIsLoading(true);
            const account = await sorobanServer.getAccount(userAddress);
            const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(contract.call('init',
                    new Address(userAddress).toScVal(), // Admin
                    new Address(USDC_CONTRACT).toScVal() // Token
                ))
                .setTimeout(30).build();
            const preparedTx = await sorobanServer.prepareTransaction(tx);
            const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
            if (signResult.error) throw new Error(signResult.error);
            const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
            await sorobanServer.sendTransaction(signedTx);
            // Assume success after short wait (simplification)
            await new Promise(r => setTimeout(r, 4000));
            setIsContractInitialized(true);
            await refreshData();
        } catch (e: any) {
            setError('Failed to initialize contract: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Set Safety Limit on contract
    const updateSafetyLimit = async (limit: number) => {
        if (!userAddress || !contract) return;
        setError(null);

        try {
            setIsLoading(true);
            const account = await sorobanServer.getAccount(userAddress);
            const limitInStroops = BigInt(Math.floor(limit * 10000000));

            const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(contract.call('set_safety_limit', new Address(userAddress).toScVal(), nativeToScVal(limitInStroops, { type: 'i128' })))
                .setTimeout(30).build();

            const preparedTx = await sorobanServer.prepareTransaction(tx);
            const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
            if (signResult.error) throw new Error(signResult.error);

            const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
            const result = await sorobanServer.sendTransaction(signedTx);

            if (result.status === 'ERROR') throw new Error('Transaction failed');

            // Optimistic update
            setSafetyLimit(limit);

            // Wait a bit then refresh
            setTimeout(() => refreshData(), 4000);

        } catch (e: any) {
            console.error('Error updating safety limit:', e);
            setError(e.message);

            // Check if it's the NotInitialized error (often obscured, but worth checking)
            // Error #2 handling could be done here if we parse simulation logs, but relies on 'simulateTransaction'
        } finally {
            setIsLoading(false);
        }
    };

    // Sweep excess funds to yield vault
    const sweep = async () => {
        if (!userAddress || !contract) return;
        setError(null);
        try {
            setIsLoading(true);
            const account = await sorobanServer.getAccount(userAddress);
            const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(contract.call('sweep', new Address(userAddress).toScVal()))
                .setTimeout(30).build();

            const preparedTx = await sorobanServer.prepareTransaction(tx);
            const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
            if (signResult.error) throw new Error(signResult.error);
            const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
            await sorobanServer.sendTransaction(signedTx);
            setTimeout(() => refreshData(), 4000);
            return true;
        } catch (e: any) {
            console.error('Error during sweep:', e);
            setError(e.message || 'Sweep failed');
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    // Emergency exit: withdraw all funds from vault back to wallet
    const withdrawAll = async () => {
        if (!userAddress || !contract) return;
        setError(null);
        try {
            setIsLoading(true);
            const account = await sorobanServer.getAccount(userAddress);
            const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(contract.call('withdraw_all', new Address(userAddress).toScVal()))
                .setTimeout(30).build();

            const preparedTx = await sorobanServer.prepareTransaction(tx);
            const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
            if (signResult.error) throw new Error(signResult.error);
            const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
            await sorobanServer.sendTransaction(signedTx);
            setTimeout(() => refreshData(), 4000);
            return true;
        } catch (e: any) {
            console.error('Error during withdraw_all:', e);
            setError(e.message || 'Emergency withdrawal failed');
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    // Demo simulation: visually "receive" funds and trigger sweep
    const simulateIncomingPayment = async (amount: number = 100) => {
        // For demo purposes, this shows a visual effect of funds arriving
        // In reality, on testnet you'd fund via friendbot or a test wallet
        console.log(`[DEMO] Simulating incoming payment of ${amount} XLM...`);

        // Add to balance optimistically for visual effect
        const previousBalance = balance;
        setBalance(prev => prev + amount);

        // Wait for visual effect, then trigger sweep if above limit
        await new Promise(r => setTimeout(r, 1500));

        if (balance + amount > safetyLimit && safetyLimit > 0) {
            console.log('[DEMO] Excess detected, triggering sweep...');
            try {
                await sweep();
            } catch (e) {
                // Reset balance if sweep fails
                setBalance(previousBalance);
            }
        }

        // Refresh real data
        await refreshData();
    };

    const sweepableAmount = Math.max(0, balance - safetyLimit);

    return {
        hasFreighter,
        userAddress,
        connectWallet,
        disconnectWallet,
        balance,
        usdcBalance,
        vaultBalance,
        safetyLimit,
        sweepableAmount,
        totalSwept,
        history,
        updateSafetyLimit,
        sweep,
        withdrawAll,
        simulateIncomingPayment,
        refreshData,
        isLoading,
        error,
        isContractInitialized,
        initializeVault
    };
};
