const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GPUFutures", function () {
  let GPUToken, GPUFutures;
  let gpuToken, gpuFutures;
  let owner, buyer, seller, addr3;
  let initialPrice = ethers.parseEther("0.01"); // 0.01 ETH per GPU hour
  
  beforeEach(async function () {
    // Get signers
    [owner, buyer, seller, addr3] = await ethers.getSigners();
    
    // Deploy GPU Token
    GPUToken = await ethers.getContractFactory("GPUToken");
    gpuToken = await GPUToken.deploy(initialPrice);
    await gpuToken.waitForDeployment();
    
    // Deploy GPU Futures
    GPUFutures = await ethers.getContractFactory("GPUFutures");
    gpuFutures = await GPUFutures.deploy(await gpuToken.getAddress());
    await gpuFutures.waitForDeployment();
    
    // Mint tokens to seller for testing
    await gpuToken.mintGPUHours(seller.address, 1000); // 1000 GPU hours
    
    // Approve futures contract to spend tokens
    await gpuToken.connect(seller).approve(await gpuFutures.getAddress(), ethers.parseEther("1000"));
  });
  
  describe("Deployment", function () {
    it("Should set the right GPU token address", async function () {
      expect(await gpuFutures.gpuToken()).to.equal(await gpuToken.getAddress());
    });
    
    it("Should set the right owner", async function () {
      expect(await gpuFutures.owner()).to.equal(owner.address);
    });
    
    it("Should have correct initial values", async function () {
      expect(await gpuFutures.nextOrderId()).to.equal(1);
      expect(await gpuFutures.nextContractId()).to.equal(1);
      expect(await gpuFutures.collateralRequirementPercent()).to.equal(20);
      expect(await gpuFutures.liquidationThresholdPercent()).to.equal(10);
      expect(await gpuFutures.platformFeePercent()).to.equal(1);
    });
  });
  
  describe("Order Creation", function () {
    it("Should create a buy order with correct collateral", async function () {
      const price = ethers.parseEther("0.01"); // 0.01 ETH per GPU hour
      const quantity = 100; // 100 GPU hours
      const expirationDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const totalValue = price * BigInt(quantity);
      const requiredCollateral = (totalValue * BigInt(20)) / BigInt(100); // 20% collateral
      
      await expect(gpuFutures.connect(buyer).createOrder(
        0, // BUY
        price,
        quantity,
        expirationDate,
        { value: requiredCollateral }
      )).to.emit(gpuFutures, "OrderCreated");
      
      const order = await gpuFutures.orders(1);
      expect(order.trader).to.equal(buyer.address);
      expect(order.orderType).to.equal(0); // BUY
      expect(order.status).to.equal(0); // OPEN
      expect(order.price).to.equal(price);
      expect(order.quantity).to.equal(quantity);
      expect(order.collateralAmount).to.equal(requiredCollateral);
      expect(order.expirationDate).to.equal(expirationDate);
    });
    
    it("Should create a sell order with correct collateral", async function () {
      const price = ethers.parseEther("0.01"); // 0.01 ETH per GPU hour
      const quantity = 100; // 100 GPU hours
      const expirationDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const totalValue = price * BigInt(quantity);
      const requiredCollateral = (totalValue * BigInt(20)) / BigInt(100); // 20% collateral
      
      await expect(gpuFutures.connect(seller).createOrder(
        1, // SELL
        price,
        quantity,
        expirationDate
      )).to.emit(gpuFutures, "OrderCreated");
      
      const order = await gpuFutures.orders(1);
      expect(order.trader).to.equal(seller.address);
      expect(order.orderType).to.equal(1); // SELL
      expect(order.status).to.equal(0); // OPEN
      expect(order.price).to.equal(price);
      expect(order.quantity).to.equal(quantity);
      expect(order.collateralAmount).to.equal(requiredCollateral);
      expect(order.expirationDate).to.equal(expirationDate);
    });
    
    it("Should fail if insufficient collateral is provided", async function () {
      const price = ethers.parseEther("0.01"); // 0.01 ETH per GPU hour
      const quantity = 100; // 100 GPU hours
      const expirationDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const insufficientCollateral = ethers.parseEther("0.01"); // Too small
      
      await expect(gpuFutures.connect(buyer).createOrder(
        0, // BUY
        price,
        quantity,
        expirationDate,
        { value: insufficientCollateral }
      )).to.be.revertedWith("Insufficient collateral");
    });
  });
  
  describe("Order Matching", function () {
    it("Should match compatible buy and sell orders", async function () {
      const price = ethers.parseEther("0.01"); // 0.01 ETH per GPU hour
      const quantity = 100; // 100 GPU hours
      const expirationDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const totalValue = price * BigInt(quantity);
      const requiredCollateral = (totalValue * BigInt(20)) / BigInt(100); // 20% collateral
      
      // Create sell order
      await gpuFutures.connect(seller).createOrder(
        1, // SELL
        price,
        quantity,
        expirationDate
      );
      
      // Create buy order (should match with sell order)
      await expect(gpuFutures.connect(buyer).createOrder(
        0, // BUY
        price,
        quantity,
        expirationDate,
        { value: requiredCollateral }
      )).to.emit(gpuFutures, "ContractCreated");
      
      // Check that both orders are filled
      const sellOrder = await gpuFutures.orders(1);
      const buyOrder = await gpuFutures.orders(2);
      expect(sellOrder.status).to.equal(1); // FILLED
      expect(buyOrder.status).to.equal(1); // FILLED
      
      // Check that a futures contract was created
      const contract = await gpuFutures.futuresContracts(1);
      expect(contract.buyer).to.equal(buyer.address);
      expect(contract.seller).to.equal(seller.address);
      expect(contract.price).to.equal(price);
      expect(contract.quantity).to.equal(quantity);
      expect(contract.expirationDate).to.equal(expirationDate);
      expect(contract.settled).to.equal(false);
    });
  });
  
  describe("Order Cancellation", function () {
    it("Should allow cancellation of open orders", async function () {
      const price = ethers.parseEther("0.01"); // 0.01 ETH per GPU hour
      const quantity = 100; // 100 GPU hours
      const expirationDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const totalValue = price * BigInt(quantity);
      const requiredCollateral = (totalValue * BigInt(20)) / BigInt(100); // 20% collateral
      
      // Create buy order
      await gpuFutures.connect(buyer).createOrder(
        0, // BUY
        price,
        quantity,
        expirationDate,
        { value: requiredCollateral }
      );
      
      // Cancel the order
      await expect(gpuFutures.connect(buyer).cancelOrder(1))
        .to.emit(gpuFutures, "OrderCancelled")
        .withArgs(1);
      
      // Check that the order is cancelled
      const order = await gpuFutures.orders(1);
      expect(order.status).to.equal(2); // CANCELLED
    });
    
    it("Should not allow cancellation by non-owner", async function () {
      const price = ethers.parseEther("0.01"); // 0.01 ETH per GPU hour
      const quantity = 100; // 100 GPU hours
      const expirationDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const totalValue = price * BigInt(quantity);
      const requiredCollateral = (totalValue * BigInt(20)) / BigInt(100); // 20% collateral
      
      // Create buy order
      await gpuFutures.connect(buyer).createOrder(
        0, // BUY
        price,
        quantity,
        expirationDate,
        { value: requiredCollateral }
      );
      
      // Try to cancel the order as non-owner
      await expect(gpuFutures.connect(addr3).cancelOrder(1))
        .to.be.revertedWith("Not order owner");
    });
  });
  
  describe("Contract Settlement", function () {
    beforeEach(async function () {
      // Setup a matched contract
      const price = ethers.parseEther("0.01"); // 0.01 ETH per GPU hour
      const quantity = 100; // 100 GPU hours
      const expirationDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const totalValue = price * BigInt(quantity);
      const requiredCollateral = (totalValue * BigInt(20)) / BigInt(100); // 20% collateral
      
      // Create sell order
      await gpuFutures.connect(seller).createOrder(
        1, // SELL
        price,
        quantity,
        expirationDate
      );
      
      // Create buy order (should match with sell order)
      await gpuFutures.connect(buyer).createOrder(
        0, // BUY
        price,
        quantity,
        expirationDate,
        { value: requiredCollateral }
      );
    });
    
    it("Should not allow settlement before expiration", async function () {
      await expect(gpuFutures.connect(buyer).settleContract(1))
        .to.be.revertedWith("Contract not yet expired");
    });
    
    // Note: Testing settlement after expiration would require time manipulation
    // which is beyond the scope of this basic test file
  });
  
  describe("Admin Functions", function () {
    it("Should allow owner to update collateral requirement", async function () {
      await gpuFutures.connect(owner).updateCollateralRequirement(25);
      expect(await gpuFutures.collateralRequirementPercent()).to.equal(25);
    });
    
    it("Should allow owner to update liquidation threshold", async function () {
      await gpuFutures.connect(owner).updateLiquidationThreshold(15);
      expect(await gpuFutures.liquidationThresholdPercent()).to.equal(15);
    });
    
    it("Should allow owner to update platform fee", async function () {
      await gpuFutures.connect(owner).updatePlatformFee(2);
      expect(await gpuFutures.platformFeePercent()).to.equal(2);
    });
    
    it("Should not allow non-owner to update parameters", async function () {
      await expect(gpuFutures.connect(addr3).updateCollateralRequirement(25))
        .to.be.revertedWithCustomError(gpuFutures, "OwnableUnauthorizedAccount");
      
      await expect(gpuFutures.connect(addr3).updateLiquidationThreshold(15))
        .to.be.revertedWithCustomError(gpuFutures, "OwnableUnauthorizedAccount");
      
      await expect(gpuFutures.connect(addr3).updatePlatformFee(2))
        .to.be.revertedWithCustomError(gpuFutures, "OwnableUnauthorizedAccount");
    });
  });
});