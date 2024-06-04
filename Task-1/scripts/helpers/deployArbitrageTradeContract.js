const { ethers } = require('hardhat');



// set the right variables
const MODE = "GOERLI"
const PROV = process.env[MODE]

const pvKey = process.env.PRIV_KEY;

// Connect to a provider (e.g., Infura, Alchemy)
const provider = new ethers.JsonRpcProvider(PROV);

// Create a Wallet
const signer = new ethers.Wallet(pvKey, provider);

// Contract ABI
const contractABI  = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "routerA",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "routerB",
        "type": "address"
      }
    ],
    "name": "RoutersUsed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "tokenA",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "tokenB",
        "type": "address"
      }
    ],
    "name": "TokensUsed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "status",
        "type": "string"
      }
    ],
    "name": "WethBalance",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "tokenA",
        "type": "address"
      }
    ],
    "name": "amountIn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "tokenB",
        "type": "address"
      }
    ],
    "name": "amountOut",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "_poolPairs",
        "type": "address[]"
      },
      {
        "internalType": "address[]",
        "name": "_path",
        "type": "address[]"
      },
      {
        "internalType": "uint256",
        "name": "_amountIn",
        "type": "uint256"
      }
    ],
    "name": "executeTrade",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "getWeth",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amontToWithdraw",
        "type": "uint256"
      }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
]

// contract Bytecode:
const contractBytecode = "0x6080604052737a250d5630b4cf539739df2c5dacb4c659f2488d600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550731b02da8cb0d097eb8d57a175b88c7d8b47997506600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555073b4fbf271143f4fbf7b91a5ded31805e42b2208d6600360006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055503480156200011057600080fd5b5033600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603620001875760006040517f1e4fbdf70000000000000000000000000000000000000000000000000000000081526004016200017e9190620002a8565b60405180910390fd5b62000198816200019f60201b60201c565b50620002c5565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000620002908262000263565b9050919050565b620002a28162000283565b82525050565b6000602082019050620002bf600083018462000297565b92915050565b611f1e80620002d56000396000f3fe6080604052600436106100595760003560e01c80631234d743146100655780632e1a7d4d1461008e5780636098dc61146100b7578063715018a6146100e05780638da5cb5b146100f7578063f2fde38b1461012257610060565b3661006057005b600080fd5b34801561007157600080fd5b5061008c6004803603810190610087919061130a565b61014b565b005b34801561009a57600080fd5b506100b560048036038101906100b0919061130a565b6103a6565b005b3480156100c357600080fd5b506100de60048036038101906100d99190611549565b61049d565b005b3480156100ec57600080fd5b506100f56110aa565b005b34801561010357600080fd5b5061010c6110be565b60405161011991906115e8565b60405180910390f35b34801561012e57600080fd5b5061014960048036038101906101449190611603565b6110e7565b005b61015361116d565b6000600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b81526004016101b091906115e8565b602060405180830381865afa1580156101cd573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101f19190611645565b905081471015610236576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161022d906116f5565b60405180910390fd5b600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663d0e30db0836040518263ffffffff1660e01b81526004016000604051808303818588803b1580156102a057600080fd5b505af11580156102b4573d6000803e3d6000fd5b505050505081816102c59190611744565b600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b815260040161032091906115e8565b602060405180830381865afa15801561033d573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906103619190611645565b10156103a2576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610399906117c4565b60405180910390fd5b5050565b6103ae61116d565b6000600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663a9059cbb6103f66110be565b846040518363ffffffff1660e01b81526004016104149291906117f3565b6020604051808303816000875af1158015610433573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906104579190611854565b905080610499576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610490906118cd565b60405180910390fd5b5050565b6104a561116d565b6000600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b815260040161050291906115e8565b602060405180830381865afa15801561051f573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105439190611645565b905081811015610588576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161057f9061195f565b60405180910390fd5b7ff1fd9bb0e0661a80f924f625a3f1b5123b8a0d5cedb89fa087d20ed0f1c76ec2816040516105b791906119cb565b60405180910390a1600080846000815181106105d6576105d56119f9565b5b6020026020010151856001815181106105f2576105f16119f9565b5b60200260200101519150915060008088886000818110610615576106146119f9565b5b905060200201602081019061062a9190611603565b8989600181811061063e5761063d6119f9565b5b90506020020160208101906106539190611603565b915091507f2909f445354aa8e9e88121575238f150131e5e43cccfa2346bf65d974f3daa668685604051610688929190611a28565b60405180910390a17ff39e1e9f0e79e67bb00532a4c647a3b1b7ae04a4f2c219489ab68ba73392fdb284846040516106c1929190611a51565b60405180910390a17fac3d518556c02f0f82599fe4c7f0c9cfbf2586722581f0270a288a01bbf71e7d82826040516106fa929190611a51565b60405180910390a16000600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff16036107d8578373ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b815260040161079291906115e8565b602060405180830381865afa1580156107af573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906107d39190611645565b610853565b8473ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b815260040161081191906115e8565b602060405180830381865afa15801561082e573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906108529190611645565b5b9050600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663095ea7b38464174876e8008a6108a59190611744565b6040518363ffffffff1660e01b81526004016108c29291906117f3565b6020604051808303816000875af11580156108e1573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906109059190611854565b506000600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663d06ca61f898b6040518363ffffffff1660e01b8152600401610965929190611b38565b600060405180830381865afa158015610982573d6000803e3d6000fd5b505050506040513d6000823e3d601f19601f820116820180604052508101906109ab9190611c2b565b90506000612710612648836001815181106109c9576109c86119f9565b5b60200260200101516109db9190611c74565b6109e59190611ce5565b90508473ffffffffffffffffffffffffffffffffffffffff166338ed17398a838d30601e42610a149190611744565b6040518663ffffffff1660e01b8152600401610a34959493929190611d16565b6000604051808303816000875af1158015610a53573d6000803e3d6000fd5b505050506040513d6000823e3d601f19601f82011682018060405250810190610a7c9190611c2b565b506000600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168873ffffffffffffffffffffffffffffffffffffffff1603610b53578673ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b8152600401610b0d91906115e8565b602060405180830381865afa158015610b2a573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610b4e9190611645565b610bce565b8773ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b8152600401610b8c91906115e8565b602060405180830381865afa158015610ba9573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610bcd9190611645565b5b90508184610bdc9190611744565b811015610c1e576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610c1590611de2565b60405180910390fd5b7f253a6615d2c40e3907f133858ddf74f82e65db60d7ef22e6348cfb83ef0735b08188604051610c4f929190611a28565b60405180910390a18673ffffffffffffffffffffffffffffffffffffffff1663095ea7b386633b9aca0084610c849190611744565b6040518363ffffffff1660e01b8152600401610ca19291906117f3565b6020604051808303816000875af1158015610cc0573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610ce49190611854565b506000600267ffffffffffffffff811115610d0257610d016113ad565b5b604051908082528060200260200182016040528015610d305781602001602082028036833780820191505090505b5090508b600181518110610d4757610d466119f9565b5b602002602001015181600081518110610d6357610d626119f9565b5b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff16815250508b600081518110610db157610db06119f9565b5b602002602001015181600181518110610dcd57610dcc6119f9565b5b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff16815250506000600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663d06ca61f84846040518363ffffffff1660e01b8152600401610e66929190611b38565b600060405180830381865afa158015610e83573d6000803e3d6000fd5b505050506040513d6000823e3d601f19601f82011682018060405250810190610eac9190611c2b565b9050600061271061264883600181518110610eca57610ec96119f9565b5b6020026020010151610edc9190611c74565b610ee69190611ce5565b90508773ffffffffffffffffffffffffffffffffffffffff166338ed173985838630601e42610f159190611744565b6040518663ffffffff1660e01b8152600401610f35959493929190611d16565b6000604051808303816000875af1158015610f54573d6000803e3d6000fd5b505050506040513d6000823e3d601f19601f82011682018060405250810190610f7d9190611c2b565b506000600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b8152600401610fdb91906115e8565b602060405180830381865afa158015610ff8573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061101c9190611645565b90507ff1fd9bb0e0661a80f924f625a3f1b5123b8a0d5cedb89fa087d20ed0f1c76ec28160405161104d9190611e4e565b60405180910390a18c8111611097576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161108e90611ec8565b60405180910390fd5b5050505050505050505050505050505050565b6110b261116d565b6110bc60006111f4565b565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b6110ef61116d565b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16036111615760006040517f1e4fbdf700000000000000000000000000000000000000000000000000000000815260040161115891906115e8565b60405180910390fd5b61116a816111f4565b50565b6111756112b8565b73ffffffffffffffffffffffffffffffffffffffff166111936110be565b73ffffffffffffffffffffffffffffffffffffffff16146111f2576111b66112b8565b6040517f118cdaa70000000000000000000000000000000000000000000000000000000081526004016111e991906115e8565b60405180910390fd5b565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b600033905090565b6000604051905090565b600080fd5b600080fd5b6000819050919050565b6112e7816112d4565b81146112f257600080fd5b50565b600081359050611304816112de565b92915050565b6000602082840312156113205761131f6112ca565b5b600061132e848285016112f5565b91505092915050565b600080fd5b600080fd5b600080fd5b60008083601f84011261135c5761135b611337565b5b8235905067ffffffffffffffff8111156113795761137861133c565b5b60208301915083602082028301111561139557611394611341565b5b9250929050565b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6113e58261139c565b810181811067ffffffffffffffff82111715611404576114036113ad565b5b80604052505050565b60006114176112c0565b905061142382826113dc565b919050565b600067ffffffffffffffff821115611443576114426113ad565b5b602082029050602081019050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061147f82611454565b9050919050565b61148f81611474565b811461149a57600080fd5b50565b6000813590506114ac81611486565b92915050565b60006114c56114c084611428565b61140d565b905080838252602082019050602084028301858111156114e8576114e7611341565b5b835b8181101561151157806114fd888261149d565b8452602084019350506020810190506114ea565b5050509392505050565b600082601f8301126115305761152f611337565b5b81356115408482602086016114b2565b91505092915050565b60008060008060608587031215611563576115626112ca565b5b600085013567ffffffffffffffff811115611581576115806112cf565b5b61158d87828801611346565b9450945050602085013567ffffffffffffffff8111156115b0576115af6112cf565b5b6115bc8782880161151b565b92505060406115cd878288016112f5565b91505092959194509250565b6115e281611474565b82525050565b60006020820190506115fd60008301846115d9565b92915050565b600060208284031215611619576116186112ca565b5b60006116278482850161149d565b91505092915050565b60008151905061163f816112de565b92915050565b60006020828403121561165b5761165a6112ca565b5b600061166984828501611630565b91505092915050565b600082825260208201905092915050565b7f5f616d6f756e74207061737365642065786365656473206163636f756e74206260008201527f616c616e63650000000000000000000000000000000000000000000000000000602082015250565b60006116df602683611672565b91506116ea82611683565b604082019050919050565b6000602082019050818103600083015261170e816116d2565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061174f826112d4565b915061175a836112d4565b925082820190508082111561177257611771611715565b5b92915050565b7f57657468206465706f73697420646964206e6f7420776f726b00000000000000600082015250565b60006117ae601983611672565b91506117b982611778565b602082019050919050565b600060208201905081810360008301526117dd816117a1565b9050919050565b6117ed816112d4565b82525050565b600060408201905061180860008301856115d9565b61181560208301846117e4565b9392505050565b60008115159050919050565b6118318161181c565b811461183c57600080fd5b50565b60008151905061184e81611828565b92915050565b60006020828403121561186a576118696112ca565b5b60006118788482850161183f565b91505092915050565b7f436f756c64206e6f742077697468647261772c207478206661696c6564000000600082015250565b60006118b7601d83611672565b91506118c282611881565b602082019050919050565b600060208201905081810360008301526118e6816118aa565b9050919050565b7f636f6e747261637420646f6573206e6f74206861766520656e6f75676820626160008201527f6c616e636520746f206578656375746520617262697472616765207472616465602082015250565b6000611949604083611672565b9150611954826118ed565b604082019050919050565b600060208201905081810360008301526119788161193c565b9050919050565b7f6265666f72650000000000000000000000000000000000000000000000000000600082015250565b60006119b5600683611672565b91506119c08261197f565b602082019050919050565b60006040820190506119e060008301846117e4565b81810360208301526119f1816119a8565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b6000604082019050611a3d60008301856117e4565b611a4a60208301846115d9565b9392505050565b6000604082019050611a6660008301856115d9565b611a7360208301846115d9565b9392505050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b611aaf81611474565b82525050565b6000611ac18383611aa6565b60208301905092915050565b6000602082019050919050565b6000611ae582611a7a565b611aef8185611a85565b9350611afa83611a96565b8060005b83811015611b2b578151611b128882611ab5565b9750611b1d83611acd565b925050600181019050611afe565b5085935050505092915050565b6000604082019050611b4d60008301856117e4565b8181036020830152611b5f8184611ada565b90509392505050565b600067ffffffffffffffff821115611b8357611b826113ad565b5b602082029050602081019050919050565b6000611ba7611ba284611b68565b61140d565b90508083825260208201905060208402830185811115611bca57611bc9611341565b5b835b81811015611bf35780611bdf8882611630565b845260208401935050602081019050611bcc565b5050509392505050565b600082601f830112611c1257611c11611337565b5b8151611c22848260208601611b94565b91505092915050565b600060208284031215611c4157611c406112ca565b5b600082015167ffffffffffffffff811115611c5f57611c5e6112cf565b5b611c6b84828501611bfd565b91505092915050565b6000611c7f826112d4565b9150611c8a836112d4565b9250828202611c98816112d4565b91508282048414831517611caf57611cae611715565b5b5092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b6000611cf0826112d4565b9150611cfb836112d4565b925082611d0b57611d0a611cb6565b5b828204905092915050565b600060a082019050611d2b60008301886117e4565b611d3860208301876117e4565b8181036040830152611d4a8186611ada565b9050611d5960608301856115d9565b611d6660808301846117e4565b9695505050505050565b7f4f7468657220746f6b656e20616d6f756e74734f7574206e6f7420656e6f756760008201527f6800000000000000000000000000000000000000000000000000000000000000602082015250565b6000611dcc602183611672565b9150611dd782611d70565b604082019050919050565b60006020820190508181036000830152611dfb81611dbf565b9050919050565b7f6166746572000000000000000000000000000000000000000000000000000000600082015250565b6000611e38600583611672565b9150611e4382611e02565b602082019050919050565b6000604082019050611e6360008301846117e4565b8181036020830152611e7481611e2b565b905092915050565b7f7472616465206973206e6f742070726f66697461626c65000000000000000000600082015250565b6000611eb2601783611672565b9150611ebd82611e7c565b602082019050919050565b60006020820190508181036000830152611ee181611ea5565b905091905056fea2646970667358221220d59eaf7196d0cab657f3b3453389834af4c21090a23f25a2c2059be05c22e07064736f6c63430008150033"

async function deployContract() {
    const factory = new ethers.ContractFactory(contractABI, contractBytecode, signer);
    const contract = await factory.deploy(); // Add constructor arguments if needed
  
    console.log("Deploying contract...");
    console.log("Contract deployed at:", contract.target);
  }
  
  deployContract().catch(console.error);