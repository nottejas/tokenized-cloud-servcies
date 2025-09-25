import { useState } from "react";
import "./App.css";

// Import components
import WalletConnect from "./components/WalletConnect";
import ContractStats from "./components/ContractStats";
import UserAccount from "./components/UserAccount";
import PurchaseForm from "./components/PurchaseForm";
import RedeemForm from "./components/RedeemForm";
import FuturesTrading from "./components/FuturesTrading";

function App() {
  const [walletInfo, setWalletInfo] = useState(null);
  const [balance, setBalance] = useState(null);
  const [activeTab, setActiveTab] = useState("purchase");
  const [activeSection, setActiveSection] = useState("spot");

  // Handle wallet connection
  const handleWalletConnect = (info) => {
    setWalletInfo(info);
  };

  // Handle transaction completion
  const handleTransactionComplete = () => {
    // Refresh data after transaction
    setWalletInfo({ ...walletInfo });
  };

  // Update balance from UserAccount component
  const updateBalance = (newBalance) => {
    setBalance(newBalance);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>GPU Compute Token System</h1>
        <WalletConnect onConnect={handleWalletConnect} />
      </header>

      {walletInfo && walletInfo.address ? (
        <main className="app-content">
          <UserAccount
            address={walletInfo.address}
            onBalanceUpdate={updateBalance}
          />

          <ContractStats isConnected={!!walletInfo} />

          <div className="action-container">
            {/* Section Tabs */}
            <div className="section-tabs">
              <button
                className={`section-tab ${
                  activeSection === "spot" ? "active" : ""
                }`}
                onClick={() => setActiveSection("spot")}
              >
                Spot Market
              </button>
              <button
                className={`section-tab ${
                  activeSection === "futures" ? "active" : ""
                }`}
                onClick={() => setActiveSection("futures")}
              >
                Futures Market
              </button>
            </div>

            {/* Spot Section */}
            {activeSection === "spot" && (
              <div>
                <div className="tabs">
                  <button
                    className={`tab ${
                      activeTab === "purchase" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("purchase")}
                  >
                    Purchase GPU Hours
                  </button>
                  <button
                    className={`tab ${
                      activeTab === "redeem" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("redeem")}
                  >
                    Redeem GPU Hours
                  </button>
                </div>

                <div className="tab-content">
                  {activeTab === "purchase" && (
                    <PurchaseForm
                      address={walletInfo.address}
                      onPurchaseComplete={handleTransactionComplete}
                    />
                  )}

                  {activeTab === "redeem" && (
                    <RedeemForm
                      address={walletInfo.address}
                      balance={balance}
                      onRedeemComplete={handleTransactionComplete}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Futures Section */}
            {activeSection === "futures" && (
              <FuturesTrading
                address={walletInfo.address}
                onTransactionComplete={handleTransactionComplete}
              />
            )}
          </div>
        </main>
      ) : (
        <div className="connect-prompt">
          <h2>Welcome to GPU Compute Token System</h2>
          <p>Connect your wallet to purchase and redeem GPU compute hours.</p>
        </div>
      )}
    </div>
  );
}

export default App;
