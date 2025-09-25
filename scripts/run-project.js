// Script to run the entire project setup in sequence
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // Step 1: Compile contracts
    console.log('📝 Compiling smart contracts...');
    execSync('npm run compile', { stdio: 'inherit' });
    
    // Step 2: Deploy contracts
    console.log('\n🚀 Deploying contracts to local network...');
    execSync('npm run deploy:futures:ganache', { stdio: 'inherit' });
    
    // Step 3: Update frontend
    console.log('\n🔄 Updating frontend configuration...');
    execSync('npm run update:frontend', { stdio: 'inherit' });
    
    // Step 4: Start frontend
    console.log('\n🌐 Starting frontend development server...');
    process.chdir(path.join(__dirname, '..', 'gpu-token-frontend'));
    execSync('npm run dev', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error running project:', error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });