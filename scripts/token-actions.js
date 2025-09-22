const { ethers } = require("hardhat");
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  const [user] = await ethers.getSigners();
  console.log("🎮 Token Actions Menu");
  console.log("👤 Your address:", user.address);
  
  const contractAddress = "0x8B6aFc44f0F531EECd8Beb7cdB5C5126d6437E9C";
  const gpuToken = await ethers.getContractAt("GPUToken", contractAddress);
  
  // Show current balance
  const balance = await gpuToken.balanceOf(user.address);
  console.log("💰 Your GPUC balance:", ethers.formatUnits(balance, 18));
  console.log();
  
  // Menu options
  console.log("📋 What would you like to do?");
  console.log("1️⃣  Redeem tokens (burn for GPU hours)");
  console.log("2️⃣  Transfer tokens to another address");
  console.log("3️⃣  Check balance and exit");
  console.log();
  
  const choice = await askQuestion("Enter your choice (1, 2, or 3): ");
  
  try {
    if (choice === "1") {
      // REDEEM TOKENS
      console.log("\n🔥 REDEEM TOKENS FOR GPU HOURS");
      const hours = await askQuestion("How many GPU hours to redeem? ");
      const hoursNum = parseInt(hours);
      
      if (isNaN(hoursNum) || hoursNum <= 0) {
        console.log("❌ Invalid number of hours");
        return;
      }
      
      console.log(`⚡ Redeeming ${hoursNum} GPU hours...`);
      const tx = await gpuToken.redeemGPUHours(hoursNum);
      console.log("📝 Transaction hash:", tx.hash);
      await tx.wait();
      
      const newBalance = await gpuToken.balanceOf(user.address);
      const tokensUsed = balance - newBalance;
      
      console.log("✅ Redemption complete!");
      console.log("🔥 Tokens burned:", ethers.formatUnits(tokensUsed, 18), "GPUC");
      console.log("💰 Remaining balance:", ethers.formatUnits(newBalance, 18), "GPUC");
      
      const totalGPUHours = await gpuToken.getGPUHoursUsed(user.address);
      console.log("📊 Total GPU hours used:", totalGPUHours.toString());
      
    } else if (choice === "2") {
      // TRANSFER TOKENS
      console.log("\n💸 TRANSFER TOKENS TO ANOTHER ADDRESS");
      const recipient = await askQuestion("Enter recipient address: ");
      const amount = await askQuestion("Enter amount of GPUC to send: ");
      const amountNum = parseFloat(amount);
      
      if (isNaN(amountNum) || amountNum <= 0) {
        console.log("❌ Invalid amount");
        return;
      }
      
      // Validate address
      if (!ethers.isAddress(recipient)) {
        console.log("❌ Invalid Ethereum address");
        return;
      }
      
      const amountWei = ethers.parseUnits(amountNum.toString(), 18);
      
      // Check if user has enough balance
      if (amountWei > balance) {
        console.log("❌ Insufficient balance");
        console.log("💰 You have:", ethers.formatUnits(balance, 18), "GPUC");
        console.log("📤 You want to send:", amountNum, "GPUC");
        return;
      }
      
      console.log(`📤 Sending ${amountNum} GPUC to ${recipient}...`);
      const tx = await gpuToken.transfer(recipient, amountWei);
      console.log("📝 Transaction hash:", tx.hash);
      await tx.wait();
      
      const newBalance = await gpuToken.balanceOf(user.address);
      const recipientBalance = await gpuToken.balanceOf(recipient);
      
      console.log("✅ Transfer complete!");
      console.log("📤 Sent:", amountNum, "GPUC");
      console.log("👤 Your new balance:", ethers.formatUnits(newBalance, 18), "GPUC");
      console.log("👥 Recipient balance:", ethers.formatUnits(recipientBalance, 18), "GPUC");
      
    } else if (choice === "3") {
      // CHECK BALANCE
      console.log("\n📊 ACCOUNT SUMMARY");
      const gpuHoursUsed = await gpuToken.getGPUHoursUsed(user.address);
      console.log("💰 GPUC Balance:", ethers.formatUnits(balance, 18));
      console.log("⚡ GPU Hours Used:", gpuHoursUsed.toString());
      console.log("✅ Goodbye!");
      
    } else {
      console.log("❌ Invalid choice. Please run the script again.");
    }
    
  } catch (error) {
    console.error("❌ Transaction failed:", error.message);
  }
  
  rl.close();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  rl.close();
  process.exit(1);
});