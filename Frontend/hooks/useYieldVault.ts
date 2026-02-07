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

// Helper function to parse contract errors and provide user-friendly messages
const parseContractError = (error: any): string => {
    const errorStr = error?.message || error?.toString() || '';

    // Check for specific contract error codes
    if (errorStr.includes('Error(Contract, #2)') || errorStr.includes('NotInitialized')) {
        return 'Contract not initialized. Please click "Initialize Now" at the top of the dashboard.';
    }
    if (errorStr.includes('Error(Contract, #3)') || errorStr.includes('UserNotConfigured')) {
        return 'Please set your safety limit first before sweeping funds.';
    }
    if (errorStr.includes('Error(Contract, #6)') || errorStr.includes('NoExcessFunds')) {
        return 'No excess funds to sweep. Your balance is at or below your safety limit.';
    }
    if (errorStr.includes('Error(Contract, #4)') || errorStr.includes('InsufficientBalance')) {
        return 'Insufficient balance in vault for this withdrawal.';
    }
    if (errorStr.includes('Error(Contract, #5)') || errorStr.includes('InvalidAmount')) {
        return 'Invalid amount. Please enter a positive value.';
    }
    if (errorStr.includes('Error(Contract, #9)') || errorStr.includes('BlendNotConfigured')) {
        return 'Blend pool integration is not configured. This is optional and doesn\'t affect basic functionality.';
    }
    if (errorStr.includes('Error(Contract, #1)') || errorStr.includes('AlreadyInitialized')) {
        return 'Contract is already initialized.';
    }

    // Return original error if we can't parse it
    return errorStr;
};

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

// Helper function to format Freighter error responses
const formatFreighterError = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    try {
        return JSON.stringify(error);
    } catch {
        return 'Unknown error occurred';
    }
};

// Helper to check if user rejected the transaction
const isUserRejection = (error: any): boolean => {
    if (typeof error === 'object' && error !== null) {
        // Freighter returns code -4 for user rejection
        if (error.code === -4 || error.code === '-4') return true;
        if (error.message?.includes('rejected') || error.message?.includes('declined')) return true;
    }
    if (typeof error === 'string') {
        return error.includes('rejected') || error.includes('declined') || error.includes('User canceled');
    }
    return false;
};

export type TransactionHistoryItem = {
    type: 'Sweep' | 'Withdraw' | 'Deposit' | 'Limit Set' | 'Contract Call';
    amount: number;
    status: string;
    time: string;
    hash: string;
};

export type TransactionNotification = {
    message: string;
    hash?: string;
    explorerUrl?: string;
    type: 'success' | 'error' | 'info';
};

