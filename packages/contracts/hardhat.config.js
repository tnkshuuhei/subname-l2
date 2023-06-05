require("@nomiclabs/hardhat-ethers");
require("@eth-optimism/plugins/hardhat/compiler");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

const localGateway = "http://localhost:8081/{sender}/{data}.json";
module.exports = {
  networks: {
    hardhat: {
      // throwOnCallFailures: false,
      chainId: 31337,
      gatewayurl: localGateway,
    },
    localhost: {
      // throwOnCallFailures: false,
      url: "http://localhost:9545",
      chainId: 31337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
      },
      gatewayurl: localGateway,
    },
    optimismLocalhost: {
      url: "http://localhost:8545",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
      },
    },
    goerli: {
      url: process.env.L1_PROVIDER_URL || "http://localhost:9545",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 5,
      gatewayurl:
        // "https://op-resolver-example.uc.r.appspot.com/{sender}/{data}.json",
        "0x0af7bfb9bc54e4ca0d48c30d6c0396b919c5abd7",
    },
    optimismGoerli: {
      url: process.env.L2_PROVIDER_URL || "http://localhost:8545",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  solidity: {
    version: "0.8.9",
  },
};
