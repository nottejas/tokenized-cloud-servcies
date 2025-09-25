import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import GPUFuturesABI from '../GPUFutures.json'
import GPUTokenABI from '../GPUToken.json'

const FuturesTrading = ({ address, onTransactionComplete }) => {
  // State variables
  const [orderType, setOrderType] = useState('buy') // 'buy' or 'sell'
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [expirationDays, setExpirationDays] = useState('7')
  const [userOrders, setUserOrders] = useState([])
  const [userContracts, setUserContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('createOrder')
  
  // Contract addresses - replace with your deployed contract addresses
  const gpuFuturesAddress = "" // TODO: Replace with deployed contract address
  const gpuTokenAddress = "" // TODO: Replace with deployed contract address
  
  useEffect(() => {
    if (address) {
      loadUserData()
    }
  }, [address])
  
  const loadUserData = async () => {
    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      const futuresContract = new ethers.Contract(
        gpuFuturesAddress,
        GPUFuturesABI.abi,
        signer
      )
      
      // Load user orders
      const orderIds = await futuresContract.getUserOrders(address)
      const orders = await Promise.all(
        orderIds.map(async (id) => {
          const order = await futuresContract.orders(id)
          return {
            id: id.toString(),
            orderType: order.orderType === 0 ? 'Buy' : 'Sell',
            price: ethers.formatEther(order.price),
            quantity: order.quantity.toString(),
            status: ['Open', 'Filled', 'Cancelled', 'Expired', 'Liquidated'][order.status],
            expirationDate: new Date(Number(order.expirationDate) * 1000).toLocaleDateString()
          }
        })
      )
      
      // Load user contracts
      const contractIds = await futuresContract.getUserContracts(address)
      const contracts = await Promise.all(
        contractIds.map(async (id) => {
          const contract = await futuresContract.futuresContracts(id)
          return {
            id: id.toString(),
            price: ethers.formatEther(contract.price),
            quantity: contract.quantity.toString(),
            expirationDate: new Date(Number(contract.expirationDate) * 1000).toLocaleDateString(),
            buyer: contract.buyer,
            seller: contract.seller,
            role: contract.buyer === address ? 'Buyer' : 'Seller',
            settled: contract.settled ? 'Settled' : 'Active'
          }
        })
      )
      
      setUserOrders(orders)
      setUserContracts(contracts)
      setLoading(false)
    } catch (err) {
      console.error('Error loading user data:', err)
      setError('Failed to load your orders and contracts')
      setLoading(false)
    }
  }
  
  const handleCreateOrder = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      const futuresContract = new ethers.Contract(
        gpuFuturesAddress,
        GPUFuturesABI.abi,
        signer
      )
      
      const tokenContract = new ethers.Contract(
        gpuTokenAddress,
        GPUTokenABI.abi,
        signer
      )
      
      const priceWei = ethers.parseEther(price)
      const quantityNum = parseInt(quantity)
      const expirationDate = Math.floor(Date.now() / 1000) + (parseInt(expirationDays) * 86400) // Current time + days in seconds
      
      // Calculate required collateral (20% of total value)
      const totalValue = priceWei * BigInt(quantityNum)
      const requiredCollateral = (totalValue * BigInt(20)) / BigInt(100)
      
      let tx
      
      if (orderType === 'buy') {
        // For buy orders, send ETH as collateral
        tx = await futuresContract.createOrder(
          0, // BUY
          priceWei,
          quantityNum,
          expirationDate,
          { value: requiredCollateral }
        )
      } else {
        // For sell orders, approve token transfer first
        const approveTx = await tokenContract.approve(gpuFuturesAddress, requiredCollateral)
        await approveTx.wait()
        
        // Then create the sell order
        tx = await futuresContract.createOrder(
          1, // SELL
          priceWei,
          quantityNum,
          expirationDate
        )
      }
      
      await tx.wait()
      setSuccess(`${orderType.charAt(0).toUpperCase() + orderType.slice(1)} order created successfully!`)
      setLoading(false)
      
      // Reset form
      setPrice('')
      setQuantity('')
      setExpirationDays('7')
      
      // Refresh data
      loadUserData()
      if (onTransactionComplete) onTransactionComplete()
    } catch (err) {
      console.error('Error creating order:', err)
      setError('Failed to create order. Please check your inputs and try again.')
      setLoading(false)
    }
  }
  
  const handleCancelOrder = async (orderId) => {
    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      const futuresContract = new ethers.Contract(
        gpuFuturesAddress,
        GPUFuturesABI.abi,
        signer
      )
      
      const tx = await futuresContract.cancelOrder(orderId)
      await tx.wait()
      
      setSuccess('Order cancelled successfully!')
      loadUserData()
      if (onTransactionComplete) onTransactionComplete()
      setLoading(false)
    } catch (err) {
      console.error('Error cancelling order:', err)
      setError('Failed to cancel order')
      setLoading(false)
    }
  }
  
  const handleSettleContract = async (contractId) => {
    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      const futuresContract = new ethers.Contract(
        gpuFuturesAddress,
        GPUFuturesABI.abi,
        signer
      )
      
      const tx = await futuresContract.settleContract(contractId)
      await tx.wait()
      
      setSuccess('Contract settled successfully!')
      loadUserData()
      if (onTransactionComplete) onTransactionComplete()
      setLoading(false)
    } catch (err) {
      console.error('Error settling contract:', err)
      setError('Failed to settle contract. It may not be expired yet.')
      setLoading(false)
    }
  }
  
  return (
    <div className="futures-trading-container">
      <h2>GPU Futures Trading</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'createOrder' ? 'active' : ''}`}
          onClick={() => setActiveTab('createOrder')}
        >
          Create Order
        </button>
        <button 
          className={`tab ${activeTab === 'myOrders' ? 'active' : ''}`}
          onClick={() => setActiveTab('myOrders')}
        >
          My Orders
        </button>
        <button 
          className={`tab ${activeTab === 'myContracts' ? 'active' : ''}`}
          onClick={() => setActiveTab('myContracts')}
        >
          My Contracts
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'createOrder' && (
          <form onSubmit={handleCreateOrder} className="order-form">
            <div className="form-group">
              <label>Order Type:</label>
              <div className="radio-group">
                <label>
                  <input 
                    type="radio" 
                    value="buy" 
                    checked={orderType === 'buy'} 
                    onChange={() => setOrderType('buy')} 
                  />
                  Buy
                </label>
                <label>
                  <input 
                    type="radio" 
                    value="sell" 
                    checked={orderType === 'sell'} 
                    onChange={() => setOrderType('sell')} 
                  />
                  Sell
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label>Price per GPU Hour (ETH):</label>
              <input 
                type="number" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)}
                step="0.001"
                min="0.000001"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Quantity (GPU Hours):</label>
              <input 
                type="number" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Expiration (Days):</label>
              <select 
                value={expirationDays} 
                onChange={(e) => setExpirationDays(e.target.value)}
              >
                <option value="1">1 Day</option>
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
            
            <div className="form-group">
              <p className="info-text">
                <strong>Note:</strong> {orderType === 'buy' ? 'Buy' : 'Sell'} orders require 20% collateral.
                {orderType === 'buy' ? ' Collateral will be paid in ETH.' : ' Collateral will be paid in GPU tokens.'}
              </p>
            </div>
            
            <button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Create Order'}
            </button>
          </form>
        )}
        
        {activeTab === 'myOrders' && (
          <div className="orders-list">
            <h3>My Orders</h3>
            {loading ? (
              <p>Loading orders...</p>
            ) : userOrders.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Price (ETH)</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Expiration</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.orderType}</td>
                      <td>{order.price}</td>
                      <td>{order.quantity}</td>
                      <td>{order.status}</td>
                      <td>{order.expirationDate}</td>
                      <td>
                        {order.status === 'Open' && (
                          <button 
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No orders found.</p>
            )}
          </div>
        )}
        
        {activeTab === 'myContracts' && (
          <div className="contracts-list">
            <h3>My Contracts</h3>
            {loading ? (
              <p>Loading contracts...</p>
            ) : userContracts.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Role</th>
                    <th>Price (ETH)</th>
                    <th>Quantity</th>
                    <th>Expiration</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userContracts.map((contract) => (
                    <tr key={contract.id}>
                      <td>{contract.id}</td>
                      <td>{contract.role}</td>
                      <td>{contract.price}</td>
                      <td>{contract.quantity}</td>
                      <td>{contract.expirationDate}</td>
                      <td>{contract.settled}</td>
                      <td>
                        {contract.settled === 'Active' && (
                          <button 
                            onClick={() => handleSettleContract(contract.id)}
                            disabled={loading}
                          >
                            Settle
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No contracts found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FuturesTrading