const fs = require('fs');
const path = require('path');

/**
 * This script updates the contract address in the frontend .env file
 * Run this after deploying the contract to update the frontend configuration
 */
async function main() {
  try {
    // Get contract address from command line arguments
    const contractAddress = process.argv[2];
    
    if (!contractAddress) {
      console.error('❌ Please provide a contract address as an argument');
      console.log('Usage: npx hardhat run scripts/update-frontend.js -- 0xYourContractAddress');
      return;
    }
    
    // Path to frontend .env file
    const envPath = path.join(__dirname, '..', 'gpu-token-frontend', '.env');
    
    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
      console.log('📝 Creating new .env file...');
      
      // Default content for new .env file
      const defaultContent = `# GPU Token Frontend Environment Variables

# Contract address (update after deployment)
VITE_CONTRACT_ADDRESS="${contractAddress}"

# Network configuration
VITE_NETWORK_ID="5777"
VITE_NETWORK_NAME="Ganache"
VITE_RPC_URL="http://127.0.0.1:7545"
`;
      
      fs.writeFileSync(envPath, defaultContent);
      console.log('✅ Created new .env file with contract address:', contractAddress);
    } else {
      console.log('📝 Updating existing .env file...');
      
      // Read existing .env file
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Replace contract address
      envContent = envContent.replace(
        /VITE_CONTRACT_ADDRESS="(.*?)"/,
        `VITE_CONTRACT_ADDRESS="${contractAddress}"`
      );
      
      // Write updated content back to file
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Updated contract address to:', contractAddress);
    }
    
    console.log('🚀 Frontend configuration updated successfully!');
    console.log('💡 Next steps:');
    console.log('   1. Start the frontend: cd gpu-token-frontend && npm run dev');
    console.log('   2. Connect your MetaMask wallet to Ganache');
    console.log('   3. Interact with your contract through the UI');
    
  } catch (error) {
    console.error('❌ Error updating frontend configuration:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });