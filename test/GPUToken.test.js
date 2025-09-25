const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GPUToken Contract", function () {
  let GPUToken;
  let gpuToken;
  let owner;
  let buyer;
  let initialPrice;

  beforeEach(async function () {
    // Get signers
    [owner, buyer] = await ethers.getSigners();
    
    // Deploy the contract
    initialPrice = ethers.parseEther("0.001"); // 0.001 ETH per GPU hour
    GPUToken = await ethers.getContractFactory("GPUToken");
    gpuToken = await GPUToken.deploy(initialPrice);
    await gpuToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await gpuToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await gpuToken.balanceOf(owner.address);
      expect(await gpuToken.totalSupply()).to.equal(ownerBalance);
    });

    it("Should set the correct initial price", async function () {
      expect(await gpuToken.pricePerToken()).to.equal(initialPrice);
    });

    it("Should set the correct token metadata", async function () {
      expect(await gpuToken.name()).to.equal("GPU Compute Token");
      expect(await gpuToken.symbol()).to.equal("GPUC");
    });
  });

  describe("Purchasing GPU Hours", function () {
    it("Should allow users to purchase GPU hours", async function () {
      const gpuHoursToBuy = 5;
      const totalCost = initialPrice * BigInt(gpuHoursToBuy);
      
      // Transfer some tokens to the contract for users to purchase
      await gpuToken.connect(owner).transfer(
        await gpuToken.getAddress(),
        ethers.parseUnits("100", 18)
      );

      // Initial balances
      const initialBuyerBalance = await gpuToken.balanceOf(buyer.address);
      
      // Purchase GPU hours
      await gpuToken.connect(buyer).purchaseGPUHours(gpuHoursToBuy, { value: totalCost });
      
      // Check buyer received tokens
      const finalBuyerBalance = await gpuToken.balanceOf(buyer.address);
      expect(finalBuyerBalance - initialBuyerBalance).to.equal(ethers.parseUnits(gpuHoursToBuy.toString(), 18));
      
      // Check purchase tracking
      expect(await gpuToken.gpuHoursPurchased(buyer.address)).to.equal(gpuHoursToBuy);
    });

    it("Should refund excess ETH when overpaying", async function () {
      const gpuHoursToBuy = 3;
      const totalCost = initialPrice * BigInt(gpuHoursToBuy);
      const overpayment = totalCost + ethers.parseEther("0.1"); // 0.1 ETH extra
      
      // Transfer some tokens to the contract for users to purchase
      await gpuToken.connect(owner).transfer(
        await gpuToken.getAddress(),
        ethers.parseUnits("100", 18)
      );

      // Track ETH balance before purchase
      const initialBuyerETHBalance = await ethers.provider.getBalance(buyer.address);
      
      // Purchase with overpayment
      const tx = await gpuToken.connect(buyer).purchaseGPUHours(gpuHoursToBuy, { value: overpayment });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Check final balance (should be initial - totalCost - gasUsed)
      const finalBuyerETHBalance = await ethers.provider.getBalance(buyer.address);
      const expectedBalance = initialBuyerETHBalance - totalCost - gasUsed;
      
      // Allow for small rounding errors in gas calculation
      expect(finalBuyerETHBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.0001"));
    });

    it("Should fail when trying to purchase 0 GPU hours", async function () {
      await expect(
        gpuToken.connect(buyer).purchaseGPUHours(0, { value: initialPrice })
      ).to.be.revertedWith("Must purchase at least 1 GPU hour");
    });

    it("Should fail when not sending enough ETH", async function () {
      await expect(
        gpuToken.connect(buyer).purchaseGPUHours(5, { value: initialPrice }) // Only sending enough for 1 hour
      ).to.be.revertedWith("Insufficient ETH sent");
    });
  });

  describe("Redeeming GPU Hours", function () {
    beforeEach(async function () {
      // Transfer tokens to buyer for redemption tests
      await gpuToken.connect(owner).transfer(
        buyer.address,
        ethers.parseUnits("10", 18) // 10 GPU hours
      );
    });

    it("Should allow users to redeem GPU hours", async function () {
      const gpuHoursToRedeem = 3;
      const tokenAmount = ethers.parseUnits(gpuHoursToRedeem.toString(), 18);
      
      // Initial balances and usage
      const initialBuyerBalance = await gpuToken.balanceOf(buyer.address);
      const initialUsed = await gpuToken.gpuHoursUsed(buyer.address);
      const initialTotalUsed = await gpuToken.totalGPUHoursUsed();
      
      // Redeem GPU hours
      await gpuToken.connect(buyer).redeemGPUHours(gpuHoursToRedeem);
      
      // Check tokens were burned
      const finalBuyerBalance = await gpuToken.balanceOf(buyer.address);
      expect(initialBuyerBalance - finalBuyerBalance).to.equal(tokenAmount);
      
      // Check usage tracking was updated
      expect(await gpuToken.gpuHoursUsed(buyer.address)).to.equal(initialUsed + BigInt(gpuHoursToRedeem));
      expect(await gpuToken.totalGPUHoursUsed()).to.equal(initialTotalUsed + BigInt(gpuHoursToRedeem));
    });

    it("Should fail when trying to redeem 0 GPU hours", async function () {
      await expect(
        gpuToken.connect(buyer).redeemGPUHours(0)
      ).to.be.revertedWith("Must redeem at least 1 GPU hour");
    });

    it("Should fail when trying to redeem more GPU hours than owned", async function () {
      const buyerBalance = await gpuToken.balanceOf(buyer.address);
      const tooManyHours = Number(ethers.formatUnits(buyerBalance, 18)) + 1;
      
      await expect(
        gpuToken.connect(buyer).redeemGPUHours(tooManyHours)
      ).to.be.revertedWith("Insufficient GPU tokens");
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to update price", async function () {
      const newPrice = ethers.parseEther("0.002"); // 0.002 ETH
      await gpuToken.connect(owner).updatePrice(newPrice);
      expect(await gpuToken.pricePerToken()).to.equal(newPrice);
    });

    it("Should not allow non-owner to update price", async function () {
      const newPrice = ethers.parseEther("0.002");
      await expect(
        gpuToken.connect(buyer).updatePrice(newPrice)
      ).to.be.revertedWithCustomError(gpuToken, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to pause and unpause the contract", async function () {
      // Pause the contract
      await gpuToken.connect(owner).pause();
      expect(await gpuToken.paused()).to.equal(true);
      
      // Try to purchase while paused
      await expect(
        gpuToken.connect(buyer).purchaseGPUHours(1, { value: initialPrice })
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause the contract
      await gpuToken.connect(owner).unpause();
      expect(await gpuToken.paused()).to.equal(false);
    });
  });

  describe("Contract Stats", function () {
    it("Should return correct contract statistics", async function () {
      // Setup: transfer some tokens to contract and make a purchase
      await gpuToken.connect(owner).transfer(
        await gpuToken.getAddress(),
        ethers.parseUnits("100", 18)
      );
      
      await gpuToken.connect(buyer).purchaseGPUHours(5, { 
        value: initialPrice * BigInt(5) 
      });
      
      // Redeem some GPU hours
      await gpuToken.connect(buyer).redeemGPUHours(2);
      
      // Get contract stats
      const stats = await gpuToken.getContractStats();
      
      // Verify stats
      expect(stats.totalAvailable).to.equal(1000000n); // Initial supply
      expect(stats.totalUsed).to.equal(2n); // 2 hours redeemed
      expect(stats.currentPrice).to.equal(initialPrice);
      
      // Contract balance should have received payment for 5 GPU hours
      expect(stats.contractBalance).to.equal(initialPrice * BigInt(5));
    });
  });
});