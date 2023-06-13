const hre = require("hardhat");
const { ethers } = hre;
const namehash = require("eth-ens-namehash");
const abi = require("../artifacts/@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol/ENSRegistry.json")
  .abi;
const ResolverAbi = require("../../contracts/artifacts/contracts/l1/OptimismResolverStub.sol/OptimismResolverStub.json")
  .abi;
const CONSTANTS = require("./constants");
require("isomorphic-fetch");
require("dotenv").config();

let RESOLVER_ADDRESS;
async function main() {
  // console.log(1, hre.network, CONSTANTS.OVM_ADDRESS_MANAGERS);
  let OVM_ADDRESS_MANAGER;
  if (hre.network.name == "localhost") {
    const metadata = await (
      await fetch("http://localhost:8080/addresses.json")
    ).json();
    console.log(metadata);
    OVM_ADDRESS_MANAGER = metadata.AddressManager;
  } else {
    OVM_ADDRESS_MANAGER = CONSTANTS.OVM_ADDRESS_MANAGERS[hre.network.name];
  }
  if (process.env.RESOLVER_ADDRESS) {
    RESOLVER_ADDRESS = process.env.RESOLVER_ADDRESS;
  } else {
    throw "Set RESOLVER_ADDRESS=";
  }
  /************************************
   * L1 deploy
   ************************************/
  const accounts = await ethers.getSigners();
  console.log("account[0].address: ", accounts[0].address);
  // Deploy the resolver stub
  console.log(2);
  const OptimismResolverStub = await ethers.getContractFactory(
    "OptimismResolverStub"
  );

  //////////////////////////////////////
  // // estimate gas
  // const gasPrice = await OptimismResolverStub.signer.getGasPrice();
  // console.log(`Current gas price: ${gasPrice}`);
  // console.log(
  //   OVM_ADDRESS_MANAGER,
  //   [hre.network.config.gatewayurl],
  //   RESOLVER_ADDRESS
  // );
  // const estimatedGas = await OptimismResolverStub.signer.estimateGas(
  //   OptimismResolverStub.getDeployTransaction(
  //     OVM_ADDRESS_MANAGER,
  //     [hre.network.config.gatewayurl],
  //     RESOLVER_ADDRESS
  //   )
  // );
  // console.log(`Estimated gas: ${estimatedGas}`);
  // const deploymentPrice = gasPrice.mul(estimatedGas);
  // const deployerBalance = await OptimismResolverStub.signer.getBalance();
  // console.log(
  //   `Deployer balance:  ${ethers.utils.formatEther(deployerBalance)}`
  // );
  // console.log(
  //   `Deployment price:  ${ethers.utils.formatEther(deploymentPrice)}`
  // );
  // if (deployerBalance.lt(deploymentPrice)) {
  //   throw new Error(
  //     `Insufficient funds. Top up your account balance by ${ethers.utils.formatEther(
  //       deploymentPrice.sub(deployerBalance)
  //     )}`
  //   );
  // }
  //////////////////////////////////////
  console.log(
    3,
    OVM_ADDRESS_MANAGER,
    [hre.network.config.gatewayurl],
    RESOLVER_ADDRESS
  );
  const stub = await OptimismResolverStub.deploy(
    OVM_ADDRESS_MANAGER,
    [hre.network.config.gatewayurl],
    RESOLVER_ADDRESS
  );
  console.log(4);
  await stub.deployed();
  console.log(`OptimismResolverStub deployed at ${stub.address}`);

  // Create test.test owned by us
  // if (hre.network.name === "localhost") {
  // Deploy the ENS registry
  const ENS = await ethers.getContractFactory("ENSRegistry");
  const ens = await ENS.deploy();
  await ens.deployed();
  console.log(`ENS registry deployed at ${ens.address}`);

  let tx = await ens.setSubnodeOwner(
    // "0x" + "00".repeat(32),
    namehash.hash("0xshutanaka.eth"),
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("gpt")),
    // "0x06aa005386F53Ba7b980c61e0D067CaBc7602a62",
    accounts[0].address,
    { gasLimit: ethers.BigNumber.from("5000000") }
  );
  // set 0xshutanaka as a subnode of eth
  // tx = await ens.setSubnodeOwner(
  //   namehash.hash("eth"),
  //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes("0xshutanaka")),
  //   accounts[0].address,
  //   { gasLimit: ethers.BigNumber.from("5000000") }
  // );

  rcpt = await tx.wait();
  console.log(18);

  // Set the stub as the resolver for 0xshutanaka.eth
  tx = await ens.setResolver(
    namehash.hash("gpt.0xshutanaka.eth"),
    stub.address,
    {
      gasLimit: ethers.BigNumber.from("10000000"),
    }
  );
  rcpt = await tx.wait();

  console.log(19, ens.address);
  console.log("Owner: ", await ens.owner(namehash.hash("gpt.0xshutanaka.eth")));
  console.log(
    "Resolver:",
    await ens.resolver(namehash.hash("gpt.0xshutanaka.eth"))
  );
  console.log(hre.network.config, ens.address);
  provider = new ethers.providers.JsonRpcProvider(hre.network.config.url, {
    chainId: hre.network.config.chainId,
    name: "unknown",
    ensAddress: ens.address,
  });
  const ens2 = new ethers.Contract(ens.address, abi, provider);
  console.log(await ens2.resolver(namehash.hash("gpt.0xshutanaka.eth")));
  // }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
