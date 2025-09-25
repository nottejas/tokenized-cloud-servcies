// Script to update the frontend with both GPUToken and GPUFutures contract ABIs
const { execSync } = require('child_process');
const path = require('path');

async function main() {
  try {
    console.log('🔄 Updating frontend with GPUToken contract information...');
    execSync('npx hardhat run scripts/update-frontend.js', { stdio: 'inherit' });
    
    console.log('\n🔄 Updating frontend with GPUFutures contract information...');
    execSync('npx hardhat run scripts/update-frontend-futures.js', { stdio: 'inherit' });
    
    console.log('\n✅ All frontend updates completed successfully!');
  } catch (error) {
    console.error('❌ Error updating frontend:', error);
  }
}

// Execute the update
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });