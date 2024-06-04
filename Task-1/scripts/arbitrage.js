const { performance } = require('perf_hooks');
let startTime = performance.now();

const ethers = require('ethers');
require('dotenv').config();
const fs = require('fs').promises;
const {tradeProfit, optimalTradeSize } = require('./helpers/profitCalculations');
const BigNumber = require('bignumber.js');

const {FlashbotsBundleProvider,} = require('flashbots-ethers-v6-provider-bundle');
const { FlashbotsBundleResolution } = require('flashbots-ethers-v6-provider-bundle');


// Router Addresses: ---------------
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Mainnet & Gerli
const SUSHISWAP_ROUTER_MAINNET = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";
const SUSHISWAP_ROUTER_GOERLI = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
let SUSHISWAP_ROUTER; 


// Factory Addresses: ---------------
const UNISWAP_FACTORY_MAINNET = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // Uniswap V2 Factory
const UNISWAP_FACTORY_GOERLI = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // Uniswap V2 Factory
let FACTORY;

// WETH ADDRESS ---------------
const WETH_SEPOLIA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
const WETH_GOERLI = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
let WETH;

//FIND RESERVES contract --------------
const FIND_RESERVES_CONTRACT_GOERLI = "0x296E78c014E5d21e0D01828547904Cee6b5977CF"; // querycontractaddress
let FIND_RESERVES_CONTRACT;






// FLASHBOTS variables ----------------

// flashbot provider ith Alchemy URL
const FB_provider = new ethers.JsonRpcProvider(process.env.GOERLI_ALCHEMY);

const FLASHBOT_ENDPOINT = "https://relay-goerli.flashbots.net";

// create wallet
const wallet = new ethers.Wallet(process.env.PRIV_KEY,FB_provider ) // this is the actual signer/wallet
const authSigner = new ethers.Wallet("0x2000000000000000000000000000000000000000000000000000000000000000"); // for auth purposes only

// FlashBot Provider Object
let flashbotsProvider; // this is just the declaration, the object creation happens below

//chainId
const chainId = 5; // Hay que cambiarla en production to maainnet


// Arbitrage contract ABI
arbitrageContractABI = [
    "function executeTrade(address[] calldata _poolPairs, address[] memory _path, uint256 _amountIn) external",
    "function getWeth(uint _amount) external",
    "function withdraw(uint256 amountToWithdraw) external"
    ]

// Arbitrage Contract
const arbitrageContractAddress = "0x476B3B9E252D318bb050081ef46c953fFBfEaee4"; // contract where the magic happens 0x2afBe7056179793249910E9876DdDa0220737532
const arbitrageContract = new ethers.Contract(arbitrageContractAddress, arbitrageContractABI, FB_provider);
const arbitrageContractWithSigner = arbitrageContract.connect(wallet);

// Gas BURNER
const GasBurner = "0x3760661A9ebA9DEbF2cd67736b222325E15BB010"; // this is for testing flashbots

const GWEI = 10n ** 9n; // 1 Gwei in Wei
const PRIORITY_FEE = GWEI * 2n; // 3 Gwei in Wei IN MAINNET / 2 GWEI in goerli
const LEGACY_GAS_PRICE = GWEI * 12n; // 12 Gwei in Wei
const BLOCKS_IN_THE_FUTURE = 2; // Regular number, not a BigInt





// GENERAL VARIABLES INFO --------------------------

// set the right variables
const MODE = "GOERLI"
let PROV = process.env[MODE]

if (MODE == "GOERLI") {
    WETH = WETH_GOERLI;
    FACTORY = UNISWAP_FACTORY_GOERLI;
    FIND_RESERVES_CONTRACT = FIND_RESERVES_CONTRACT_GOERLI;
    SUSHISWAP_ROUTER = SUSHISWAP_ROUTER_GOERLI;
    
} if (MODE == "SEPOLIA") {
    WETH = WETH_SEPOLIA;
    
} if (MODE == "MAINNET") {
    WETH = WETH_MAINNET;
    FACTORY = UNISWAP_FACTORY_MAINNET;
    SUSHISWAP_ROUTER = SUSHISWAP_ROUTER_MAINNET;

}

