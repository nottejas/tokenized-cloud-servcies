const { ethers } = require("hardhat");

async function main() {
  const [buyer] = await ethers.getSigners();
  console.log("🧾 Buying tokens with:", buyer.address);
  
  // Use your NEW deployed contract address
  const contractAddress = "0xB84367c7c2acDF01Ce49491436187fCA17eE1a43";
  const gpuToken = await ethers.getContractAt("GPUToken", contractAddress);
  
  // Check current balance before purchase
  const balanceBefore = await gpuToken.balanceOf(buyer.address);
  console.log("💳 Current GPUC balance:", ethers.formatUnits(balanceBefore, 18));
  
  // Purchase parameters
  const gpuHoursToBuy = 10;
  const pricePerToken = await gpuToken.pricePerToken();
  const totalCost = pricePerToken * BigInt(gpuHoursToBuy);
  
  console.log(`💰 Purchasing ${gpuHoursToBuy} GPU hours`);
  console.log(`💸 Total cost: ${ethers.formatEther(totalCost)} ETH (${ethers.formatEther(pricePerToken)} ETH per GPU hour)`);
  console.log(`⏳ Processing transaction...`);
  
  try {
    const tx = await gpuToken.purchaseGPUHours(gpuHoursToBuy, {
      value: totalCost,
    });
    
    console.log("📝 Transaction hash:", tx.hash);
    await tx.wait();
    
    // Check new balance
    const balanceAfter = await gpuToken.balanceOf(buyer.address);
    const tokensReceived = balanceAfter - balanceBefore;
    
    console.log("✅ Purchase complete!");
    console.log("🪙 Tokens received:", ethers.formatUnits(tokensReceived, 18), "GPUC");
    console.log("💰 New GPUC balance:", ethers.formatUnits(balanceAfter, 18));
    
    // Check contract stats
    const totalSupply = await gpuToken.totalSupply();
    console.log("📊 Total tokens in circulation:", ethers.formatUnits(totalSupply, 18));
    
  } catch (error) {
    console.error("❌ Transaction failed:", error.message);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});