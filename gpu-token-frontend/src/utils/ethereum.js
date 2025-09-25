import { ethers } from 'ethers';
import GPUTokenABI from '../GPUToken.json';

// Environment variables
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const NETWORK_ID = import.meta.env.VITE_NETWORK_ID;
const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME;
const RPC_URL = import.meta.env.VITE_RPC_URL;

// Provider and contract instances
let provider;
let signer;
let contract;

// Attempt to initialize from a pre-existing global signer (set by WalletConnect)
const tryInitFromWindow = () => {
  if (typeof window === 'undefined') return;
  const evm = window.__evm;
  if (!contract && evm?.signer) {
    initializeWithSigner(evm.signer);
  }
};

/**
 * Initialize the module with an external signer (e.g., from a custom wallet flow)
 * @param {ethers.Signer} externalSigner
 */
export const initializeWithSigner = (externalSigner) => {
  if (!externalSigner) return;
  signer = externalSigner;
  // ethers v6 signer may have provider attached
  provider = externalSigner.provider || provider;
  contract = new ethers.Contract(CONTRACT_ADDRESS, GPUTokenABI.abi, signer);
};

/**
 * Connect to MetaMask wallet
 * @returns {Promise<{address: string, chainId: number}>} Connected wallet info
 */
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to use this application.');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create ethers provider
    provider = new ethers.BrowserProvider(window.ethereum);
    
    // Get network information
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Check if we're on the correct network
    if (chainId.toString() !== NETWORK_ID) {
      await switchNetwork();
    }
    
    // Get signer for transactions
    signer = await provider.getSigner();
    
    // Initialize contract
    contract = new ethers.Contract(CONTRACT_ADDRESS, GPUTokenABI.abi, signer);
    
    return {
      address: accounts[0],
      chainId: chainId
    };
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    throw error;
  }
};

/**
 * Switch to the correct network
 */
export const switchNetwork = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${parseInt(NETWORK_ID).toString(16)}` }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${parseInt(NETWORK_ID).toString(16)}`,
              chainName: NETWORK_NAME,
              rpcUrls: [RPC_URL],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
            },
          ],
        });
      } catch (addError) {
        throw addError;
      }
    } else {
      throw switchError;
    }
  }
};

/**
 * Get GPU token contract instance
 * @returns {ethers.Contract} Contract instance
 */
export const getContract = () => {
  if (!contract) {
    // Lazily initialize if an external signer was provided elsewhere
    tryInitFromWindow();
  }
  if (!contract) {
    throw new Error('Contract not initialized. Please connect wallet first.');
  }
  return contract;
};

/**
 * Get user's GPU token balance
 * @param {string} address User's address
 * @returns {Promise<string>} Formatted balance
 */
export const getBalance = async (address) => {
  const contract = getContract();
  const balance = await contract.balanceOf(address);
  return ethers.formatUnits(balance, 18);
};

/**
 * Get contract statistics
 * @returns {Promise<Object>} Contract stats
 */
export const getContractStats = async () => {
  const contract = getContract();
  
  const [name, symbol, totalSupply, pricePerToken, stats] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.totalSupply(),
    contract.pricePerToken(),
    contract.getContractStats()
  ]);
  
  return {
    name,
    symbol,
    totalSupply: ethers.formatUnits(totalSupply, 18),
    pricePerToken: ethers.formatEther(pricePerToken),
    totalAvailable: stats.totalAvailable.toString(),
    totalUsed: stats.totalUsed.toString()
  };
};

/**
 * Get user's GPU hours used
 * @param {string} address User's address
 * @returns {Promise<string>} GPU hours used
 */
export const getGPUHoursUsed = async (address) => {
  const contract = getContract();
  const hoursUsed = await contract.getGPUHoursUsed(address);
  return hoursUsed.toString();
};

/**
 * Purchase GPU hours
 * @param {number} hours Number of GPU hours to purchase
 * @returns {Promise<ethers.TransactionResponse>} Transaction response
 */
export const purchaseGPUHours = async (hours) => {
  const contract = getContract();
  const pricePerToken = await contract.pricePerToken();
  const totalCost = pricePerToken * BigInt(hours);
  
  return contract.purchaseGPUHours(hours, {
    value: totalCost
  });
};

/**
 * Redeem GPU hours
 * @param {number} hours Number of GPU hours to redeem
 * @returns {Promise<ethers.TransactionResponse>} Transaction response
 */
export const redeemGPUHours = async (hours) => {
  const contract = getContract();
  return contract.redeemGPUHours(hours);
};