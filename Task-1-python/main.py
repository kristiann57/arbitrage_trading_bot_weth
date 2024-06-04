# %%
# Read the list of factory contract addresses
import time
start_time = time.time()
from web3 import Web3
from web3 import AsyncHTTPProvider
from web3.eth import AsyncEth
import asyncio
import json
import math
import nest_asyncio
import os
from dotenv import load_dotenv

nest_asyncio.apply()

# Load environment variables from .env file
load_dotenv()

# Read infura nodes.
# NODE_URI = 'https://mainnet.infura.io/v3/0ce674ab414048f580429a5bca905096'
nodes = [
    os.getenv('GOERLI'),
    os.getenv('GOERLI_ALCHEMY'),
    os.getenv('GOERLI_QUICKNODE')
         ]

# Define providers
w3 = Web3(Web3.HTTPProvider(nodes[0]))
providers = []
providersAsync = []
for node in nodes:
    providers.append(Web3.HTTPProvider(node))
    providersAsync.append(Web3(AsyncHTTPProvider(node), modules={"eth": (AsyncEth)}))

#read pool Data Json ile
with open("PoolData.json", "r") as f:
    pool_dict = json.load(f)

# WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"

# %%
# Number of different pairs
print(f'We have {len(pool_dict)} different pairs.')

# Total number of pools
print(f'We have {sum([len(pool_list) for pool_list in pool_dict.values()])} pools in total.')

# Pair with the most pools
print(
    f'The pair with the most pools is {max(pool_dict, key=lambda k: len(pool_dict[k]))} with {len(max(pool_dict.values(), key=len))} pools.')

# Distribution of the number of pools per pair, deciles
pool_count_list = [len(pool_list) for pool_list in pool_dict.values()]
pool_count_list.sort(reverse=True)
print(f'Number of pools per pair, in deciles: {pool_count_list[::int(len(pool_count_list) / 10)]}')

# Distribution of the number of pools per pair, percentiles (deciles of the first decile)
pool_count_list.sort(reverse=True)
print(f'Number of pools per pair, in percentiles: {pool_count_list[::int(len(pool_count_list) / 100)][:10]}')

# %%
# Address of the V2 Flash query contract
queryContractAddress = "0x296E78c014E5d21e0D01828547904Cee6b5977CF"
queryAbi = [{"inputs": [
    {
        "internalType": "contract IUniswapV2Pair[]",
        "name": "_pairs",
        "type": "address[]",
    }
],
    "name": "getReservesByPairs",
    "outputs": [
        {"internalType": "uint256[3][]", "name": "", "type": "uint256[3][]"}
    ],
    "stateMutability": "view",
    "type": "function"}]


# Function to perform batch parallel requests
async def getReservesParallel(pairs, providers, chunkSize=1000):
    # Create the contract objects
    contracts = [
        provider.eth.contract(address=queryContractAddress, abi=queryAbi)
        for provider in providers
    ]

    # Create a list of chunks of pair addresses
    chunks = [
        [pairAddr for pairAddr in pairs[i: i + chunkSize]]
        for i in range(0, len(pairs), chunkSize)
    ]

    # Assign each chunk to a provider in a round-robin fashion
    tasks = [contracts[i % len(contracts)].functions.getReservesByPairs(pairs).call()
             for i, pairs in enumerate(chunks)]

    # Run the tasks in parallel
    results = await asyncio.gather(*tasks)

    # Flatten the results
    results = [item for sublist in results for item in sublist]

    return results


# %%
# Helper functions for calculating the optimal trade size
# Output of a single swap
def swap_output(x, a, b, fee=0.003):
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


# %%
# Fetch the reserves of each pool in pool_dict
to_fetch = []  # List of pool addresses for which reserves need to be fetched.
for pair, pool_list in pool_dict.items():
    for pair_object in pool_list:
        to_fetch.append(pair_object["pair"])  # Add the address of the pool
print(f"Fetching reserves of {len(to_fetch)} pools...")
# getReservesParallel() is from article 2 in the MEV bot series
reserveList = asyncio.get_event_loop().run_until_complete(getReservesParallel(to_fetch, providersAsync))

