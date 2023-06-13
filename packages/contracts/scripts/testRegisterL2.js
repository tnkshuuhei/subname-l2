const hre = require("hardhat");
const { ethers } = hre;
const namehash = require("eth-ens-namehash");
require("dotenv").config();

let SUB_NAME = "gpt";
let TEST_NAME = SUB_NAME + ".shutanaka.eth";
const TEST_NODE = namehash.hash(TEST_NAME);
const TEST_ADDRESS = "0x06aa005386F53Ba7b980c61e0D067CaBc7602a62";
const resolverAddress = "0x3950A41e61c30cE767f9D4fe37234D5D7f62A9d2";

async function main() {
  /************************************
   * L2 deploy
   ************************************/
  const l2accounts = await ethers.getSigners();
  const OptimismResolver = await ethers.getContractFactory("OptimismResolver");
  const resolver = await OptimismResolver.deploy();
  await resolver.deployed();
  console.log(`OptimismResolver deployed to ${resolver.address}`);

  // Set address for ENS name
  await (await resolver.functions.setAddr(TEST_NODE, TEST_ADDRESS)).wait();

  console.log({
    TEST_NAME,
    TEST_NODE,
  });
  console.log("Address set to", await resolver["addr(bytes32)"](TEST_NODE));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
