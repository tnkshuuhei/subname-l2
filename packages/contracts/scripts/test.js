const { ethers } = require("ethers");
const namehash = require("eth-ens-namehash");
require("dotenv").config();
const OptimismResolverABI = require("../artifacts/contracts/l2/OptimismResolver.sol/OptimismResolver.json")
  .abi;
const OptimismResolverStubABI = require("../artifacts/contracts/l1/OptimismResolverStub.sol/OptimismResolverStub.json")
  .abi;
const ENS_REGISTRY_ADDRESS = "0x5e029A439B4A23324A5CC2986234c2152A672524";
const provideL1 = new ethers.providers.JsonRpcProvider(
  process.env.L1_PROVIDER_URL
); // 適切なWeb3プロバイダを設定します
let TEST_NAME = process.env.TEST_NAME;
async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.L2_PROVIDER_URL
  );
  const resolverContract = new ethers.Contract(
    process.env.RESOLVER_ADDRESS,
    OptimismResolverABI,
    provider
  );

  let YOUR_ENS_NAME = TEST_NAME;
  const nameHash = namehash.hash(YOUR_ENS_NAME);
  const resolvedAddress = await resolverContract["addr(bytes32)"](nameHash);

  console.log(
    `Resolved address(L2) for ${YOUR_ENS_NAME} is ${resolvedAddress}`
  );

  const l1ResolverContract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    OptimismResolverStubABI,
    provideL1
  );
  const addr = await l1ResolverContract["addr(bytes32,uint256)"](nameHash, 0);
  console.log(`Resolved address(L1) for ${YOUR_ENS_NAME} is ${addr}`);
}

main().catch(console.error);
