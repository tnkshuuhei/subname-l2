# Optimism Resolver

This repository contains smart contracts and a node.js gateway server that together allow storing ENS names on Optimism using EIP 3668 and ENSIP 10.

## Overview

ENS resolution requests to the resolver implemented in this repository are responded to with a directive to query a gateway server for the answer. The gateway server calls `crossChainMessenger.getStorageProof(l2resolverAddress, addrSlot, storageOption)` to fetch the storage proof from Optimism, which is sent back to the original resolver for decoding and verification. Full details of this request flow can be found in EIP 3668.

Unlike [Offchain Resolver](https://github.com/ensdomains/offchain-resolver) that requires a trust assumption of gateway signing the response to attest the authenticity of the response data, Optimism resolver validates the cryptographic proof that the given storage was included in the part of the Optimism state. For more information about the overall architecture, please refer to [the blog post](https://medium.com/the-ethereum-name-service/mvp-of-ens-on-l2-with-optimism-demo-video-how-to-try-it-yourself-b44c390cbd67).

## Usage

In a terminal window, download, build, and run Optimism repository. Read [here](https://community.optimism.io/docs/developers/build/dev-node/#setting-up-the-environment) for more detail

```
$ git clone https://github.com/ethereum-optimism/optimism.git
$ cd optimism
$ cd ops
$ docker-compose pull
$ docker-compose up
```

In a second terminal window, deploy our code to the L1 and L2 chains exposed by optimism-integration:

```
$ git clone git@github.com:ensdomains/op-resolver.git
$ cd op-resolver/packages/contracts
$ yarn
$ yarn hardhat --network optimismLocalhost run scripts/deployL2.js
$ // take notes the resolver address
$ RESOLVER_ADDRESS=  yarn hardhat --network localhost run scripts/deployL1.js
```

Make note of the ENS registry address logged to the console.

Now run the gateway service:

```
$ cd ../gateway
$ yarn
$ yarn start --l1_provider_url http://localhost:9545 --l2_provider_url http://localhost:8545 --l2_resolver_address L2_RESOLVER_ADDRESS
```

In a third console window, serve up the demo app:

```
$ cd ../client
$ yarn start --registry L1_REGISTRY_ADDRESS test.test --l1_provider_url http://localhost:9545
```

If you want to see extra debugging info, pass `--debug` option to both command

## Notes on Gateway

Due to the "Optimistic" nature of the rollup, the state is only finalised after 7 days.
You can specify `-v` option to either be `latest`, `finalized`, or the default.

- `latest` returns the state proof that was published into L1 (~20 minutes)
- `finalized` return the proof that passed the challenge period (1 week)
- The default sets sets `{l1BlocksAgo: 2000}` option when quering the proof from Optimism to wait for 2000 blocks (a few hours)

## How to deploy to public net (goerli for example)

### Deploy l2 contract

L1_PROVIDER_URL=L1_PROVIDER_URL L2_PROVIDER_URL=L2_PROVIDER_URL PRIVATE_KEY=PRIVATE_KEY
`npx hardhat --network optimismGoerli run scripts/deployL2.js`

### Deploy l1 contract

L1_PROVIDER_URL=L1_PROVIDER_URL L2_PROVIDER_URL=L2_PROVIDER_URL PRIVATE_KEY=PRIVATE_KEY
RESOLVER_ADDRESS=RESOLVER_ADDRESS
`yarn hardhat --network goerli run scripts/deployL1.js`

### Verify l1 contract

RESOLVER_ADDRESS= L1_PROVIDER_URL= ETHERSCAN_API_KEY=
`npx hardhat verify --network goerli --constructor-args scripts/arguments.js CONTRACT_ADDRESS`

## Deployed contracts

- op goerli resolver = 0x470B48eE90Cec0eb6834B986fEA4F3698C986AC4
- goerli (gateway points to 'https://op-resolver-example.uc.r.appspot.com/{sender}/{data}.json' ) = [0x0AF7BfB9bC54E4ca0D48C30d6c0396B919c5abd7](https://goerli.etherscan.io/address/0x0AF7BfB9bC54E4ca0D48C30d6c0396B919c5abd7)
- goerli test domain = [opresolver.eth](https://app.ens.domains/name/opresolver.eth/details)

## Deploy gateway

Create secret.yaml and update credentials

```
cd gateway
cp secret.yaml.org secret.yaml
```

Deploy to app engine

```
gcloud app deploy goeril.app.yml
```

## Components

### [Client](client)

A very simple script that tests if ccip-read integration is working

### [Contracts](contracts)

`OptimismResolverStub` is a L1 (Ethereum) ENS resolver contract that implements the proposed protocol, with
functions to return the gateway address and required prefix for a query, and to verify the response from the gateway.

`OptimismResolver` is an L2 (Optimism) ENS resolver contract that stores and returns the data necessary to resolve an ENS name.

### [Gateway](gateway)

A node-based gateway server that answers queries for l2 gateway function calls relating to Optimism-based L2 resolvers.

## .env

```
PRIVATE_KEY=
L1_PROVIDER_URL=
L2_PROVIDER_URL=
ETHERSCAN_API_KEY=
TEST_NAME=
RESOLVER_ADDRESS=0x3950A41e61c30cE767f9D4fe37234D5D7f62A9d2
REGISTRY_ADDRESS=0xC6b418Bc05120CD5F5fFe17e1938827F0D07cCCb
CONTRACT_ADDRESS=0x06cAdb30706729d59DeAEFfe1C351A60e83c3602
```