// list of providers
let goerliNodes = [
    process.env.GOERLI,
    process.env.GOERLI_ALCHEMY,
    process.env.GOERLI_QUICKNODE
]

let goerliProviders = [];
for (const node of goerliNodes) {
    const provider = new ethers.JsonRpcProvider(node);
    goerliProviders.push(provider);
}


// Connect to your node provider
const provider = new ethers.JsonRpcProvider(PROV);

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

/// ----------- HLEPRS ---------///
// function to replace bigInt for stings
function replacer(key, value) {
    // If the value is a BigInt, convert it to a string
    if (typeof value === 'bigint') {
        return value.toString();
    } else {
        return value; // Otherwise, return the value as is
    }
}

// ------------ READ ALL PAIRS GATHERED BY THE EVENTS SCRIPT --------------- //

async function readPairsData() {
    try {
        const data = await fs.readFile('scripts/pairsData.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading pairs data:", error);
        return null; // or handle the error as appropriate
    }
}

async function findPoolsToTrade() {
    const allPools = await readPairsData();
    pair_pool_dict = {}
    for (let key in allPools) {
        // make sure WETH is one of the tokens in the pool
        
        if (WETH != allPools[key].token0 && WETH != allPools[key].token1) {
            continue
        }
        let pair = [allPools[key].token0, allPools[key].token1];
        // make sure the same pair is not already registered in the poo_dict object, if is not, create a new array with the pair
        
        if ( !(pair in pair_pool_dict) ) {
            console.log("adding new pair to the pairpool dict");
            pair_pool_dict[pair] = []; // Initialize with an empty array or appropriate value
        } 
        // add the pool to the list inside the object
        pair_pool_dict[pair].push(allPools[key]);
        console.log("the pair is already in pair_pool_dict, so just appending the object")
        
        //console.log(key)
        // a few prints for visualization
    }
    console.log(`we found ${Object.keys(pair_pool_dict).length} total numbers of diferent unique pools`)
    console.log("now we're going to only keep the ones with more than two pools in there")

    final_pool_dict = {} // this is the pool with only more than one pool
    for (let key in pair_pool_dict) {
        if (pair_pool_dict[key].length > 1) {
            console.log("this is the key: ", key);
            // console.log("the following pool has more than one pools in different dex's, you can trade it")
            // console.log(pair_pool_dict[key])
            final_pool_dict[key] = pair_pool_dict[key];
            //final_pool_dict[]
        }
    }

    console.log(`we found ${Object.keys(final_pool_dict).length} pools that can be traded!`)

    // save the final pool dict into a JSON file
    try {
        const jsonData = JSON.stringify(final_pool_dict, null, 2); // Converts the object to a JSON string
        await fs.writeFile('scripts/finalPoolData.json', jsonData); // Writes the JSON string to a file
        console.log('Data saved to finalPoolData.json');
    } catch (error) {
        console.error('Error saving data to file:', error);
    }

}
async function readFinalPoolData() {
    try {
        const data = await fs.readFile('scripts/finalPoolData.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading pairs data:", error);
        return error; // or handle the error as appropriate
    }
}

async function toFetch() {
    let data = await readFinalPoolData();
    
    let toFetch = [];
    i = 0;
    
    for (const poolObjectList of Object.values(data)) {
        for (const objectPool of poolObjectList) {
            toFetch.push(objectPool.pair);
        }
    }

    console.log(`we have ${toFetch.length} addresses to call now`)
    // console.log(toFetch);
    return toFetch;

}


async function getReservesParallel(pairs, providers, chunkSize = 250) {
    // Create the contract objects
    const contracts = providers.map(provider => 
        new ethers.Contract(FIND_RESERVES_CONTRACT, findReservesABI, provider)
    );

    // Create a list of chunks of pair addresses
    const chunks = [];
    for (let i = 0; i < pairs.length; i += chunkSize) {
        chunks.push(pairs.slice(i, i + chunkSize));
    }

    // Assign each chunk to a provider in a round-robin fashion and prepare the call
    const tasks = chunks.map((chunk, index) => 
        contracts[index % contracts.length].getReservesByPairs(chunk)
    );

    // Run the tasks in parallel
    const results = await Promise.all(tasks);

    // Flatten the results
    return results.flat();
}

///// --------- FLASHBOTS SET UP ------------------///
async function flashBotBundle(
    gasLimit, data
    ) {

//     //Debugging
//     const gasLimit = 291350n;
//     const amountIn = 70836071123760000n;
//     const path =  [
//         '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
//   '0x326C977E6efc84E512bB9C30f76E30c160eD06FB'
//     ]
//     const poolPairs =  [
//         '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
//   '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
//     ]
//     const data = arbitrageContractWithSigner.interface.encodeFunctionData("executeTrade", [poolPairs, path, amountIn]); // deugging

        
    

    // we will try to send our tx on every block
    FB_provider.on("block", async (block) => {
    console.log(`block:  ${block}`);

    //get block
    const BLOCK = await provider.getBlock(block)
    console.log(`basefeepergas: ${BLOCK.baseFeePerGas}`)

    const maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(BLOCK.baseFeePerGas, BLOCKS_IN_THE_FUTURE)
    // send tx bundle
    const signed_tx = await flashbotsProvider.signBundle([
        {
            signer: wallet,
            transaction: {
            chainId: chainId, // needs to be tweaked in mainnet
            type: 2,
            maxFeePerGas: PRIORITY_FEE + maxBaseFeeInFutureBlock,
            maxPriorityFeePerGas: PRIORITY_FEE,
            gasLimit: gasLimit,
            value: 0,
            data: data,
            to: arbitrageContractAddress
            },
        },
    ]);
    // console.log(JSON.stringify(signed_tx, null, 2)); // uncomment for deubgging purposes
    const targetBlock = block + 1;
    // simulate tx before sending to the network
    console.log("voy a simular la tx")
    const sim = await flashbotsProvider.simulate(signed_tx, targetBlock);
    console.log("SIM: ---------", sim)
    
    if ("error" in sim.results[0]) {
        console.log("--------simulation error: ", sim.results[0].error);
    } else {
        console.log("++++++++simulation success");
        // console.log(sim)
        //console.log(JSON.stringify(sim, replacer, 2));
    }

    // if simulation successful, time to send/broadcast RAW TX bundle, thrrow error if error sending the tx
    const res = await flashbotsProvider.sendRawBundle(signed_tx, targetBlock);
    if ("error" in res) {
        throw new Error(res.error.message)
    }

    // we are going to get the budle resolution object that indicates if tx was mined
    const bundleResolution = await res.wait();
    if (bundleResolution === FlashbotsBundleResolution.BundleIncluded) {
        console.log("TX included in target block: ", targetBlock);
        console.log(JSON.stringify(sim, replacer, 2));
        process.exit(0);
    } else if (bundleResolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
        console.log("not included in target block: ", targetBlock)
    } else if (bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh) {
        console.log("nonce too high!, we're bailing");
        process.exit(1);
    }




    });

}

// get Weth for Arbitrage ontract
async function getWeth(amountToCHange) {
    await arbitrageContractWithSigner.getWeth(amountToCHange);
    console.log("We've exchanged ", amountToCHange, " Wei for WETH")
}

// get Weth for Arbitrage ontract
async function withdraw(amountToWithdraw) {
    await arbitrageContractWithSigner.withdraw(amountToWithdraw);
    console.log("We've withdrawn ", amountToWithdraw, " Wei")
}


/// -------- FIND OPORTUNITIES AND EXECUTE FLASHBOT TX RIGHT AWAY IF OPPORTUNITTY IS FOUND ------------////

async function findOpp(reservesList) {
    
    // create FLASHBOT PROVIDER
    flashbotsProvider = await FlashbotsBundleProvider.create( 
        FB_provider,
        authSigner,
        FLASHBOT_ENDPOINT
        );

    let opp = [];
    let index = 0;
    const finalPoolData = await readFinalPoolData();
    
    // calculate eth gas estimation:
    let gasPrice = await provider.getFeeData()
    console.log(gasPrice)
    gasPrice = gasPrice.gasPrice;

    for (const objectPairList of Object.values(finalPoolData)) {
        for (const objectPair of objectPairList) { // let's add the reserves in the reserve list object
            objectPair.reserves = reservesList[index];
            index++;           
        }
        
        for (const PoolA of objectPairList) { 
            for(const PoolB of objectPairList) {
                // if or some reason they share the same pool, skip
                if (PoolA.pair == PoolB.pair) continue;
                // if one of the reserves is 0, skip
                // we are using the bignumber built in library to check if there's a 0 in big number format
                const hasZeroReserve = array => array.some(bn => bn === 0n);
                if (hasZeroReserve(PoolA["reserves"]) || hasZeroReserve(PoolB["reserves"])) continue;

                // reservesA and B, ordering so the WETH address is always first
                let resA;
                let resB;
                if(PoolA.token0 == WETH) {
                    resA = [BigInt(PoolA.reserves[0].toString()), BigInt(PoolA.reserves[1].toString())];
                    resB = [BigInt(PoolB.reserves[0].toString()), BigInt(PoolB.reserves[1].toString())];
                    path = [PoolA.token0, PoolA.token1]
                } else {
                    resA = [BigInt(PoolA.reserves[1].toString()), BigInt(PoolA.reserves[0].toString())];
                    resB = [BigInt(PoolB.reserves[1].toString()), BigInt(PoolB.reserves[0].toString())];
                    path = [PoolA.token1, PoolA.token0]
                }

                //Compute value of optimal input through the formula
                const x = optimalTradeSize(resA, resB)// the output is a string value             

                //if optimal size is a negative number, skip (the reserves are reversed)
                if (x < 0) continue;

                // **************check if x is bigger than the contract balance, if it is, change X to the contract balance value and see if 
                // yelds any profit with the tradeProfit method************

                //Compute gross profit in Wei (before gas cost)
                const profit = tradeProfit(x, resA, resB)// the output is a string value

                // if profit is negative, skip
                if (profit < 0) continue;

                // prepare input for trade: This is necessary for the estiamte gas method too
                const amountIn = BigInt(Math.floor(x)); // make sure the number is an integer, this is the optimal trade figure

                // amountIn after truncation is 0, skip
                if (amountIn == 0) continue;

                const routerA = PoolA.factory == "uniswapV2" ? UNISWAP_ROUTER : SUSHISWAP_ROUTER;
                const routerB = PoolB.factory == "sushiswapV2" ? SUSHISWAP_ROUTER : UNISWAP_ROUTER;

                const poolPairs = [routerA, routerB];

                
                if (amountIn > ethers.parseEther("1")) continue; // debugging, need to find a dynamic way to adjust amount in if above funds
                // need to make sure the amount in (optimal trade) is not bigger than the balance of the contract
                
                

                // estiamte gas units 
                let estimatedGas; // declared outside the try-catch block so it can be used later on
                try{
                    estimatedGas = await arbitrageContractWithSigner.executeTrade.estimateGas(poolPairs, path, amountIn);
                } catch(error){
                    // Check if the error message contains 'UniswapV2: K'
                    if (error.message && error.message.includes("UniswapV2: K")) {
                        console.log("Encountered UniswapV2: K error, skipping...");
                        continue; // Continue to the next iteration of the loop
                    } else {
                        // Log other errors
                        console.log("!!!!!!!!---!!!!!!!!!! ERROR ESTIMATING GAS !!!!!!!!!!---!!!!!!");
                        console.log(error.message.slice(0, 130));
                        continue;
                    }
                }
                

                // estiamted gas including priority fee
                const estimatedGasWithBuffer = (estimatedGas * 125n) / 100n // we're giving 25% extra room to acocunt for potential changes
                const maxFeePerGas = gasPrice + PRIORITY_FEE; // Base fee per gas unit and Priority fee required for relayer (FB)
                const estimatedGasCost = maxFeePerGas * estimatedGasWithBuffer;

                const netProfitWei = new BigNumber(profit).minus(estimatedGasCost);

                // if profit still positive after the gas, then execute the flashbots trade inmediately
                const netProfitAfterGasWei = netProfitWei.minus(new BigNumber(estimatedGasCost)) ;                

                if (netProfitAfterGasWei < 0) continue;
                console.log("//////////////-----------------------------------------///////////////")
                console.log("Amount in: ", amountIn.toString()); // ---- DEBUGGING
                console.log("Path: ", path); // ---- DEBUGGING
                console.log("poolPairs: ", poolPairs); // ---- DEBUGGING
    
                console.log("Estimated gas limit: ", estimatedGasWithBuffer)
                console.log("Estimated gas cost: ", estimatedGasCost)
                // calculate netprofit after gas in different formats (ETH, USD)
                const netProfitAfterGasEth = netProfitAfterGasWei.dividedBy(new BigNumber(1e18)); //bignumber
                const netProfitAfterGasUSD = netProfitAfterGasEth.multipliedBy(new BigNumber(2000)) //bignumber
                console.log("**** Net Profit After Gas: ", netProfitAfterGasWei.toString(),"wei ---", netProfitAfterGasEth.toString(), "ETH ---", netProfitAfterGasUSD.toString(), "USD")
                // calculate percentage profit
                const earningPercentage = netProfitAfterGasWei.dividedBy(amountIn).multipliedBy(100);
                console.log("**** Percentage Profit: ", earningPercentage.toString(), "%");
               

                // now let's use the FLASHBOT function!!!
                // // Encode the function call
                const data = arbitrageContractWithSigner.interface.encodeFunctionData("executeTrade", [poolPairs, path, amountIn]);
                
                await flashBotBundle(estimatedGasWithBuffer, data);
                
                
                // append opportunitty to the opps array
                opp.push({
                    profit: profit / 1e18,
                    input: x / 1e18,
                    netProfitWei: netProfitWei,
                    //pair: pair,
                    poolA: PoolA,
                    factoryA: PoolA.factory,
                    poolB: PoolB,
                    factoryB: PoolB.factory,
                    path: path
                });

            }

        }
        

    }

    oppPositive = [];
    console.log(`we have ${opp.length} opportunitties`)
    for (const object of opp) {
        if (object.netProfitWei > 0) {
            oppPositive.push(object)
        }
    }
    console.log(`we have ${oppPositive.length} positive opportunitties`)


}



const main = async () => { 
    // await flashBotBundle();
    // findPoolsToTrade() // function saves in a SON file a list of objects with the diferent dex pools you can trade or any two sided pool
    let toFetchList = await toFetch();
    const reserves = await getReservesParallel(toFetchList, goerliProviders);
    
    
    await findOpp(reserves)
    
    // await getWeth(ethers.parseEther("1")); // USE WHEN CONTRACT IS LOW IN WETH
    // await withdraw(ethers.parseEther("0.1")); // USE WHEN NEED TO WITHDRAW

    // let endTime = performance.now();
    // console.log(`The process took ${endTime - startTime} milliseconds`);
}

main();

// calculate gas with estimate gas in order to calculate actual profit -- check maman's repo for estiamte gas
// send a transaction to take advantage of it
// send Manan the article about the bot