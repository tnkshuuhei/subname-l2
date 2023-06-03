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
  console.log(1, hre.network, CONSTANTS.OVM_ADDRESS_MANAGERS);
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

  // Deploy the resolver stub
  console.log(2);
  const OptimismResolverStub = await ethers.getContractFactory(
    "OptimismResolverStub"
  );

  //////////////////////////////////////
  // estimate gas
  const gasPrice = await OptimismResolverStub.signer.getGasPrice();
  console.log(`Current gas price: ${gasPrice}`);
  const estimatedGas = await OptimismResolverStub.signer.estimateGas(
    OptimismResolverStub.getDeployTransaction(
      OVM_ADDRESS_MANAGER,
      [hre.network.config.gatewayurl],
      RESOLVER_ADDRESS
    )
  );
  console.log(`Estimated gas: ${estimatedGas}`);
  const deploymentPrice = gasPrice.mul(estimatedGas);
  const deployerBalance = await OptimismResolverStub.signer.getBalance();
  console.log(
    `Deployer balance:  ${ethers.utils.formatEther(deployerBalance)}`
  );
  console.log(
    `Deployment price:  ${ethers.utils.formatEther(deploymentPrice)}`
  );
  if (deployerBalance.lt(deploymentPrice)) {
    throw new Error(
      `Insufficient funds. Top up your account balance by ${ethers.utils.formatEther(
        deploymentPrice.sub(deployerBalance)
      )}`
    );
  }
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
  if (hre.network.name === "localhost") {
    // Deploy the ENS registry
    const ENS = await ethers.getContractFactory("ENSRegistry");
    const ens = await ENS.deploy();
    await ens.deployed();
    console.log(`ENS registry deployed at ${ens.address}`);

    let tx = await ens.setSubnodeOwner(
      "0x" + "00".repeat(32),
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("0xshutanaka")),
      accounts[0].address
    );
    tx = await ens.setSubnodeOwner(
      namehash.hash("0xshutanaka"),
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("eth")),
      accounts[0].address
    );

    rcpt = await tx.wait();
    console.log(18);
    // Set the stub as the resolver for test.test
    tx = await ens.setResolver(namehash.hash("0xshutanaka.eth"), stub.address);
    rcpt = await tx.wait();
    console.log(19, ens.address);
    console.log(await ens.owner(namehash.hash("0xshutanaka.eth")));
    console.log(await ens.resolver(namehash.hash("0xshutanaka.eth")));
    console.log(hre.network.config, ens.address);
    provider = new ethers.providers.JsonRpcProvider(hre.network.config.url, {
      chainId: hre.network.config.chainId,
      name: "unknown",
      ensAddress: ens.address,
    });
    const ens2 = new ethers.Contract(ens.address, abi, provider);
    console.log(await ens2.resolver(namehash.hash("0xshutanaka.eth")));
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
