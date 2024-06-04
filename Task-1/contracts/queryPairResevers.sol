//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

// Define an interface for the pair contracts, that contains the function we want to call
interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

// Batch query contract
contract FlashBotsUniswapQuery {
    function getReservesByPairs(IUniswapV2Pair[] calldata _pairs) external view returns (uint256[3][] memory) {// The calldata keyword is a small optimization that tells the compiler that the array will not be modified
        uint256[3][] memory result = new uint256[3][](_pairs.length);
        for (uint i = 0; i < _pairs.length; i++) {
            (result[i][0], result[i][1], result[i][2]) = _pairs[i].getReserves();
        }
        return result;
    }
}