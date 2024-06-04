// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract GasBurner {
    event waste(address sender, uint gas);
    uint GAS_REQUIRED_TO_FINISH_EXEC = 60;
    fallback() external {
        emit waste(msg.sender, gasleft());
        while (gasleft() > GAS_REQUIRED_TO_FINISH_EXEC){

        }
    }
}