# GPU Token Frontend

This is the frontend application for the GPU Token System, allowing users to interact with the GPU Token smart contract through a web interface.

## Features

- Connect to MetaMask wallet
- View contract statistics
- Check your token balance and GPU hours used
- Purchase GPU hours with ETH
- Redeem tokens for GPU compute time

## Prerequisites

- Node.js (v16+)
- npm or yarn
- MetaMask browser extension
- Running Ganache instance (or other Ethereum development network)
- Deployed GPU Token contract

## Setup

1. Install dependencies:

```bash
npm install
# or
yarn
```

2. Update the `.env` file with your deployed contract address and network settings:

```
VITE_CONTRACT_ADDRESS="YOUR_DEPLOYED_CONTRACT_ADDRESS"
VITE_NETWORK_ID="5777"  # Ganache default
VITE_NETWORK_NAME="Ganache"
VITE_RPC_URL="http://127.0.0.1:7545"  # Ganache GUI default port
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to the URL shown in the terminal (usually http://localhost:5173)

## Usage

1. **Connect Wallet**: Click the "Connect Wallet" button to connect your MetaMask wallet.

2. **View Statistics**: After connecting, you'll see your account information and contract statistics.

3. **Purchase GPU Hours**: 
   - Go to the "Purchase GPU Hours" tab
   - Enter the number of hours you want to purchase
   - Click "Purchase" and confirm the transaction in MetaMask

4. **Redeem GPU Hours**:
   - Go to the "Redeem GPU Hours" tab
   - Enter the number of hours you want to redeem
   - Click "Redeem" and confirm the transaction in MetaMask

## Development

- The frontend is built with React and Vite
- Ethereum interaction is handled through ethers.js
- The contract ABI is imported from the `GPUToken.json` file

## Troubleshooting

- **MetaMask not connecting**: Make sure you have MetaMask installed and unlocked
- **Network error**: Ensure your Ganache instance is running and the network settings in `.env` match your Ganache configuration
- **Contract not found**: Verify that the contract address in `.env` is correct and the contract is deployed on the network
