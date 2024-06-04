import math
# %%
# Helper functions for calculating the optimal trade size
# Output of a single swap
def swap_output(x, a, b, fee=0.003):
    # oneMinusFee = 1 - fee
    # aPlusx = a + x
    # aPlusxMultOneMinusFee = aPlusx * oneMinusFee
    # print(f"oneMinusFee {oneMinusFee}") # debuggins
    # print(f"aPlusx {aPlusx}") # debuggins
    # print(f"aPlusxMultOneMinusFee: {aPlusxMultOneMinusFee:.20}") # debuggins

    return b * (1 - a / (a + x * (1 - fee)))


# Gross profit of two successive swaps
def trade_profit(x, reserves1, reserves2, fee=0.003):
    a1, b1 = reserves1
    a2, b2 = reserves2
    return swap_output(swap_output(x, a1, b1, fee), b2, a2, fee) - x


# Optimal input amount
def optimal_trade_size(reserves1, reserves2, fee=0.003):
    a1, b1 = reserves1
    a2, b2 = reserves2
    return (math.sqrt(a1 * b1 * a2 * b2 * (1 - fee) ** 4 * (b1 * (1 - fee) + b2) ** 2) - a1 * b2 * (1 - fee) * (
                b1 * (1 - fee) + b2)) / ((1 - fee) * (b1 * (1 - fee) + b2)) ** 2



# x = optimal_trade_size((1000000000000, 9360640000000000000000),(1000000000317, 1) );
# profit = trade_profit(x,(1000000000000, 9360640000000000000000),(1000000000317, 1) )
# print(x)
# print(profit)
#
# x = optimal_trade_size((1, 969999614729351193),(3523944516661, 535185595314443115) );
# profit = trade_profit(x,(1, 969999614729351193),(3523944516661, 535185595314443115) )
# print(x)
# print(profit)
#
x = optimal_trade_size((76, 21235629228984618875668660),(100000207775578, 711899557780360) );
profit = trade_profit(x,(76, 21235629228984618875668660),(100000207775578, 711899557780360) )
print(x)
print(profit)

x = optimal_trade_size((5000000000000000000000, 5000000000000000000000),(4000000000000000000000, 5000000000000000000000) );
profit = trade_profit(x,(5000000000000000000000, 5000000000000000000000),(4000000000000000000000, 5000000000000000000000) )
print(f"{x:.20f}")
print(f"{profit:.20f}")
#
# swapout = swap_output(8377429262206237, 181972148937261120,200000000000000000 );
# print(f"swapout: {swapout}")
