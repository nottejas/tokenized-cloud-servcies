import { useState } from 'react';
import { redeemGPUHours } from '../utils/ethereum';

const RedeemForm = ({ address, balance, onRedeemComplete }) => {
  const [hours, setHours] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (hours <= 0) {
      setError('Please enter a valid number of GPU hours');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setTxHash('');
    
    try {
      const tx = await redeemGPUHours(hours);
      setTxHash(tx.hash);
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Reset form
      setHours(1);
      
      // Notify parent component
      if (onRedeemComplete) {
        onRedeemComplete();
      }
    } catch (err) {
      console.error('Redeem error:', err);
      setError(err.message || 'Failed to redeem GPU hours. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="redeem-form">
      <h2>Redeem GPU Hours</h2>
      
      {balance && (
        <p className="balance-info">
          Available Balance: {balance} GPUC
        </p>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="redeem-hours">Number of GPU Hours to Redeem:</label>
          <input
            type="number"
            id="redeem-hours"
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value) || 0)}
            min="1"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting || !address}
          className="submit-button"
        >
          {isSubmitting ? 'Processing...' : 'Redeem'}
        </button>
      </form>
      
      {error && <p className="error-message">{error}</p>}
      
      {txHash && (
        <div className="transaction-info">
          <p>Transaction submitted!</p>
          <p className="tx-hash">
            <strong>Transaction Hash:</strong> {txHash}
          </p>
        </div>
      )}
    </div>
  );
};

export default RedeemForm;