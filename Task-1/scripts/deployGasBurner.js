// const {ethers} = require('ethers');
// require('dotenv').config();
// // set the right variables
// const MODE = "GOERLI"
// const PROV = process.env.GOERLI

// const pvKey = process.env.PRIV_KEY;

// // Connect to a provider (e.g., Infura, Alchemy)
// const provider = new ethers.JsonRpcProvider('https://goerli.infura.io/v3/a84f22c9512c4234a51eae39c4b915ea');


// // Create a Wallet
// const signer = new ethers.Wallet(pvKey, provider);

// // Contract ABI
// const contractABI  = [
//     {
//       "anonymous": false,
//       "inputs": [
//         {
//           "indexed": false,
//           "internalType": "address",
//           "name": "sender",
//           "type": "address"
//         },
//         {
//           "indexed": false,
//           "internalType": "uint256",
//           "name": "gas",
//           "type": "uint256"
//         }
//       ],
//       "name": "waste",
//       "type": "event"
//     },
//     {
//       "stateMutability": "nonpayable",
//       "type": "fallback"
//     }
//   ]

// // contract Bytecode:
// const contractBytecode = "0x6080604052603c60005534801561001557600080fd5b50610101806100256000396000f3fe6080604052348015600f57600080fd5b507fd642944ff1fedb897411010a86c408f918f560b22485155792c18ab1ea00d1e4335a604051603f92919060a6565b60405180910390a15b6000545a11604857005b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000607b826052565b9050919050565b6089816072565b82525050565b6000819050919050565b60a081608f565b82525050565b600060408201905060b960008301856082565b60c460208301846099565b939250505056fea2646970667358221220d646c17a63624d606f273f0608b10967bb217d449af864b6a71cc38baf8bce7964736f6c63430008150033"

// async function deployContract() {
//     const factory = new ethers.ContractFactory(contractABI, contractBytecode, signer);
//     const contract = await factory.deploy(); // Add constructor arguments if needed
  
//     console.log("Deploying contract...");
//     await contract.deployed();
//     console.log("Contract deployed at:", contract.address);
//   }
  
//   deployContract().catch(console.error);

  // We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const lock = await hre.ethers.deployContract("GasBurner");

  await lock.waitForDeployment();

  console.log(
    `deployed to ${lock.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
