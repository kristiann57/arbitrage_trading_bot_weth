require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

const COMPILERS = [
  {
    version: '0.7.1',
  },
  {
    version: '0.8.10',
  },
  {
    version: '0.8.13',
  },
  {
    version: '0.8.21',
  },
  {
    version: '0.6.12',
  },
  {
    version: '0.6.0',
  },
  {
    version: '0.5.12',
  },
  {
    version: '0.4.24',
  },
];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
      compilers: COMPILERS,
    }, 
  networks: {
    hardhat: {
      accounts: {
        accountsBalance: "1000000000000000000000000", // 100,000 ETH in wei
      },
      forking: {
        url: 'https://goerli.infura.io/v3/ddece3f0d7a54f1d8b9f19a78fe75e5a',
        //blockNumber: 10315775, // Replace with a recent block number
      },
    },
    sepolia: {
      url: "http://34.125.111.8:8545",
      chainId: 11155111,
    },
    goerli : {
      url: process.env.GOERLI,
      accounts: [process.env.PRIV_KEY],
      chainId: 5,
    }
  }
};
