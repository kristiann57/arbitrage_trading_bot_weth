const {ethers} = require('ethers');
require('dotenv').config();
const fs = require('fs').promises;

// Uniswap Factory COntract Address
const UNISWAP_FACTORY_MAINNET = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // Uniswap V2 Factory
const UNISWAP_FACTORY_GOERLI = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // Uniswap V2 Factory
let FACTORY;

// WETH ADDRESS
const WETH_GOERLI = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
let WETH;

// ROUTER
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Mainnet & Gerli
const SUSHISWAP_ROUTER_MAINNET = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";
const SUSHISWAP_ROUTER_GOERLI = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
let SUSHISWAP_ROUTER; 

//FInd pairs contract
const FIND_RESERVES_CONTRACT_GOERLI = "0x296E78c014E5d21e0D01828547904Cee6b5977CF";
let FIND_RESERVES_CONTRACT;

// set the right variables
const MODE = "GOERLI"
let PROV = process.env[MODE]

if (MODE == "GOERLI") {
    FACTORY = UNISWAP_FACTORY_GOERLI;
    WETH = WETH_GOERLI;
    FIND_RESERVES_CONTRACT = FIND_RESERVES_CONTRACT_GOERLI;
    SUSHISWAP_ROUTER = SUSHISWAP_ROUTER_GOERLI;

} if (MODE == "MAINNET") {
    WETH = WETH_MAINNET;
    FACTORY = UNISWAP_FACTORY_MAINNET;
    SUSHISWAP_ROUTER = SUSHISWAP_ROUTER_MAINNET;

}

// Find Reserves ABI 
// Find Reserves ABI 
const findReservesABI = [
    {
      "inputs": [
        {
          "internalType": "contract IUniswapV2Pair[]",
          "name": "_pairs",
          "type": "address[]"
        }
      ],
      "name": "getReservesByPairs",
      "outputs": [
        {
          "internalType": "uint256[3][]",
          "name": "",
          "type": "uint256[3][]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]

// Factory ABI
const contractABIFactory = [
    "event PairCreated(address indexed token0, address indexed token1, address pair, uint)",
    "function feeTo() external view returns (address)",
    " function getPair(address tokenA, address tokenB) external view returns (address pair)",
    "function feeToSetter() external view returns (address)",
    "function allPairs(uint) external view returns (address pair)",
    "function allPairsLength() external view returns (uint)",
    "function createPair(address tokenA, address tokenB) external returns (address pair)",
    "function setFeeTo(address) external",
    "function setFeeToSetter(address) external"
];
// Connect to a provider (e.g., Infura, Alchemy)
const provider = new ethers.JsonRpcProvider(PROV);

// Create a contract instance of the FACTORY
const contract = new ethers.Contract(FACTORY, contractABIFactory, provider);

// // Contract instace of the FIND_RESERVES contract
// const contractFindReserves = new ethers.Contract(FIND_RESERVES_CONTRACT, findReservesABI, provider);

// Get all events function
async function getEventsRecursive(contract, _from, _to) {
    try {
        const events = await contract.queryFilter(contract.filters.PairCreated(), _from, _to);
        console.log("Found", events.length, "events between blocks", _from, "and", _to);
        return events;
    } catch (error) {
        if (error.code === 'SERVER_ERROR') {
            console.log("Too many events found between blocks", _from, "and", _to);
            const midBlock = Math.floor((_from + _to) / 2);
            const firstHalf = await getEventsRecursive(contract, _from, midBlock);
            const secondHalf = await getEventsRecursive(contract, midBlock + 1, _to);
            return firstHalf.concat(secondHalf);
        } else if (error.error && error.error.code === -32005) {
            console.log("Too many events found between blocks", _from, "and", _to);
            const midBlock = Math.floor((_from + _to) / 2);
            const firstHalf = await getEventsRecursive(contract, _from, midBlock);
            const secondHalf = await getEventsRecursive(contract, midBlock + 1, _to);
            return firstHalf.concat(secondHalf);
        }
        else {
            // Handle other errors
            console.error("An error occurred:", error);
            throw error;
        }
    }
}

//------------- READ FACTORIES from different uniswap V2 compatible DEX's-----------///
async function readFactories() {
    try {
        const data = await fs.readFile('./scripts/helpers/FactoriesV2Goerli.json', 'utf8');
        console.log("estoy leyendo Factories")
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading pairs data:", error);
        return null; // or handle the error as appropriate
    }
}

async function findPairs() {
    let toBlockNumber = await provider.getBlockNumber();
    // read all factoies available
    const factories = await readFactories();
    // declare an array of object which will hold all the pairs info
    let pairDataList = [];
    for (let key in factories) {
        if (factories.hasOwnProperty(key)) {
            // create contract factory instance using the factory information
            const contractFactory = new ethers.Contract(factories[key].factory, contractABIFactory, provider); 

            await getEventsRecursive(contractFactory, 0, toBlockNumber)
            .then(async events => {
                // Process the events here
                console.log(typeof events);
                console.log (events.length);

                
                for (let i =0; i < events.length; i++) {
                    // let router;
                    // if (key == "uniswapV2") {
                    //     router = UNISWAP_ROUTER;
                    // } else {
                    //     router = SUSHISWAP_ROUTER;
                    // }
                    let reservesObject = {
                        token0: events[i].args.token0,
                        token1: events[i].args.token1,
                        pair: events[i].args.pair,
                        // router: router,
                        factory: key
                    }

                    pairDataList.push(reservesObject);
                }        
                // let reserves = await contractFindReserves.getReservesByPairs(pairAddrList); -- reuse later
            })
            .catch(error => {
                console.error("Error fetching events:", error);
            });
        }
    }

    return pairDataList;
}


async function main() {
    try {
        let eventsObject = await findPairs();
        await fs.writeFile('scripts/pairsData.json', JSON.stringify(eventsObject, null, 2));
        console.log('Data saved to pairsData.json');
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

main();