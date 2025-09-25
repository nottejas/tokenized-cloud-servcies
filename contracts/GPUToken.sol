// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Import OpenZeppelin contracts for security and standards
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title GPUToken
 * @dev ERC20 token representing GPU compute hours
 * Each token represents 1 GPU-hour of compute time
 */
contract GPUToken is ERC20, Ownable, Pausable {
    
    // Token metadata
    uint8 private constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**DECIMALS; // 1 million GPU hours
    
    // Pricing and resource mapping
    uint256 public pricePerToken; // Price in wei per GPU-hour token
    uint256 public totalGPUHoursAvailable;
    uint256 public totalGPUHoursUsed;
    
    // Events for tracking GPU operations
    event GPUHoursMinted(address indexed to, uint256 amount, uint256 timestamp);
    event GPUHoursRedeemed(address indexed from, uint256 amount, uint256 timestamp);
    event PriceUpdated(uint256 newPrice, uint256 timestamp);
    
    // Mapping to track GPU usage by address
    mapping(address => uint256) public gpuHoursUsed;
    mapping(address => uint256) public gpuHoursPurchased;
    
    constructor(uint256 _initialPrice) ERC20("GPU Compute Token", "GPUC") Ownable(msg.sender) {
        pricePerToken = _initialPrice;
        totalGPUHoursAvailable = INITIAL_SUPPLY / 10**DECIMALS;
        
        // Mint initial supply to contract owner
        _mint(msg.sender, INITIAL_SUPPLY);
        
        emit GPUHoursMinted(msg.sender, INITIAL_SUPPLY, block.timestamp);
    }
    
    /**
     * @dev Purchase GPU tokens with ETH
     * @param _gpuHours Number of GPU hours to purchase
     */
    function purchaseGPUHours(uint256 _gpuHours) external payable whenNotPaused {
        require(_gpuHours > 0, "Must purchase at least 1 GPU hour");
        
        uint256 totalCost = _gpuHours * pricePerToken;
        require(msg.value >= totalCost, "Insufficient ETH sent");
        
        uint256 tokenAmount = _gpuHours * 10**DECIMALS;
        require(balanceOf(address(this)) >= tokenAmount, "Not enough GPU hours available");
        
        // Transfer tokens from contract to buyer
        _transfer(address(this), msg.sender, tokenAmount);
        
        // Update tracking
        gpuHoursPurchased[msg.sender] += _gpuHours;
        
        // Refund excess ETH
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit GPUHoursMinted(msg.sender, tokenAmount, block.timestamp);
    }
    
    /**
     * @dev Redeem GPU tokens for actual compute time
     * @param _gpuHours Number of GPU hours to redeem
     */
    function redeemGPUHours(uint256 _gpuHours) external whenNotPaused {
        require(_gpuHours > 0, "Must redeem at least 1 GPU hour");
        
        uint256 tokenAmount = _gpuHours * 10**DECIMALS;
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient GPU tokens");
        
        // Burn tokens when redeemed
        _burn(msg.sender, tokenAmount);
        
        // Update usage tracking
        gpuHoursUsed[msg.sender] += _gpuHours;
        totalGPUHoursUsed += _gpuHours;
        
        emit GPUHoursRedeemed(msg.sender, tokenAmount, block.timestamp);
        
        // Here you would integrate with actual GPU provisioning system
        // For now, we just emit an event
    }
    
    /**
     * @dev Get GPU hours used by an address
     * @param _user Address to check
     * @return used Total GPU hours used
     */
    function getGPUHoursUsed(address _user) external view returns (uint256) {
        return gpuHoursUsed[_user];
    }
    
    /**
     * @dev Update the price per GPU hour token (only owner)
     * @param _newPrice New price in wei
     */
    function updatePrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price must be greater than 0");
        pricePerToken = _newPrice;
        emit PriceUpdated(_newPrice, block.timestamp);
    }
    
    /**
     * @dev Mint additional GPU tokens (only owner)
     * @param _to Address to mint tokens to
     * @param _gpuHours Number of GPU hours to mint
     */
    function mintGPUHours(address _to, uint256 _gpuHours) external onlyOwner {
        require(_to != address(0), "Cannot mint to zero address");
        require(_gpuHours > 0, "Must mint at least 1 GPU hour");
        
        uint256 tokenAmount = _gpuHours * 10**DECIMALS;
        _mint(_to, tokenAmount);
        
        totalGPUHoursAvailable += _gpuHours;
        
        emit GPUHoursMinted(_to, tokenAmount, block.timestamp);
    }
    
    /**
     * @dev Withdraw contract ETH balance (only owner)
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Get GPU usage statistics for an address
     * @param _user Address to check
     * @return purchased Total GPU hours purchased
     * @return used Total GPU hours used
     * @return balance Current token balance in GPU hours
     */
    function getGPUStats(address _user) external view returns (
        uint256 purchased,
        uint256 used,
        uint256 balance
    ) {
        purchased = gpuHoursPurchased[_user];
        used = gpuHoursUsed[_user];
        balance = balanceOf(_user) / 10**DECIMALS;
    }
    
    /**
     * @dev Get current contract statistics
     * @return totalAvailable Total GPU hours available
     * @return totalUsed Total GPU hours used across all users
     * @return currentPrice Current price per GPU hour in wei
     * @return contractBalance Contract's ETH balance
     */
    function getContractStats() external view returns (
        uint256 totalAvailable,
        uint256 totalUsed,
        uint256 currentPrice,
        uint256 contractBalance
    ) {
        totalAvailable = totalGPUHoursAvailable;
        totalUsed = totalGPUHoursUsed;
        currentPrice = pricePerToken;
        contractBalance = address(this).balance;
    }
    
    // Pause/unpause functionality for emergency stops
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Override decimals to return our constant
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
}