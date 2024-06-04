const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { assert } = require("ethers");
const { ethers } = require("hardhat");



const UNISWAP_FACTORY_ADDRESS = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const SUSHISWAP_FACTORY_ADDRESS = "0xc35DADB65012eC5796536bD9864eD8773aBc74C4";
const SUSHISWAP_ROUTER_ADDRESS = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";


describe("ArbitrageTrade", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const ArbitrageContractFactory = await ethers.getContractFactory("ArbitrageTrade");
    const ArbitrageContract = await ArbitrageContractFactory.deploy();

    return { ArbitrageContract, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should onl be called by owner", async function () {
      const { ArbitrageContract, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

      expect(await ArbitrageContract.owner()).to.equal(await owner.getAddress());
    });

    it("Should fail if the execute trade is being called with a non-owner address", async function () {
      const { ArbitrageContract, otherAccount} = await loadFixture(deployOneYearLockFixture);

      try {
        // Attempt the transaction that is expected to fail
        await ArbitrageContract.connect(otherAccount).executeTrade(["0xc35DADB65012eC5796536bD9864eD8773aBc74C4", "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"], 
        ["0xc35DADB65012eC5796536bD9864eD8773aBc74C4", "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"], 1)

        // If the transaction does not fail, explicitly fail the test
        expect.fail("Transaction did not revert as expected");
      } catch (error) {
          // Log the error message
          console.log(error.message);

          // Optionally, assert specific properties of the error
          // e.g., checking if it's a revert error
          expect(error.message).to.include("revert");
      }
    });
  });

 /// ------------ TRADE TESTING SECTION------------------//////

  
  // we define a fixture to:
  //1 deploy an ERC20 token dummy token that will be used to artificially create an arbitrage opportunitty
  //2 make sure account has a lot of ether
  //3 calculate how much you need to put in two different pools in order to create an arbitrage opportnitty
  //4 create a pool in uniswap with the newly created ERC20 token and eth with the right amounts
  //5 create a pool in sushiswap with the newly created ERC20 token and eth with the right amounts
  //6 execute trade so the opportunitty is realised, passing the right arguments(paths and amounts...etc)

  describe("Arbitrage Trade", function () {
    let owner;
    let uniswapFactory;
    let sushiswapFactory;
    let weth;
    let arbitrageTrade;
    let uniswapRouter;
    let sushiswapRouter;

    before(async function () {
        [owner] = await ethers.getSigners();
        const provider = hre.ethers.provider//new ethers.JsonRpcProvider(process.env.GOERLI_ALCHEMY);
        console.log("balance right away: ", await provider.getBalance(owner.address))//------- debuuuggg

        //set all the amounts to add
        const AMOUNTS_MOCK_TOKEN_A = ethers.parseEther("9000");
        const AMOUNTS_MOCK_TOKEN_B = ethers.parseEther("4000");
        const AMOUNTS_WETH_A = ethers.parseEther("57");
        const AMOUNTS_WETH_B = ethers.parseEther("52");

        // Min amounts liquidity
        const MIN_AMOUNTS_MOCK_TOKEN_A = (AMOUNTS_MOCK_TOKEN_A * 90n) / 100n;
        const MIN_AMOUNTS_MOCK_TOKEN_B = (AMOUNTS_MOCK_TOKEN_B * 90n) / 100n;
        const MIN_AMOUNTS_WETH_A = (AMOUNTS_WETH_A * 90n) / 100n;
        const MIN_AMOUNTS_WETH_B = (AMOUNTS_WETH_B * 90n) / 100n;


        // ABI factory contract
        const { abi: uniswapFactoryAbi } = require('@uniswap/v2-core/build/UniswapV2Factory.json');

        // Initialize existing Uniswap and Sushiswap factory contracts
        uniswapFactory = await ethers.getContractAt(uniswapFactoryAbi, UNISWAP_FACTORY_ADDRESS);
        sushiswapFactory = await ethers.getContractAt(uniswapFactoryAbi, SUSHISWAP_FACTORY_ADDRESS);
        weth = await ethers.getContractAt("IWETH", "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6");

        // Initialize existing Uniswap and Sushiswap routers contracts
        uniswapRouter = await ethers.getContractAt("IUniswapRouter", UNISWAP_ROUTER_ADDRESS);
        sushiswapRouter = await ethers.getContractAt("IUniswapRouter", SUSHISWAP_ROUTER_ADDRESS);

        // Deploy ArbitrageTrade contract
        const ArbitrageTrade = await ethers.getContractFactory("ArbitrageTrade");
        arbitrageTrade = await ArbitrageTrade.deploy();

        // Getting some WETH
        await weth.deposit({value: ethers.parseEther("99900")}) // sending a lot of eth in echange for weth

        // deploy mock token
        const MockToken = await ethers.getContractFactory("MockToken");
        this.mockToken = await MockToken.deploy("MockToken", "MTK");

        // create the uniswap and sushiswap pair
        await uniswapFactory.createPair(weth.target, this.mockToken.target);
        await sushiswapFactory.createPair(weth.target, this.mockToken.target);

        // get the new Uniswap Pair
        this.uniPairAddress = await uniswapFactory.getPair(weth.target, this.mockToken.target);
        this.sushiPairAddress = await sushiswapFactory.getPair(weth.target, this.mockToken.target);
        console.log("New Uniswap Pair Address:", this.uniPairAddress);
        console.log("New Sushiswap Pair Address:", this.sushiPairAddress);

        // Approve the Uniswap & sushiswap Router to spend Mock Tokens & WETH
        await this.mockToken.approve(uniswapRouter.target, AMOUNTS_MOCK_TOKEN_A); 
        await this.mockToken.approve(sushiswapRouter.target, AMOUNTS_MOCK_TOKEN_B); 

        await weth.approve(uniswapRouter.target, AMOUNTS_WETH_A); 
        await weth.approve(sushiswapRouter.target, AMOUNTS_WETH_B);

        // add liquidity to the Uniswap and sushiswap pair contracts
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
        deadline1 = 1000000000000000000000000n
        // Add liquidity Uniswap
        console.log("---add liquidity Uniswap") // debuuuggg
        tx = await uniswapRouter.connect(owner).addLiquidity(
          weth.target,
          this.mockToken.target,
          AMOUNTS_WETH_A,
          AMOUNTS_MOCK_TOKEN_A,
          MIN_AMOUNTS_WETH_A,
          MIN_AMOUNTS_MOCK_TOKEN_A,
          owner.address,
          deadline
        );
        await tx.wait();

        // Add liquidity Sushiswap
        console.log("---add liquidity Sushiswap") // debuuuggg
        tx = await sushiswapRouter.connect(owner).addLiquidity(
          this.mockToken.target,
          weth.target,
          AMOUNTS_MOCK_TOKEN_B,
          AMOUNTS_WETH_B,
          MIN_AMOUNTS_MOCK_TOKEN_B,
          MIN_AMOUNTS_WETH_B,
          owner.address,
          deadline
        );
        await tx.wait();

        // send ETH to the Arbitrage contract for paying gas
        

        console.log("---sending eth to arbitrage contract") // debuuuggg
        console.log("balance after after: ",await provider.getBalance(owner.address))// ----------debuuuggg
        //console.log(await owner.getBalance())
        tx = await owner.sendTransaction({
          to: arbitrageTrade.target,
          value: ethers.parseEther("9500"), /// this is the substraction of the whale amount and the eth deposited to the weth account 
        });
        await tx.wait();
        
        console.log("---sending eth to WETH contract") // debuuuggg
        // execute getWth function, this is because we will need WETH as input for arbitrage opportunitties
        await arbitrageTrade.getWeth(ethers.parseEther("4950"));// not getting all weth as contract needs eth to pay gas 

        // assertions
        // Do we have enough WETH in the contract
        expect(await weth.balanceOf(arbitrageTrade.target)).to.equal(ethers.parseEther("4950"));

        // does the pair have liquidity?
        // create an instance of the pair object
        const UniswapV2PairABI = [
          "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
        ];
        
        const pairContractA = await ethers.getContractAt(UniswapV2PairABI, this.uniPairAddress);
        const pairContractB = await ethers.getContractAt(UniswapV2PairABI, this.sushiPairAddress);

        const reservesA = await pairContractA.getReserves()
        const reservesB = await pairContractB.getReserves()

        console.log("Reserves A: ", reservesA);
        console.log("reserves B: ", reservesB);


    });

    it("should profit from arbitrage opportunity", async function () {

        const wethBalanceBefore = await weth.balanceOf(arbitrageTrade.target)
        console.log("--- weth Balance Before: ", wethBalanceBefore);
        // // what is the best optimal trade based on the reserves?
        // const amountIn = 7551817155404703298n /// optimal trade from the python script

        // // Prepare all the variables to execute trade
        // //function executeTrade(address[] calldata _poolPairs, address[] memory _path, uint256 _amountIn )
        // const poolPairs = [uniswapRouter.target, sushiswapRouter.target] 
        // const path = [weth.target, this.mockToken.target]
        const amountIn = 12029923047147520n /// remove and uncomment section above
        path = ['0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
        '0xe4E81Fa6B16327D4B78CFEB83AAdE04bA7075165'
        ] /// remove and uncomment section above
        poolPairs =  [ // router address
        '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
        ]
        // Execute trade
        console.log("---- Going to execute main trade")
        console.log(poolPairs)
        console.log(path)
        await arbitrageTrade.executeTrade(poolPairs, path, amountIn);

        // Assert profitability
        const wethBalanceAfter = await weth.balanceOf(arbitrageTrade.target);
        expect(wethBalanceAfter).to.be.gt(wethBalanceBefore); // Using BigNumber comparison

        console.log("*******Weth Balance before trade: ", wethBalanceBefore)
        console.log("*******Weth Balance after trade: ", wethBalanceAfter)
        console.log("*******Total profit: ", wethBalanceAfter - wethBalanceBefore) // expected profit"roughly": 3235218832293684000

    });

    // Additional tests can be added here
});

});





















  // Impersonate a whale account
  // const whaleAddress = '0xff50ed3d0ec03aC01D4C79aAd74928BFF48a7b2b'; 
  // await hre.network.provider.request({
  //     method: "hardhat_impersonateAccount",
  //     params: [whaleAddress],
  // });

  // const whaleSigner = await ethers.getSigner(whaleAddress);
  

  // // Transfer ETH to the owner account
  // const amountToTransfer = ethers.parseEther("1000000");
  // console.log(amountToTransfer.toString()) // -------------debug
  // let tx = await whaleSigner.sendTransaction({
  //     to: owner.address,
  //     value: amountToTransfer,
  // });
  // await tx.wait();
  // console.log("balance after away: ", await provider.getBalance(owner.address))// ----------debuuuggg
  



  // describe("Withdrawals", function () {
  //   describe("Validations", function () {
  //     it("Should revert with the right error if called too soon", async function () {
  //       const { lock } = await loadFixture(deployOneYearLockFixture);

  //       await expect(lock.withdraw()).to.be.revertedWith(
  //         "You can't withdraw yet"
  //       );
  //     });

  //     it("Should revert with the right error if called from another account", async function () {
  //       const { lock, unlockTime, otherAccount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // We can increase the time in Hardhat Network
  //       await time.increaseTo(unlockTime);

  //       // We use lock.connect() to send a transaction from another account
  //       await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
  //         "You aren't the owner"
  //       );
  //     });

  //     it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
  //       const { lock, unlockTime } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // Transactions are sent using the first signer by default
  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).not.to.be.reverted;
  //     });
  //   });

  //   describe("Events", function () {
  //     it("Should emit an event on withdrawals", async function () {
  //       const { lock, unlockTime, lockedAmount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw())
  //         .to.emit(lock, "Withdrawal")
  //         .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
  //     });
  //   });

  //   describe("Transfers", function () {
  //     it("Should transfer the funds to the owner", async function () {
  //       const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).to.changeEtherBalances(
  //         [owner, lock],
  //         [lockedAmount, -lockedAmount]
  //       );
  //     });
  //   });
  // });