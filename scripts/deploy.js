const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting GPU Token deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Using deployer address:", deployer.address);

  const GPUToken = await ethers.getContractFactory("GPUToken");

  const initialPrice = ethers.parseEther("0.001");
  console.log("💰 Initial price per GPU hour:", ethers.formatEther(initialPrice), "ETH");

  console.log("📦 Deploying GPU Token contract...");
  const gpuToken = await GPUToken.deploy(initialPrice);
  await gpuToken.waitForDeployment();

  console.log("✅ GPU Token deployed at:", gpuToken.target);
  console.log("🏷️  Name:", await gpuToken.name());
  console.log("🎯 Symbol:", await gpuToken.symbol());
  console.log("🔢 Total supply:", ethers.formatUnits(await gpuToken.totalSupply(), 18), "GPUC");

  // ✅ Fixed line (use provider to get balance)
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log("💼 Deployer ETH balance:", ethers.formatEther(deployerBalance), "ETH");

  const stats = await gpuToken.getContractStats();
  console.log("\n📊 Contract Stats:");
  console.log("   Available GPU hours:", stats.totalAvailable.toString());
  console.log("   GPU hours used:", stats.totalUsed.toString());
  console.log("   Current price:", ethers.formatEther(stats.currentPrice), "ETH");
  console.log("   Contract ETH balance:", ethers.formatEther(stats.contractBalance), "ETH");

  const tokensForSale = ethers.parseUnits("100000", 18);
  console.log("\n🔄 Funding contract with tokens for sale...");
  await gpuToken.transfer(gpuToken.target, tokensForSale);
  console.log("✅ Transferred", ethers.formatUnits(tokensForSale, 18), "GPUC to contract");

  console.log("\n🎉 Deployment complete!");
  console.log("\n📌 Add token to MetaMask:");
  console.log("   • Token Address:", gpuToken.target);
  console.log("   • Symbol: GPUC");
  console.log("   • Decimals: 18");
  console.log("\n👉 Then you can test buying tokens via `purchaseGPUHours()`.");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error);
  process.exit(1);
});
