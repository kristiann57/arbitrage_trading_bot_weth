const BigNumber = require('bignumber.js');

// Set a high precision
BigNumber.config({
    DECIMAL_PLACES: 30,  // High precision
    EXPONENTIAL_AT: [-9, 20], // Wide range to avoid exponential notation
    ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN // Similar to Python's default
});

function swapOutput(x, a, b, fee = 0.003) {
    const xBN = new BigNumber(x);
    const aBN = new BigNumber(a);
    const bBN = new BigNumber(b);
    const feeBN = new BigNumber(fee);

    // const oneMinusFee = new BigNumber(1).minus(feeBN);
    // const aPlusX = aBN.plus(xBN);// debugging
    // const aPlusxMultOneMinusFee = aPlusX.multipliedBy(oneMinusFee);// debugging
    // const aDivaPlusxMultOneMinusFee = aBN.dividedBy(aPlusxMultOneMinusFee);// debugging
    // console.log("oneMinusFee: ",oneMinusFee.toString(),"aplusx", aPlusX.toString(), "aPlusXminusFee", aPlusxMultOneMinusFee.toString()) // debugging

    const output = bBN.multipliedBy(new BigNumber(1).minus(aBN.dividedBy(aBN.plus(xBN.multipliedBy(new BigNumber(1).minus(feeBN))))));

    return output
}

function tradeProfit(x, reserves1, reserves2, fee = 0.003) {
    const [a1, b1] = reserves1.map(r => new BigNumber(r));
    const [a2, b2] = reserves2.map(r => new BigNumber(r));
    const xBN = new BigNumber(x);
    const feeBN = new BigNumber(fee);

    const output1 = swapOutput(xBN, a1, b1, feeBN);
    const output2 = swapOutput(output1, b2, a2, feeBN);

    return output2.minus(xBN)//.toString();
}

function optimalTradeSize(reserves1, reserves2, fee = 0.003) {
    const [a1, b1] = reserves1.map(x => new BigNumber(x));
    const [a2, b2] = reserves2.map(x => new BigNumber(x));
    const feeBN = new BigNumber(fee);

    const oneMinusFee = new BigNumber(1).minus(feeBN);
    const a1b1a2b2 = a1.multipliedBy(b1).multipliedBy(a2).multipliedBy(b2);
    const oneMinusFeeSquared = oneMinusFee.pow(4);
    const b1OneMinusFeePlusB2 = b1.multipliedBy(oneMinusFee).plus(b2);
    const b1OneMinusFeePlusB2Squared = b1OneMinusFeePlusB2.pow(2);

    const numerator = a1b1a2b2.multipliedBy(oneMinusFeeSquared).multipliedBy(b1OneMinusFeePlusB2Squared).sqrt()
                      .minus(a1.multipliedBy(b2).multipliedBy(oneMinusFee).multipliedBy(b1OneMinusFeePlusB2));
    const denominator = oneMinusFee.multipliedBy(b1OneMinusFeePlusB2).pow(2);

    return numerator.dividedBy(denominator)//.toString();
}

// let x = optimalTradeSize([ 1000000000000n, 9360640000000000000000n ], [ 1000000000317n, 1n ]).toString();
// let profit = tradeProfit(x , [ 1000000000000n, 9360640000000000000000n ], [ 1000000000317n, 1n ]).toString()
// console.log("x: ", x)
// console.log("profit: ", profit);

// x = optimalTradeSize([ 1n, 969999614729351193n ], [ 3523944516661n, 535185595314443115n ]).toString();
// profit = tradeProfit(x , [ 1n, 969999614729351193n ], [ 3523944516661n, 535185595314443115n ]).toString()
// console.log("x: ", x)
// console.log("profit: ", profit);

// x = optimalTradeSize([ 76n, 21235629228984618875668660n ], [ 100000207775578n, 711899557780360n ]).toString();
// profit = tradeProfit(x , [ 76n, 21235629228984618875668660n ], [ 100000207775578n, 711899557780360n ]).toString()
// console.log("x: ", x)
// console.log("profit: ", profit);

// x = optimalTradeSize([ 181972148937261120n, 10999999999999999966n ], [ 200000000000000000n, 10000000000000000000n ]).toString();
// profit = tradeProfit(x , [ 181972148937261120n, 10999999999999999966n ], [ 200000000000000000n, 10000000000000000000n ]).toString()
// console.log("x: ", x)
// console.log("profit: ", profit);

// x = optimalTradeSize([ 57000000000000000000n, 9000000000000000000000n ], [ 52000000000000000000n , 4000000000000000000000n ]).toString();
// profit = tradeProfit(x , [ 57000000000000000000n, 9000000000000000000000n ], [ 52000000000000000000n , 4000000000000000000000n ]).toString()
// console.log("x: ", x.toString())
// console.log("profit: ", profit.toString());

// swapout1 = swapOutput(8377429262206237n,181972148937261120n,200000000000000000n  );
// console.log("swapout: ", swapout1.toString())

module.exports = { swapOutput, tradeProfit, optimalTradeSize };