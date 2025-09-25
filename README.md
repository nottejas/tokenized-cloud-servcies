# GPU Token System

A complete Ethereum-based system for purchasing, managing, and redeeming GPU compute hours using ERC20 tokens. This project includes a smart contract, deployment scripts, interaction scripts, and a React frontend.

## Project Structure

- `contracts/`: Solidity smart contracts
  - `GPUToken.sol`: Main ERC20 token contract for GPU compute hours
- `scripts/`: Deployment and interaction scripts
  - `deploy.js`: Deploy the GPU Token contract
  - `buy.js`: Purchase GPU hours
  - `stats.js`: View contract statistics
  - `token-actions.js`: Redeem GPU hours
  - `update-frontend.js`: Update frontend with contract address
- `gpu-token-frontend/`: React frontend application

## Prerequisites

- Node.js and npm
- Ganache (GUI or CLI) for local Ethereum development
- MetaMask browser extension

## Setup and Deployment

### 1. Install Dependencies

```shell
npm install
```

### 2. Start Ganache

Start Ganache GUI or run:

```shell
npx ganache-cli
```

### 3. Deploy the Contract

```shell
npx hardhat run scripts/deploy.js --network ganache
```

Note the deployed contract address from the output.

### 4. Update Frontend Configuration

Update the frontend with your contract address:

```shell
npx hardhat run scripts/update-frontend.js -- YOUR_CONTRACT_ADDRESS
```

Replace `YOUR_CONTRACT_ADDRESS` with the address from step 3.

### 5. Install Frontend Dependencies

```shell
cd gpu-token-frontend
npm install
```

### 6. Start the Frontend

```shell
npm run dev
```

Open your browser to the URL shown in the terminal (usually http://localhost:5173).

## Using the System

### Smart Contract Interaction (CLI)

1. **Purchase GPU Hours**:
   ```shell
   npx hardhat run scripts/buy.js --network ganache
   ```

2. **View Statistics**:
   ```shell
   npx hardhat run scripts/stats.js --network ganache
   ```

3. **Redeem GPU Hours**:
   ```shell
   npx hardhat run scripts/token-actions.js redeem 5 --network ganache
   ```

### Frontend Interaction

1. Connect your MetaMask wallet to Ganache
2. Use the web interface to:
   - View contract statistics
   - Check your token balance
   - Purchase GPU hours
   - Redeem tokens for compute time

## Smart Contract Features

- ERC20 token representing GPU compute hours
- Purchase tokens with ETH
- Redeem tokens for GPU compute time
- Track GPU hours used by address
- Owner can update token price
- Pausable functionality for emergency situations

## Development

### Running Tests

```shell
npx hardhat test
```

### Hardhat Tasks

```shell
npx hardhat help
```
