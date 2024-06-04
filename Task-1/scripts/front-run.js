const ethers = require('ethers');
require('dotenv').config();

// Router Addresses:
const UNISWAP_ROUTER_SEPOLLIA = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD"; 
const UNISWAP_ROUTER_GOERLI = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; //UniswapV2
const UNISWAP_ROUTER_MAINNET = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; //UniswapV2

// WETH ADDRESS
const WETH_SEPOLIA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
const WETH_GOERLI = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
let WETH;

// contract ABI
const contractABI = [
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"
  ];

const frontRuncontractABI = [

];

// set the right variables
const MODE = "MAINNET"
let PROV = process.env[MODE]

if (MODE == "GOERLI") {
    UNISWAP_ROUTER = UNISWAP_ROUTER_GOERLI;
    WETH = WETH_GOERLI;
    
} if (MODE == "SEPOLIA") {
    UNISWAP_ROUTER = UNISWAP_ROUTER_SEPOLLIA;
    WETH = WETH_SEPOLIA;
    
} if (MODE == "MAINNET") {
    UNISWAP_ROUTER = UNISWAP_ROUTER_MAINNET;
    WETH = WETH_MAINNET;
    
}

// Connect to your node provider
const provider = new ethers.providers.JsonRpcProvider(PROV);


const main = async () => {
  // Connect to deployed contract
  const frontRunAddress = "";

  // const frontRunContract = new ethers.Contract(frontRunAddress, frontRuncontractABI, provider);
  console.log("i am here before balance")
  console.log(await provider.getBalance(WETH));
  console.log("i am here after balance")
  try {
    // Check if we're connected to the network
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (${network.chainId})`);

    // create UNISWAP contract object to interact and parse transaction data
    const UniswapRouterContract = new ethers.Contract(UNISWAP_ROUTER, contractABI, provider);

    
    // Accessing the txpool content
    const pendingBlock = await provider.send("eth_getBlockByNumber", [
        "pending",
        true,
      ]);

    for (let i = 0; i < pendingBlock.transactions.length; i++ ) {
        // we want to filter out all tx that do not interact with Uniswap
        let currentTx = pendingBlock.transactions[i];
        //console.log(currentTx.value, parseInt(currentTx.value, 16))
        if (currentTx.to === null || currentTx.input == "0x") {
            continue;
        }
        // Is the address being called the UNISWAP router contract?
        if (currentTx.to.toLowerCase() != UNISWAP_ROUTER.toLowerCase()) {
            continue;
        } 
        // Only swaps with at least 0.05 ETH in value
        if (parseInt(currentTx.value, 16) <= ethers.utils.parseEther("0.05")) {
           continue;
        }
        // find the method called by the user, ensure the are calling the transfer method
        if (currentTx.input.slice(0,10) != "0x7ff36ab5") {
          continue;
        }

        console.log("found one");
        // Parsing the transcation so we can read arguments 
        let parsed = UniswapRouterContract.interface.parseTransaction({
            data: currentTx.input, value: currentTx.value
        });
        // if the first item in the path element is WETH, we proceed to front-run it
        if (parsed.args.path[0].toLowerCase() != WETH.toLowerCase()) {
          continue;
        }

        // conditions: Is there a slippage protection? if so, what is the slippage specified? it is profitable?
        // shall I make the profitability calculations on-hain or off-chain?
        // 1. get amounts out based on my total balance as amount in
        let AmountInFirst = await provider.getBalance(frontRunAddress);
        let amountsOutFirst = await UniswapRouterContract.getAmountsOut(AmountInFirst, parsed.args.path);
        // 2. check if the amonts received are already within the amountMinOut the user chose. If it is good, carry on, if not
          // lower the amount by 20% and try again
        if (amountsOutFirst < currentTx.amountOutMin) {
          continue;
        }
        // 3. If it is good, simulate the change in reserves and getAmountsOut using the amountIn provided by the victim, if it is within

          // the limit, then proceed to execute the front-run
          // NODES:
          // make all calculation off-chain
          // stick to your NODE for reading txPool data
          // FLashbots - use MEV-Boost
          // keep calculations simple, reduce latency As much as you can
          // avoid Uniswap, too congested and loads of competition, more secluded tokens and DEXES 
          // avoid mainnet, stick to L2's.... be aware of liquidity of the pair pools
          // 
        
        

        // deploy contract and execute the front run function
        console.log(parsed.args.amountOutMin)
        
            
    }  
    setTimeout(main, 5000);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    setTimeout(main, 5000);
  }
};

main();




/*

TransactionDescription {
  args: [
    BigNumber { _hex: '0x0250ccf4b22164da768b', _isBigNumber: true },
    [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      '0x34Be5b8C30eE4fDe069DC878989686aBE9884470'
    ],
    '0x0e26c1bfc132e69307f02dCF5bE8187583eb65D1',
    BigNumber { _hex: '0x654bdaaf', _isBigNumber: true },
    amountOutMin: BigNumber { _hex: '0x0250ccf4b22164da768b', _isBigNumber: true },
    path: [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      '0x34Be5b8C30eE4fDe069DC878989686aBE9884470'
  name: 'swapExactETHForTokens',
  signature: 'swapExactETHForTokens(uint256,address[],address,uint256)',
  sighash: '0x7ff36ab5',
  value: BigNumber { _hex: '0x06f05b59d3b20000', _isBigNumber: true }

  */