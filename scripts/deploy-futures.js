// Script to deploy the GPUFutures contract
const { ethers } = require("hardhat");

async function main() {
  // Get the contract factories
  const GPUToken = await ethers.getContractFactory("GPUToken");
  const GPUFutures = await ethers.getContractFactory("GPUFutures");
  
  // Deploy GPU Token if not already deployed
  console.log("Deploying GPU Token...");
  const initialPrice = ethers.parseEther("0.01"); // 0.01 ETH per GPU hour
  const gpuToken = await GPUToken.deploy(initialPrice);
  await gpuToken.waitForDeployment();
  console.log("GPU Token deployed to:", await gpuToken.getAddress());
  
  // Deploy GPU Futures
  console.log("Deploying GPU Futures...");
  const gpuFutures = await GPUFutures.deploy(await gpuToken.getAddress());
  await gpuFutures.waitForDeployment();
  console.log("GPU Futures deployed to:", await gpuFutures.getAddress());
  
  console.log("Deployment complete!");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });