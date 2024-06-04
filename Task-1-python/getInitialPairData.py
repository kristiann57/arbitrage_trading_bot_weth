# %%
# Read the list of factory contract addresses
from web3 import Web3
from web3 import AsyncHTTPProvider
from web3.eth import AsyncEth
import json
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


# Define the contract ABI
factory_abi = [
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "token0",
                "type": "address",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "token1",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "address",
                "name": "pair",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "",
                "type": "uint256",
            },
        ],
        "name": "PairCreated",
        "type": "event",
    }
]


# %%
# Recursive function to fetch event in incrementally smaller intervals
def getPairEvents(contract, fromBlock, toBlock):
    toBlockPrime = toBlock
    fetchCount = 0

    # Then, recursively fetch events in smaller time intervals
    def getEventsRecursive(contract, _from, _to):
        try:
            events = (
                contract.events.PairCreated()
                .create_filter(fromBlock=_from, toBlock=_to)
                .get_all_entries()
            )
            print("Found ", len(events), " events between blocks ", _from, " and ", _to)
            nonlocal fetchCount
            fetchCount += len(events)
            return events
        except ValueError:
            print("Too many events found between blocks ", _from, " and ", _to)
            midBlock = (_from + _to) // 2
            return getEventsRecursive(contract, _from, midBlock) + getEventsRecursive(
                contract, midBlock + 1, _to
            )

    return getEventsRecursive(contract, fromBlock, toBlockPrime)



# %%
# Fetch list of pools for each factory contract
with open("FactoriesV2.json", "r") as f:
    factories = json.load(f)

pairDataList = []
for factoryName, factoryData in factories.items():
    events = getPairEvents(
        w3.eth.contract(address=factoryData["factory"], abi=factory_abi),
        0,
        w3.eth.block_number,
    )
    print(f"Found {len(events)} pools for {factoryName}")
    for e in events:
        pairDataList.append(
            {
                "token0": e["args"]["token0"],
                "token1": e["args"]["token1"],
                "pair": e["args"]["pair"],
                "factory": factoryName,
            }
        )

# %%
# WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
pair_pool_dict = {}
for pair_object in pairDataList:
    # Check for ETH (WETH) in the pair.
    pair = (pair_object['token0'], pair_object['token1'])
    if WETH not in pair:
        continue

    # Make sure the pair is referenced in the dictionary.
    if pair not in pair_pool_dict:
        pair = pair
        pair_pool_dict[pair] = []

    # Add the pool to the list of pools that trade this pair.
    pair_pool_dict[pair].append(pair_object)

# Create the final dictionnary of pools that will be traded on.
pool_dict = {}
for pair, pool_list in pair_pool_dict.items():
    if len(pool_list) >= 2:
        pool_dict[pair] = pool_list

print(pool_dict)
# Convert tuple keys to a srting representation
str_key_pool_dict = {str(key): value for key, value in pool_dict.items()}

with open('PoolData.json', 'w') as json_file:
    json.dump(str_key_pool_dict, json_file, indent=4)