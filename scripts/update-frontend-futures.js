// Script to update the frontend with the GPUFutures contract ABI
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  try {
    // Get the contract address from .env file
    const futuresContractAddress = process.env.FUTURES_CONTRACT_ADDRESS;
    
    if (!futuresContractAddress) {
      console.error('❌ No futures contract address found in .env file');
      console.log('Please add FUTURES_CONTRACT_ADDRESS=0xYourFuturesContractAddress to your .env file');
      return;
    }
    
    // Get the contract artifacts
    const GPUFuturesArtifact = require('../artifacts/contracts/GPUFutures.sol/GPUFutures.json');
    
    // Create a simplified ABI file for the frontend
    const abiFile = {
      abi: GPUFuturesArtifact.abi,
      address: futuresContractAddress
    };
    
    // Write the ABI to the frontend directory
    const frontendDir = path.join(__dirname, '../gpu-token-frontend/src');
    fs.writeFileSync(
      path.join(frontendDir, 'GPUFutures.json'),
      JSON.stringify(abiFile, null, 2)
    );
    
    console.log('✅ Frontend updated with GPUFutures ABI and address:', futuresContractAddress);
    console.log('🚀 Frontend configuration updated successfully!');
  } catch (error) {
    console.error('❌ Error updating frontend configuration:', error);
  }
}

// Execute the update
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });