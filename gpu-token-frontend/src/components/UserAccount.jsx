import { useState, useEffect } from 'react';
import { getBalance, getGPUHoursUsed } from '../utils/ethereum';

const UserAccount = ({ address }) => {
  const [balance, setBalance] = useState(null);
  const [hoursUsed, setHoursUsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Fetch user data when address changes
  useEffect(() => {
    if (address) {
      fetchUserData();
    } else {
      setBalance(null);
      setHoursUsed(null);
    }
  }, [address]);
  
  // Function to fetch user data
  const fetchUserData = async () => {
    if (!address) return;
    
    setLoading(true);
    setError('');
    
    try {
      const [balanceData, hoursUsedData] = await Promise.all([
        getBalance(address),
        getGPUHoursUsed(address)
      ]);
      
      setBalance(balanceData);
      setHoursUsed(hoursUsedData);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load account information');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    fetchUserData();
  };
  
  if (!address) {
    return null;
  }
  
  return (
    <div className="user-account">
      <div className="account-header">
        <h2>Your Account</h2>
        <button onClick={handleRefresh} disabled={loading} className="refresh-button">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      <div className="account-address">
        <strong>Address:</strong> {address}
      </div>
      
      {error && <p className="error-message">{error}</p>}
      
      {loading && !balance && <p>Loading account data...</p>}
      
      {balance !== null && (
        <div className="account-stats">
          <div className="stat-item">
            <h3>Token Balance</h3>
            <p className="balance">{balance} GPUC</p>
          </div>
          
          {hoursUsed !== null && (
            <div className="stat-item">
              <h3>GPU Hours Used</h3>
              <p className="hours-used">{hoursUsed}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserAccount;