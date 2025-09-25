const { ethers } = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("📊 Fetching GPU Token statistics...\n");
  
  const contractAddress = "0xB84367c7c2acDF01Ce49491436187fCA17eE1a43";
  const gpuToken = await ethers.getContractAt("GPUToken", contractAddress);
  
  // Contract info
  const name = await gpuToken.name();
  const symbol = await gpuToken.symbol();
  const totalSupply = await gpuToken.totalSupply();
  const pricePerToken = await gpuToken.pricePerToken();
  
  console.log("🏷️  Contract Details:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Total Supply:", ethers.formatUnits(totalSupply, 18), symbol);
  console.log("   Price per Hour:", ethers.formatEther(pricePerToken), "ETH");
  console.log();
  
  // User stats
  const userBalance = await gpuToken.balanceOf(user.address);
  const userGPUHours = await gpuToken.getGPUHoursUsed(user.address);
  
  console.log("👤 Your Account Stats:");
  console.log("   Address:", user.address);
  console.log("   GPUC Balance:", ethers.formatUnits(userBalance, 18));
  console.log("   GPU Hours Used:", userGPUHours.toString());
  console.log();
  
  // Contract balance (ETH collected)
  const contractBalance = await ethers.provider.getBalance(contractAddress);
  console.log("💰 Contract Stats:");
  console.log("   ETH Collected:", ethers.formatEther(contractBalance), "ETH");
  console.log("   Contract Address:", contractAddress);
  
  // Calculate some metrics
  const tokensInCirculation = totalSupply - userBalance; // Simplified
  console.log();
  console.log("📈 Calculated Metrics:");
  console.log("   Your Share of Supply:", ((Number(ethers.formatUnits(userBalance, 18)) / Number(ethers.formatUnits(totalSupply, 18))) * 100).toFixed(2) + "%");
  console.log("   Equivalent GPU Hours:", ethers.formatUnits(userBalance, 18), "hours");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});