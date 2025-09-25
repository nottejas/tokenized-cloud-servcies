// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


/**
 * @title GPUFutures
 * @dev Contract for trading GPU compute hours at future prices
 * Implements an order book system for matching buyers and sellers
 * Includes collateral management and settlement mechanisms
 */
contract GPUFutures is Ownable, Pausable, ReentrancyGuard {
    // Reference to the GPU token contract
    IERC20 public gpuToken;
    
    // Order types
    enum OrderType { BUY, SELL }
    
    // Order status
    enum OrderStatus { OPEN, FILLED, CANCELLED, EXPIRED, LIQUIDATED }
    
    // Futures contract structure
    struct FuturesContract {
        uint256 id;
        uint256 expirationDate;
        uint256 price;          // Price per GPU hour in wei
        uint256 quantity;       // Number of GPU hours
        uint256 collateralAmount;
        address buyer;
        address seller;
        bool settled;
    }
    
    // Order structure
    struct Order {
        uint256 id;
        address trader;
        OrderType orderType;
        OrderStatus status;
        uint256 price;          // Price per GPU hour in wei
        uint256 quantity;       // Number of GPU hours
        uint256 collateralAmount;
        uint256 expirationDate; // When this futures contract expires
        uint256 timestamp;      // When the order was created
    }
    
    // Contract state variables
    uint256 public nextOrderId = 1;
    uint256 public nextContractId = 1;
    uint256 public collateralRequirementPercent = 20; // 20% collateral requirement
    uint256 public liquidationThresholdPercent = 10;  // 10% threshold for liquidation
    uint256 public platformFeePercent = 1;           // 1% platform fee
    
    // Mappings
    mapping(uint256 => Order) public orders;
    mapping(uint256 => FuturesContract) public futuresContracts;
    mapping(address => uint256[]) public userOrders;
    mapping(address => uint256[]) public userContracts;
    
    // Events
    event OrderCreated(uint256 indexed orderId, address indexed trader, OrderType orderType, uint256 price, uint256 quantity, uint256 expirationDate);
    event OrderCancelled(uint256 indexed orderId);
    event OrderFilled(uint256 indexed orderId, uint256 indexed contractId);
    event ContractCreated(uint256 indexed contractId, address indexed buyer, address indexed seller, uint256 price, uint256 quantity, uint256 expirationDate);
    event ContractSettled(uint256 indexed contractId);
    event ContractLiquidated(uint256 indexed contractId, address liquidatedParty);
    event CollateralRequirementUpdated(uint256 newRequirementPercent);
    event LiquidationThresholdUpdated(uint256 newThresholdPercent);
    event PlatformFeeUpdated(uint256 newFeePercent);
    
    /**
     * @dev Constructor sets the GPU token address and contract owner
     * @param _gpuTokenAddress Address of the GPU token contract
     */
    constructor(address _gpuTokenAddress) Ownable(msg.sender) {
        require(_gpuTokenAddress != address(0), "Invalid GPU token address");
        gpuToken = IERC20(_gpuTokenAddress);
    }
    
    /**
     * @dev Create a new futures order
     * @param _orderType Type of order (BUY or SELL)
     * @param _price Price per GPU hour in wei
     * @param _quantity Number of GPU hours
     * @param _expirationDate Expiration date timestamp
     */
    function createOrder(
        OrderType _orderType,
        uint256 _price,
        uint256 _quantity,
        uint256 _expirationDate
    ) external payable whenNotPaused nonReentrant {
        require(_price > 0, "Price must be greater than 0");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_expirationDate > block.timestamp, "Expiration date must be in the future");
        
        // Calculate required collateral
        uint256 totalValue = _price * _quantity;
        uint256 requiredCollateral = (totalValue * collateralRequirementPercent) / 100;
        
        // For buy orders, collateral is in ETH
        if (_orderType == OrderType.BUY) {
            require(msg.value >= requiredCollateral, "Insufficient collateral");
        } 
        // For sell orders, collateral is in GPU tokens
        else {
            require(gpuToken.transferFrom(msg.sender, address(this), requiredCollateral), "Token transfer failed");
        }
        
        // Create the order
        Order memory newOrder = Order({
            id: nextOrderId,
            trader: msg.sender,
            orderType: _orderType,
            status: OrderStatus.OPEN,
            price: _price,
            quantity: _quantity,
            collateralAmount: requiredCollateral,
            expirationDate: _expirationDate,
            timestamp: block.timestamp
        });
        
        // Store the order
        orders[nextOrderId] = newOrder;
        userOrders[msg.sender].push(nextOrderId);
        
        emit OrderCreated(nextOrderId, msg.sender, _orderType, _price, _quantity, _expirationDate);
        
        // Try to match the order immediately
        _matchOrder(nextOrderId);
        
        nextOrderId++;
    }
    
    /**
     * @dev Cancel an existing order
     * @param _orderId ID of the order to cancel
     */
    function cancelOrder(uint256 _orderId) external nonReentrant {
        Order storage order = orders[_orderId];
        require(order.trader == msg.sender, "Not order owner");
        require(order.status == OrderStatus.OPEN, "Order not open");
        
        order.status = OrderStatus.CANCELLED;
        
        // Refund collateral
        if (order.orderType == OrderType.BUY) {
            payable(msg.sender).transfer(order.collateralAmount);
        } else {
            require(gpuToken.transfer(msg.sender, order.collateralAmount), "Token transfer failed");
        }
        
        emit OrderCancelled(_orderId);
    }
    
    /**
     * @dev Internal function to match orders
     * @param _orderId ID of the order to match
     */
    function _matchOrder(uint256 _orderId) internal {
        Order storage currentOrder = orders[_orderId];
        
        // Skip if order is not open
        if (currentOrder.status != OrderStatus.OPEN) {
            return;
        }
        
        // Find matching orders
        for (uint256 i = 1; i < nextOrderId; i++) {
            // Skip the current order
            if (i == _orderId) {
                continue;
            }
            
            Order storage matchOrder = orders[i];
            
            // Check if orders can be matched
            if (matchOrder.status == OrderStatus.OPEN &&
                matchOrder.orderType != currentOrder.orderType &&
                matchOrder.expirationDate == currentOrder.expirationDate) {
                
                // For a match, buy price must be >= sell price
                bool priceMatches = (currentOrder.orderType == OrderType.BUY) ?
                    currentOrder.price >= matchOrder.price :
                    matchOrder.price >= currentOrder.price;
                    
                if (priceMatches) {
                    // Create a futures contract
                    _createFuturesContract(currentOrder, matchOrder);
                    return; // Exit after first match
                }
            }
        }
    }
    
    /**
     * @dev Internal function to create a futures contract from matched orders
     * @param _buyOrder Buy order
     * @param _sellOrder Sell order
     */
    function _createFuturesContract(
        Order storage _buyOrder,
        Order storage _sellOrder
    ) internal {
        // Determine the contract price (use the sell price)
        uint256 contractPrice = _sellOrder.price;
        
        // Determine the contract quantity (use the minimum of the two orders)
        uint256 contractQuantity = _buyOrder.quantity < _sellOrder.quantity ?
            _buyOrder.quantity : _sellOrder.quantity;
            
        // Create the futures contract
        FuturesContract memory newContract = FuturesContract({
            id: nextContractId,
            expirationDate: _buyOrder.expirationDate, // Both orders have the same expiration date
            price: contractPrice,
            quantity: contractQuantity,
            collateralAmount: (_buyOrder.collateralAmount + _sellOrder.collateralAmount),
            buyer: _buyOrder.trader,
            seller: _sellOrder.trader,
            settled: false
        });
        
        // Store the contract
        futuresContracts[nextContractId] = newContract;
        userContracts[_buyOrder.trader].push(nextContractId);
        userContracts[_sellOrder.trader].push(nextContractId);
        
        // Update order status
        _buyOrder.status = OrderStatus.FILLED;
        _sellOrder.status = OrderStatus.FILLED;
        
        emit OrderFilled(_buyOrder.id, nextContractId);
        emit OrderFilled(_sellOrder.id, nextContractId);
        emit ContractCreated(
            nextContractId,
            _buyOrder.trader,
            _sellOrder.trader,
            contractPrice,
            contractQuantity,
            newContract.expirationDate
        );
        
        nextContractId++;
    }
    
    /**
     * @dev Settle a futures contract at expiration
     * @param _contractId ID of the contract to settle
     */
    function settleContract(uint256 _contractId) external nonReentrant {
        FuturesContract storage contract_ = futuresContracts[_contractId];
        
        require(!contract_.settled, "Contract already settled");
        require(block.timestamp >= contract_.expirationDate, "Contract not yet expired");
        require(msg.sender == contract_.buyer || msg.sender == contract_.seller, "Not contract participant");
        
        // Mark as settled
        contract_.settled = true;
        
        // Calculate total contract value
        uint256 totalValue = contract_.price * contract_.quantity;
        
        // Calculate platform fee
        uint256 platformFee = (totalValue * platformFeePercent) / 100;
        
        // Transfer tokens from seller to buyer
        require(gpuToken.transferFrom(contract_.seller, contract_.buyer, contract_.quantity), "Token transfer failed");
        
        // Transfer payment from buyer to seller (minus platform fee)
        payable(contract_.seller).transfer(totalValue - platformFee);
        
        // Return collateral to both parties
        uint256 buyerCollateral = contract_.collateralAmount / 2;
        uint256 sellerCollateral = contract_.collateralAmount / 2;
        
        payable(contract_.buyer).transfer(buyerCollateral);
        require(gpuToken.transfer(contract_.seller, sellerCollateral), "Token transfer failed");
        
        emit ContractSettled(_contractId);
    }
    
    /**
     * @dev Liquidate a contract if collateral falls below threshold
     * @param _contractId ID of the contract to liquidate
     * @param _party Address of the party to liquidate (buyer or seller)
     */
    function liquidatePosition(uint256 _contractId, address _party) external nonReentrant {
        FuturesContract storage contract_ = futuresContracts[_contractId];
        
        require(!contract_.settled, "Contract already settled");
        require(_party == contract_.buyer || _party == contract_.seller, "Invalid party");
        
        // Check if liquidation threshold is reached
        // In a real implementation, this would check price feeds and calculate if
        // the position is undercollateralized
        bool canLiquidate = _checkLiquidationCondition(_contractId, _party);
        require(canLiquidate, "Liquidation conditions not met");
        
        // Mark as settled to prevent further actions
        contract_.settled = true;
        
        // Determine the counterparty
        address counterparty = (_party == contract_.buyer) ? contract_.seller : contract_.buyer;
        
        // Transfer all collateral to the counterparty
        if (_party == contract_.buyer) {
            // If buyer is liquidated, transfer their ETH collateral to seller
            payable(counterparty).transfer(contract_.collateralAmount / 2);
        } else {
            // If seller is liquidated, transfer their token collateral to buyer
            require(gpuToken.transfer(counterparty, contract_.collateralAmount / 2), "Token transfer failed");
        }
        
        emit ContractLiquidated(_contractId, _party);
    }
    
    /**
     * @dev Check if liquidation conditions are met
     * @param _contractId ID of the contract to check
     * @param _party Address of the party to check
     * @return canLiquidate Whether liquidation conditions are met
     */
    function _checkLiquidationCondition(uint256 _contractId, address _party) internal view returns (bool) {
        // In a real implementation, this would check price feeds and calculate if
        // the position is undercollateralized based on current market prices
        // For simplicity, we're just checking if the contract exists and is not settled
        FuturesContract storage contract_ = futuresContracts[_contractId];
        return (!contract_.settled && (_party == contract_.buyer || _party == contract_.seller));
    }
    
    /**
     * @dev Get all orders for a user
     * @param _user Address of the user
     * @return orderIds Array of order IDs
     */
    function getUserOrders(address _user) external view returns (uint256[] memory) {
        return userOrders[_user];
    }
    
    /**
     * @dev Get all contracts for a user
     * @param _user Address of the user
     * @return contractIds Array of contract IDs
     */
    function getUserContracts(address _user) external view returns (uint256[] memory) {
        return userContracts[_user];
    }
    
    /**
     * @dev Update collateral requirement percentage (only owner)
     * @param _newRequirementPercent New collateral requirement percentage
     */
    function updateCollateralRequirement(uint256 _newRequirementPercent) external onlyOwner {
        require(_newRequirementPercent > 0 && _newRequirementPercent <= 100, "Invalid percentage");
        collateralRequirementPercent = _newRequirementPercent;
        emit CollateralRequirementUpdated(_newRequirementPercent);
    }
    
    /**
     * @dev Update liquidation threshold percentage (only owner)
     * @param _newThresholdPercent New liquidation threshold percentage
     */
    function updateLiquidationThreshold(uint256 _newThresholdPercent) external onlyOwner {
        require(_newThresholdPercent > 0 && _newThresholdPercent <= 100, "Invalid percentage");
        liquidationThresholdPercent = _newThresholdPercent;
        emit LiquidationThresholdUpdated(_newThresholdPercent);
    }
    
    /**
     * @dev Update platform fee percentage (only owner)
     * @param _newFeePercent New platform fee percentage
     */
    function updatePlatformFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 10, "Fee too high"); // Cap at 10%
        platformFeePercent = _newFeePercent;
        emit PlatformFeeUpdated(_newFeePercent);
    }
    
    /**
     * @dev Withdraw platform fees (only owner)
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    // Pause/unpause functionality for emergency stops
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Fallback and receive functions to accept ETH
    receive() external payable {}
    fallback() external payable {}
}