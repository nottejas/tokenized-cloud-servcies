import { useState, useEffect } from 'react';
import { getContractStats } from '../utils/ethereum';

const ContractStats = ({ isConnected }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Fetch contract stats when connected
  useEffect(() => {
    if (isConnected) {
      fetchStats();
    } else {
      setStats(null);
    }
  }, [isConnected]);
  
  // Function to fetch contract stats
  const fetchStats = async () => {
    setLoading(true);
    setError('');
    
    try {
      const contractStats = await getContractStats();
      setStats(contractStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load contract statistics');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    fetchStats();
  };
  
  if (!isConnected) {
    return null;
  }
  
  return (
    <div className="contract-stats">
      <div className="stats-header">
        <h2>Contract Statistics</h2>
        <button onClick={handleRefresh} disabled={loading} className="refresh-button">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error && <p className="error-message">{error}</p>}
      
      {loading && !stats && <p>Loading statistics...</p>}
      
      {stats && (
        <div className="stats-grid">
          <div className="stat-item">
            <h3>Token Info</h3>
            <p><strong>Name:</strong> {stats.name}</p>
            <p><strong>Symbol:</strong> {stats.symbol}</p>
            <p><strong>Total Supply:</strong> {stats.totalSupply} {stats.symbol}</p>
            <p><strong>Price per Hour:</strong> {stats.pricePerToken} ETH</p>
          </div>
          
          <div className="stat-item">
            <h3>GPU Resources</h3>
            <p><strong>Available Hours:</strong> {stats.totalAvailable}</p>
            <p><strong>Hours Used:</strong> {stats.totalUsed}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractStats;