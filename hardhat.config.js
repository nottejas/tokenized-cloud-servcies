require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28", // Updated to match your OpenZeppelin v5
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Ganache GUI default settings
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: [
        "0x999dd9020ed3fd16bebd0bdf29c4d3e8569075f0d8d32e7ca3fec3d3b842b29b",
        "0x7f24b1030b23749a21a43730c74df2e2224ea02ffa93f455acdb87d1207f7267"
      ],
      chainId: 1337, // 👈 match Ganache actual chainId
      gas: 6000000,
      gasPrice: 20000000000
    },

    // Alternative for Ganache CLI (if you're using CLI instead)
    ganache_cli: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0x999dd9020ed3fd16bebd0bdf29c4d3e8569075f0d8d32e7ca3fec3d3b842b29b",
        "0x7f24b1030b23749a21a43730c74df2e2224ea02ffa93f455acdb87d1207f7267"
      ],
      chainId: 5777,
      gas: 6000000,
      gasPrice: 20000000000
    },
    // Alternative localhost connection
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 5777
    },
    // Hardhat local network
    hardhat: {
      chainId: 5777,
      accounts: {
        count: 10,
        accountsBalance: "10000000000000000000000" // 10,000 ETH each
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};