// Script to run tests and generate coverage report
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.bright}${colors.blue}=== GPU Token System Test Runner ===${colors.reset}\n`);

try {
  // Run the tests
  console.log(`${colors.cyan}Running tests...${colors.reset}`);
  const testOutput = execSync('npx hardhat test').toString();
  console.log(testOutput);
  
  console.log(`${colors.green}✅ Tests completed successfully!${colors.reset}\n`);
  
  // Check if solidity-coverage is installed
  console.log(`${colors.cyan}Checking for test coverage tools...${colors.reset}`);
  
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')));
  } catch (err) {
    console.log(`${colors.yellow}⚠️ Could not read package.json${colors.reset}`);
    process.exit(0);
  }
  
  const hasCoverage = packageJson.devDependencies && 
                     (packageJson.devDependencies['solidity-coverage'] || 
                      packageJson.dependencies && packageJson.dependencies['solidity-coverage']);
  
  if (hasCoverage) {
    console.log(`${colors.cyan}Generating coverage report...${colors.reset}`);
    execSync('npx hardhat coverage');
    console.log(`${colors.green}✅ Coverage report generated!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ solidity-coverage not found in dependencies.${colors.reset}`);
    console.log(`${colors.yellow}To install: npm install --save-dev solidity-coverage${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}${colors.green}All tests completed successfully!${colors.reset}`);
  
} catch (error) {
  console.error(`${colors.bright}${colors.red}Error running tests:${colors.reset}\n`, error.message);
  console.error(`${colors.yellow}Test output:${colors.reset}\n`, error.stdout ? error.stdout.toString() : 'No output');
  process.exit(1);
}