# Build list of trading opportunities
index = 0
opps = []
for pair, pool_list in pool_dict.items():
    # Store the reserves in the pool objects for later use
    for pair_object in pool_list:
        pair_object["reserves"] = reserveList[index]
        index += 1

    # Iterate over all the pools of the pair
    for poolA in pool_list:
        for poolB in pool_list:
            # Skip if it's the same pool
            if poolA["pair"] == poolB["pair"]:
                continue

            # Skip if one of the reserves is 0 (division by 0)
            if 0 in poolA["reserves"] or 0 in poolB["reserves"]:
                continue

            # Re-order the reserves so that WETH is always the first token
            if poolA["token0"] == WETH:
                res_A = (poolA["reserves"][0], poolA["reserves"][1])
                res_B = (poolB["reserves"][0], poolB["reserves"][1])
                path = [poolA["token0"], poolA["token1"]]
            else:
                res_A = (poolA["reserves"][1], poolA["reserves"][0])
                res_B = (poolB["reserves"][1], poolB["reserves"][0])
                path = [poolA["token1"], poolA["token1"]]

            # Compute value of optimal input through the formula
            x = optimal_trade_size(res_A, res_B)

            # Skip if optimal input is negative (the order of the pools is reversed)
            if x < 0:
                continue

            # Compute gross profit in Wei (before gas cost)
            profit = trade_profit(x, res_A, res_B)
            print(res_A, res_B)
            print(f"profit is: {profit}") # debugging

            # DEBUGGING ------------- testing
            if profit < 0:
                continue

            # Store details of the opportunity. Values are in ETH. (1e18 Wei = 1 ETH)
            # opps.append({
            #     "profit": profit / 1e18,
            #     "input": x / 1e18,
            #     "pair": pair,
            #     "poolA": poolA,
            #     "factoryA" : poolA["factory"],
            #     "poolB": poolB,
            #     "factoryB": poolB["factory"],
            #     "path": path
            # })

            opps.append({
                "profit": profit ,
                "input": x ,
                "pair": pair,
                "poolA": poolA,
                "factoryA": poolA["factory"],
                "poolB": poolB,
                "factoryB": poolB["factory"],
                "path": path
            })
            # execute the TRASNACTION RIGHT AWAY!!!!
            # add notifications telegram/discord bot to inform anytime the TX is made and some info
            # flashbots still competitive and premium based, try different ones

print(f"Found {len(opps)} opportunities.")
#
# # %%
# Use the hard-coded gas cost of 107k gas per opportunity
gp = w3.eth.gas_price
gasfee = (107000 * gp)
print(f"total gas fee: {gasfee}")
print(f"gas fee direclty from eth method: {gp}")
#
for opp in opps:
    opp["net_profit"] = opp["profit"] - (107000 * gp)

# Sort by estimated net profit
opps.sort(key=lambda x: x["net_profit"], reverse=True)

# Keep positive opportunities
positive_opps = [opp for opp in opps if opp["net_profit"] > 0]

### Print stats
# Positive opportunities
print(f"Found {len(positive_opps)} positive opportunities.")

# Details on each opportunity
ETH_PRICE = 2000  # You should dynamically fetch the price of ETH
for opp in positive_opps:
    print(f"Profit: {opp['net_profit']:.20f} ETH (${(opp['net_profit'] * ETH_PRICE):.20f})")
    print(f"Input: {opp['input']:.20f} ETH (${(opp['input'] * ETH_PRICE):.20f})")
    print(f"Pool A: {opp['poolA']['pair']}")
    print(f"Pool B: {opp['poolB']['pair']}")
    print(f"factoryA: {opp['poolA']['factory']}")
    print(f"factoryB: {opp['poolB']['factory']}")
    print()

end_time = time.time()
duration = end_time - start_time
print(f"The process took {duration} seconds")

# %%

# print percentages rather than absolute!
# new tokens roughly 5% - 15%