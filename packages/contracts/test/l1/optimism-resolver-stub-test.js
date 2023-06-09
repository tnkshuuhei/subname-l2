const { expect } = require("chai");
const { ethers } = require("hardhat");
const { keccak256 } = require("ethers/lib/utils");
const { smock } = require("@defi-wonderland/smock");

const namehash = require("eth-ens-namehash");
const testNode = namehash.hash("test.eth");
const { defaultAbiCoder, hexConcat, Interface } = require("ethers/lib/utils");
const IResolverAbi = require("../../artifacts/contracts/l1/OptimismResolverStub.sol/IResolverService.json")
  .abi;
const {
  DUMMY_BATCH_HEADERS,
  DUMMY_BATCH_PROOFS,
} = require("./helpers/constants");
const { TrieTestGenerator } = require("./helpers/trie-test-generator");
const { toHexString } = require("./helpers/utils");

const RESOLVER_ADDR = "0x0123456789012345678901234567890123456789";
const GATEWAYS = ["http://localhost:8080/query/" + RESOLVER_ADDR];

const setProxyTarget = async (AddressManager, name, target) => {
  const SimpleProxy = await (
    await ethers.getContractFactory("Helper_SimpleProxy")
  ).deploy();
  await SimpleProxy.setTarget(target.address);
  await AddressManager.setAddress(name, SimpleProxy.address);
};

const makeAddressManager = async () => {
  return (await ethers.getContractFactory("Lib_AddressManager")).deploy();
};
const proofInterface = new Interface(IResolverAbi);
describe("OptimismResolverStub", function() {
  let signer;
  let account2;
  before(async () => {
    [signer, account2] = await ethers.getSigners();
  });

  let addressManager;
  before(async () => {
    addressManager = await makeAddressManager();
  });

  let mock__CanonicalTransactionChain;
  let mock__StateCommitmentChain;
  before(async () => {
    mock__CanonicalTransactionChain = await smock.fake(
      "CanonicalTransactionChain"
    );
    mock__StateCommitmentChain = await smock.fake("StateCommitmentChain");

    await setProxyTarget(
      addressManager,
      "CanonicalTransactionChain",
      mock__CanonicalTransactionChain
    );
    await setProxyTarget(
      addressManager,
      "StateCommitmentChain",
      mock__StateCommitmentChain
    );
  });

  let Factory__OptimismResolverStub;
  before(async () => {
    Factory__OptimismResolverStub = await ethers.getContractFactory(
      "OptimismResolverStub"
    );
  });

  let stub, callbackFunction;
  beforeEach(async () => {
    stub = await Factory__OptimismResolverStub.deploy(
      addressManager.address,
      GATEWAYS,
      RESOLVER_ADDR
    );
    callbackFunction = stub.interface.getSighash("addrWithProof(bytes, bytes)");
    callData = stub.interface.encodeFunctionData("addr(bytes32)", [testNode]);
    await stub.deployed();
  });

  it("Should return the gateways and contract address from the constructor", async function() {
    expect(await stub.l2resolver()).to.equal(RESOLVER_ADDR);
    expect(await stub.gateways(0)).to.equal(GATEWAYS[0]);
  });

  describe("addr", async () => {
    it("returns a CCIP-read error", async () => {
      try {
        await stub["addr(bytes32)"](testNode);
      } catch (e) {
        expect(e.errorName).to.equal("OffchainLookup");
        expect(e.errorArgs.urls[0]).to.equal(GATEWAYS[0]);
        expect(e.errorArgs.callbackFunction).to.equal(callbackFunction);
        expect(e.errorArgs.callData).to.equal(callData);
        expect(e.errorArgs.extraData).to.equal(testNode);
      }
    });
  });

  describe("addrWithProof", () => {
    let testAddress;
    let proof;
    before(async () => {
      testAddress = await account2.getAddress();
      const storageKey = keccak256(testNode + "00".repeat(31) + "01");
      const storageGenerator = await TrieTestGenerator.fromNodes({
        nodes: [
          {
            key: storageKey,
            // 0x94 is the RLP prefix for a 20-byte string
            val: "0x94" + testAddress.substring(2),
          },
        ],
        secure: true,
      });

      const generator = await TrieTestGenerator.fromAccounts({
        accounts: [
          {
            address: RESOLVER_ADDR,
            nonce: 0,
            balance: 0,
            codeHash: keccak256("0x1234"),
            storageRoot: toHexString(storageGenerator._trie.root),
          },
        ],
        secure: true,
      });

      proof = {
        stateRoot: toHexString(generator._trie.root),
        stateRootBatchHeader: DUMMY_BATCH_HEADERS[0],
        stateRootProof: DUMMY_BATCH_PROOFS[0],
        stateTrieWitness: (await generator.makeAccountProofTest(RESOLVER_ADDR))
          .accountTrieWitness,
        storageTrieWitness: (
          await storageGenerator.makeInclusionProofTest(storageKey)
        ).proof,
      };
    });

    beforeEach(async () => {
      mock__StateCommitmentChain.verifyStateCommitment.returns(true);
    });

    it("should verify proofs of resolution results", async function() {
      const responseData = proofInterface.encodeFunctionResult(
        "addr(bytes32)",
        [proof]
      );
      expect(await stub.addrWithProof(responseData, testNode)).to.equal(
        testAddress
      );
    });
  });
});