export const useYieldVault = () => {
    const [hasFreighter, setHasFreighter] = useState(false);
    const [userAddress, setUserAddress] = useState<string>('');
    const [balance, setBalance] = useState<number>(0); // Real XLM balance from wallet
    const [usdcBalance, setUsdcBalance] = useState<number>(0); // Real USDC balance
    const [vaultBalance, setVaultBalance] = useState<number>(0); // Amount swept to yield vault
    const [safetyLimit, setSafetyLimit] = useState<number>(0); // Safety limit from contract
    const [totalSwept, setTotalSwept] = useState<number>(0); // Total amount swept historically
    const [investedAmount, setInvestedAmount] = useState<number>(0); // Amount invested in Blend
    const [totalVaultDeposits, setTotalVaultDeposits] = useState<number>(0); // Total deposits across all users
    const [totalInvested, setTotalInvested] = useState<number>(0); // Total invested in Blend across all users
    const [history, setHistory] = useState<TransactionHistoryItem[]>([]); // Real transaction history
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isContractInitialized, setIsContractInitialized] = useState<boolean>(false); // Default false for safety
    const [lastTransactionHash, setLastTransactionHash] = useState<string>(''); // Track last transaction for explorer link
    const [transactionNotification, setTransactionNotification] = useState<TransactionNotification | null>(null);

    // Liquid Restaking APY tracking
    const [blendAPY, setBlendAPY] = useState<number>(5.0); // Mock Blend APY
    const [aquaAPY, setAquaAPY] = useState<number>(9.5); // Mock Aqua APY
    const [totalAPY, setTotalAPY] = useState<number>(14.5); // Combined APY
    const [projectedMonthlyEarnings, setProjectedMonthlyEarnings] = useState<number>(0);

    // Calculate projected earnings whenever vault balance or APY changes
    useEffect(() => {
        const monthlyEarnings = (vaultBalance * (totalAPY / 100)) / 12;
        setProjectedMonthlyEarnings(monthlyEarnings);
    }, [vaultBalance, totalAPY]);

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
                // If init check fails, assume not initialized to be safe
                console.warn("Init check failed, assuming not initialized:", e);
                setIsContractInitialized(false);
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
                    const limitValue = Number(data.safety_limit) / 10000000;
                    console.log('✅ Safety limit from contract:', limitValue);
                    setSafetyLimit(limitValue);
                }
                if (data.deposited !== undefined) {
                    const depositedValue = Number(data.deposited) / 10000000;
                    console.log('✅ Vault balance from contract:', depositedValue);
                    setVaultBalance(depositedValue);
                }
                if (data.invested !== undefined) {
                    const investedValue = Number(data.invested) / 10000000;
                    console.log('✅ Invested in Blend:', investedValue);
                    setInvestedAmount(investedValue);
                }
            }
        } catch (e: any) {
            const friendlyError = parseContractError(e);
            console.log('Contract read error:', friendlyError);
            // Don't set error state here - this is expected for new users
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
            if (signResult.error) {
                if (isUserRejection(signResult.error)) {
                    console.log('ℹ️  User canceled transaction');
                    return; // Exit gracefully
                }
                throw new Error(formatFreighterError(signResult.error));
            }
            const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
            await sorobanServer.sendTransaction(signedTx);
            // Assume success after short wait (simplification)
            await new Promise(r => setTimeout(r, 4000));
            setIsContractInitialized(true);
            await refreshData();
        } catch (e: any) {
            const friendlyError = parseContractError(e);
            setError('Failed to initialize contract: ' + friendlyError);
            console.error('Initialization error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    // Approve the contract to spend user's tokens
    const approveTokenSpending = async (amount: number) => {
        if (!userAddress) return false;

        try {
            console.log('🔐 Approving contract to spend tokens...');

            // Create token contract client
            const tokenContract = new Contract(USDC_CONTRACT);
            const account = await sorobanServer.getAccount(userAddress);

            // Convert amount to stroops (7 decimals for XLM/USDC)
            const amountInStroops = BigInt(Math.floor(amount * 10000000));

            // Get current ledger to set expiration
            const latestLedger = await sorobanServer.getLatestLedger();
            const expirationLedger = latestLedger.sequence + 100000; // ~5.5 days in the future

            // Build approval transaction
            const tx = new TransactionBuilder(account, {
                fee: '100',
                networkPassphrase: NETWORK_PASSPHRASE
            })
                .addOperation(tokenContract.call(
                    'approve',
                    new Address(userAddress).toScVal(),           // from (user)
                    new Address(CONTRACT_ID).toScVal(),           // spender (contract)
                    nativeToScVal(amountInStroops, { type: 'i128' }), // amount
                    nativeToScVal(expirationLedger, { type: 'u32' }) // expiration ledger
                ))
                .setTimeout(30)
                .build();

            const preparedTx = await sorobanServer.prepareTransaction(tx);
            const signResult = await signTransaction(preparedTx.toXDR(), {
                networkPassphrase: NETWORK_PASSPHRASE
            });

            if (signResult.error) {
                if (isUserRejection(signResult.error)) {
                    console.log('ℹ️  User canceled token approval');
                    return false; // Exit gracefully
                }
                console.error('❌ Approval signing failed:', formatFreighterError(signResult.error));
                return false;
            }

            const signedTx = TransactionBuilder.fromXDR(
                signResult.signedTxXdr,
                NETWORK_PASSPHRASE
            );

            const sendResult = await sorobanServer.sendTransaction(signedTx);

            // Wait for transaction confirmation
            if (sendResult.status === 'PENDING' || sendResult.status === 'DUPLICATE') {
                let attempts = 0;
                let getResult = await sorobanServer.getTransaction(sendResult.hash);

                while (getResult.status === 'NOT_FOUND' && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    getResult = await sorobanServer.getTransaction(sendResult.hash);
                    attempts++;
                }

                if (getResult.status === 'SUCCESS') {
                    console.log('✅ Token spending approved!');
                    return true;
                } else {
                    console.error('❌ Approval transaction failed:', getResult.status);
                    return false;
                }
            }

            return false;
        } catch (e: any) {
            console.error('❌ Error approving tokens:', e);
            return false;
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

            if (signResult.error) {
                if (isUserRejection(signResult.error)) {
                    console.log('ℹ️  User canceled safety limit update');
                    return false;
                }
                throw new Error(formatFreighterError(signResult.error));
            }

            const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
            const sendResult = await sorobanServer.sendTransaction(signedTx);

            // Check if transaction was submitted successfully
            if (sendResult.status === 'PENDING' || sendResult.status === 'DUPLICATE') {
                // Wait for transaction to be confirmed
                let getResult = await sorobanServer.getTransaction(sendResult.hash);
                let attempts = 0;

                while (getResult.status === 'NOT_FOUND' && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    getResult = await sorobanServer.getTransaction(sendResult.hash);
                    attempts++;
                }

                if (getResult.status === 'SUCCESS') {
                    // Optimistic update
                    setSafetyLimit(limit);
                    console.log('✅ Safety limit updated to:', limit);
                    console.log('ℹ️  Note: Vault balance will only increase after you click "Sweep" or enable Auto-Sweep');
                    
                    // Store transaction hash for explorer link
                    setLastTransactionHash(sendResult.hash);
                    setTransactionNotification({
                        message: `Safety limit updated to ${limit} XLM`,
                        hash: sendResult.hash,
                        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${sendResult.hash}`,
                        type: 'success'
                    });

                    // Wait a bit then refresh
                    setTimeout(() => refreshData(), 2000);
                } else if (getResult.status === 'FAILED') {
                    throw new Error('Transaction failed on-chain');
                } else {
                    throw new Error('Transaction status unknown');
                }
            } else if (sendResult.status === 'ERROR') {
                throw new Error('Transaction submission failed');
            }

        } catch (e: any) {
            console.error('Error updating safety limit:', e);

            // Check for user rejection
            if (e.message?.includes('User declined') || e.message?.includes('rejected')) {
                setError('Transaction was rejected. Please try again.');
            } else {
                const friendlyError = parseContractError(e);
                setError(friendlyError);
            }
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

            // First, approve the contract to spend tokens
            console.log('📝 Step 1: Approving token spending...');
            const approved = await approveTokenSpending(sweepableAmount + 100); // Approve a bit extra for safety
            if (!approved) {
                throw new Error('Token approval failed. Please try again.');
            }

            console.log('📝 Step 2: Executing sweep...');
            const account = await sorobanServer.getAccount(userAddress);
            const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(contract.call('sweep', new Address(userAddress).toScVal()))
                .setTimeout(30).build();

            const preparedTx = await sorobanServer.prepareTransaction(tx);
            const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
            if (signResult.error) {
                if (isUserRejection(signResult.error)) {
                    console.log('ℹ️  User canceled sweep');
                    return false;
                }
                throw new Error(formatFreighterError(signResult.error));
            }
            const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
            await sorobanServer.sendTransaction(signedTx);
            setTimeout(() => refreshData(), 4000);
            return true;
        } catch (e: any) {
            console.error('Error during sweep:', e);
            const friendlyError = parseContractError(e);
            setError(friendlyError);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    // Atomic Liquid Restaking: Trigger sweep to Blend + Aquarius
    const triggerAtomicSweep = async () => {
        if (!userAddress || !contract) return;
        setError(null);
        try {
            setIsLoading(true);

            // First, approve the contract to spend tokens
            console.log('🔐 Step 1: Approving token spending for atomic sweep...');
            const approved = await approveTokenSpending(sweepableAmount + 100);
            if (!approved) {
                throw new Error('Token approval failed. Please try again.');
            }

            console.log('⚡ Step 2: Executing atomic sweep (Blend + Aquarius)...');
            const account = await sorobanServer.getAccount(userAddress);

            // Call check_and_sweep function
            const tx = new TransactionBuilder(account, {
                fee: '100',
                networkPassphrase: NETWORK_PASSPHRASE
            })
                .addOperation(contract.call(
                    'check_and_sweep',
                    new Address(userAddress).toScVal()
                ))
                .setTimeout(30)
                .build();

            const preparedTx = await sorobanServer.prepareTransaction(tx);
            const signResult = await signTransaction(preparedTx.toXDR(), {
                networkPassphrase: NETWORK_PASSPHRASE
            });

            if (signResult.error) {
                if (isUserRejection(signResult.error)) {
                    console.log('ℹ️  User canceled atomic sweep');
                    return false;
                }
                throw new Error(formatFreighterError(signResult.error));
            }

            const signedTx = TransactionBuilder.fromXDR(
                signResult.signedTxXdr,
                NETWORK_PASSPHRASE
            );

            const sendResult = await sorobanServer.sendTransaction(signedTx);

            // Store transaction hash
            setLastTransactionHash(sendResult.hash);
            setTransactionNotification({
                message: 'Atomic sweep to Blend + Aquarius completed',
                hash: sendResult.hash,
                explorerUrl: `https://stellar.expert/explorer/testnet/tx/${sendResult.hash}`,
                type: 'success'
            });

            // Refresh data after successful sweep
            setTimeout(() => refreshData(), 4000);
            return true;
        } catch (e: any) {
            console.error('Error during atomic sweep:', e);
            const friendlyError = parseContractError(e);
            setError(friendlyError);
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
            if (signResult.error) {
                if (isUserRejection(signResult.error)) {
                    console.log('ℹ️  User canceled emergency withdrawal');
                    return false;
                }
                throw new Error(formatFreighterError(signResult.error));
            }
            const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
            await sorobanServer.sendTransaction(signedTx);
            setTimeout(() => refreshData(), 4000);
            return true;
        } catch (e: any) {
            console.error('Error during withdraw_all:', e);
            const friendlyError = parseContractError(e);
            setError(friendlyError);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    // Manual deposit funds into the vault
    const deposit = async (amount: number) => {
        if (!userAddress || !contract) return;
        setError(null);

        try {
            setIsLoading(true);
            const account = await sorobanServer.getAccount(userAddress);
            const amountInStroops = BigInt(Math.floor(amount * 10000000));

            // First approve the contract to spend tokens
            const approved = await approveTokenSpending(amount + 10); // Approve a bit extra
            if (!approved) {
                console.log('ℹ️  Deposit canceled - token approval not completed');
                return false;
            }

            const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(contract.call('deposit',
                    new Address(userAddress).toScVal(),
                    nativeToScVal(amountInStroops, { type: 'i128' })
                ))
                .setTimeout(30).build();

            const preparedTx = await sorobanServer.prepareTransaction(tx);
            const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });

            if (signResult.error) {
                if (isUserRejection(signResult.error)) {
                    console.log('ℹ️  User canceled deposit');
                    return false;
                }
                const errorMsg = formatFreighterError(signResult.error);
                throw new Error(errorMsg);
            }

            const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
            const sendResult = await sorobanServer.sendTransaction(signedTx);

            if (sendResult.status === 'PENDING' || sendResult.status === 'DUPLICATE') {
                let getResult = await sorobanServer.getTransaction(sendResult.hash);
                let attempts = 0;

                while (getResult.status === 'NOT_FOUND' && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    getResult = await sorobanServer.getTransaction(sendResult.hash);
                    attempts++;
                }

                if (getResult.status === 'SUCCESS') {
                    console.log('✅ Deposit successful:', amount);
                    setTimeout(() => refreshData(), 2000);
                    return true;
                } else {
                    throw new Error('Deposit transaction failed on-chain');
                }
            }
            return false;
        } catch (e: any) {
            console.error('Error during deposit:', e);
            const friendlyError = parseContractError(e);
            setError(friendlyError);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    // Partial withdraw from vault
    const withdraw = async (amount: number) => {
        if (!userAddress || !contract) return;
        setError(null);

        try {
            setIsLoading(true);
            const account = await sorobanServer.getAccount(userAddress);
            const amountInStroops = BigInt(Math.floor(amount * 10000000));

            const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(contract.call('withdraw',
                    new Address(userAddress).toScVal(),
                    nativeToScVal(amountInStroops, { type: 'i128' })
                ))
                .setTimeout(30).build();

            const preparedTx = await sorobanServer.prepareTransaction(tx);
            const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });

            if (signResult.error) {
                if (isUserRejection(signResult.error)) {
                    console.log('ℹ️  User canceled withdrawal');
                    return false;
                }
                const errorMsg = formatFreighterError(signResult.error);
                throw new Error(errorMsg);
            }

            const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
            const sendResult = await sorobanServer.sendTransaction(signedTx);

            if (sendResult.status === 'PENDING' || sendResult.status === 'DUPLICATE') {
                let getResult = await sorobanServer.getTransaction(sendResult.hash);
                let attempts = 0;

                while (getResult.status === 'NOT_FOUND' && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    getResult = await sorobanServer.getTransaction(sendResult.hash);
                    attempts++;
                }

                if (getResult.status === 'SUCCESS') {
                    console.log('✅ Withdrawal successful:', amount);
                    setTimeout(() => refreshData(), 2000);
                    return true;
                } else {
                    throw new Error('Withdrawal transaction failed on-chain');
                }
            }
            return false;
        } catch (e: any) {
            console.error('Error during withdrawal:', e);
            const friendlyError = parseContractError(e);
            setError(friendlyError);
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
        investedAmount,
        totalVaultDeposits,
        totalInvested,
        history,
        updateSafetyLimit,
        sweep,
        deposit,
        withdraw,
        triggerAtomicSweep, // NEW: Atomic liquid restaking function
        withdrawAll,
        simulateIncomingPayment,
        refreshData,
        isLoading,
        error,
        isContractInitialized,
        initializeVault,
        // Liquid Restaking APY data
        blendAPY,
        aquaAPY,
        totalAPY,
        projectedMonthlyEarnings,
        // Transaction tracking for demo
        lastTransactionHash,
        transactionNotification,
        setTransactionNotification,
    };
};
