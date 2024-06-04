//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapRouter {
    function factory() external pure returns (address);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);
    function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB);
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut);
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);
     function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
    

}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IWETH is IERC20 {
    /// @notice Deposit ether to get wrapped ether
    function deposit() external payable;

    /// @notice Withdraw wrapped ether to get ether
    function withdraw(uint256) external;
}

contract ArbitrageTrade is Ownable(msg.sender){

    IUniswapRouter UniRouter = IUniswapRouter(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    IUniswapRouter SushiRouter = IUniswapRouter(0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506);
    IWETH WETH = IWETH(0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6);

    uint16 SLIPPAGE = 9500; // percentage protected mltiplied by 100 

    //Slippage protection
    // @params: it needs the percentage you want te slippage to be
    function slippageProtection(uint16 slippage) external onlyOwner() returns(uint16) {
        SLIPPAGE = (100 - slippage) * 100;
        return SLIPPAGE;
    }

    //events
    event WethBalance(uint256 balance, string status); // to log the WETH balance before and after the swap
    event TokensUsed(address tokenA, address tokenB); // to Log tokens used for swap
    event RoutersUsed(address routerA, address routerB); // to Log routers used for swap
    event amountIn(uint256 amountIn, address tokenA);
    event amountOut(uint256 amountOut, address tokenB);

    function executeTrade(address[] calldata _poolPairs, address[] memory _path, uint256 _amountIn ) external onlyOwner() {
        // check WETH Balance
        uint WETHBalanceBefore = WETH.balanceOf(address(this)); 

        //sanity check on amounts in 
        require(WETHBalanceBefore >= _amountIn, "contract does not have enough balance to execute arbitrage trade");

        emit WethBalance(WETHBalanceBefore, "before"); //EVENT
        
        // unpack the addresses
        // (address PoolA, address PoolB) = (_poolPairs[0], _poolPairs[1]); MIght be added later
        (address token0, address token1) = (_path[0], _path[1]);
        (address routerA, address routerB) = (_poolPairs[0], _poolPairs[1]);

        //events
        emit amountIn(_amountIn, token0);
        emit TokensUsed(token0, token1);
        emit RoutersUsed(routerA, routerB);

        //token balance before
        uint256 otherTokenBalanceBefore = token0 != address(WETH) ? IERC20(token0).balanceOf(address(this)) : IERC20(token1).balanceOf(address(this)) ;
        
        //Approve Pair contracts
        WETH.approve(routerA, _amountIn + 100000000000); //_

        //TRADE 1 
        // get the amounts Out so I can get the amountOutMin
        uint256[] memory amountsOut = UniRouter.getAmountsOut(_amountIn, _path);
        uint256 amountsOutMin = (amountsOut[1] * SLIPPAGE) / 10000; // minimum amounts in is 98% of the amountsOut, Slipage 2%

        // execute the first trade
        IUniswapRouter(routerA).swapExactTokensForTokens(_amountIn, amountsOutMin, _path, address(this), block.timestamp + 30 seconds );
        // securit check on transfered tokens:
        uint256 otherTokenBalanceAfter = token0 != address(WETH) ? IERC20(token0).balanceOf(address(this)) : IERC20(token1).balanceOf(address(this)) ;
        require(otherTokenBalanceAfter >= otherTokenBalanceBefore + amountsOutMin, "Other token amountsOut not enough");

        emit amountOut(otherTokenBalanceAfter, token1); // Event to check amount second token
        
        //TRADE 2
        //Approve Pair contracts
        IERC20(token1).approve(routerB, otherTokenBalanceAfter + 1000000000);

        // get the amounts Out so I can get the amountOutMin
        // tis time we need to invert the path si we get WETH as final asset trade
        address[] memory _pathInverted = new address[](2);
        _pathInverted[0] = _path[1];
        _pathInverted[1] = _path[0];

        uint256[] memory amountsOut1 = UniRouter.getAmountsOut(otherTokenBalanceAfter, _pathInverted); // this time we have to invert
        uint256 amountsOutMin1 = (amountsOut1[1] * SLIPPAGE) / 10000; // minimum amounts in is 95% of the amountsOut, Slipage 5%

        // execute the final trade
        IUniswapRouter(routerB).swapExactTokensForTokens(otherTokenBalanceAfter, amountsOutMin1, _pathInverted, address(this), block.timestamp + 30 seconds );

        
        // FINAL sanity profitability check
        uint WETHBalanceAfter = WETH.balanceOf(address(this)); 
        emit WethBalance(WETHBalanceAfter, "after");
        require(WETHBalanceAfter > WETHBalanceBefore, "trade is not profitable");
    }

    function getWeth(uint _amount) external onlyOwner() {
        uint WETHBalance = WETH.balanceOf(address(this)); 
        require(address(this).balance >= _amount, "_amount passed exceeds account balance");

        WETH.deposit{value: _amount}();

        require(WETH.balanceOf(address(this)) >= WETHBalance + _amount, "Weth deposit did not work");
    }

    function withdraw(uint256 amontToWithdraw) external onlyOwner() {
        (bool success)= WETH.transfer(owner(), amontToWithdraw);
        require(success, "Could not withdraw, tx failed");
    }

    receive() external payable {}


    //1. Receive what is the path I need to follow
    // 2. understand what liquiditypools are involved
    // 3. get the amount of weth needed for the trade (if unsufficient balance, go ahead with all the balance..as long as it is still profitabe)
    // 4. get estimated gas consumption
    // 5. Receive the expeted profit

    // call trade function in the first pool
    // ensure you have received the desired amount of tokenB
    // call second pool method to trade tokenB for token A again
    // make sure you have received the required amount to make a profit trade , could also be a check on balance of weth before and after trade

    // contract needs to have a method to withdraw money to owners account
    // sould always have some ETH to pay or gas 

}