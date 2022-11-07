import { Command } from 'commander';
import { ethers } from 'ethers';
import 'isomorphic-fetch';

const namehash = require('eth-ens-namehash');
const StubAbi = require('../../contracts/artifacts/contracts/l1/OptimismResolverStub.sol/OptimismResolverStub.json').abi
const IResolverAbi = require('../../contracts/artifacts/contracts/l1/OptimismResolverStub.sol/IResolverService.json').abi
const program = new Command();
program
  .requiredOption('-r --registry <address>', 'ENS registry address')
  .option('-l1 --l1_provider_url <url1>', 'L1_PROVIDER_URL')
  .option('-l2 --l2_provider_url <url2>', 'L2_PROVIDER_URL')
  .option('-i --chainId <chainId>', 'chainId', '31337')
  .option('-n --chainName <name>', 'chainName', 'unknown')
  .argument('<name>');

program.parse(process.argv);
const options = program.opts();
const ensAddress = options.registry;
const chainId = parseInt(options.chainId);
const chainName = options.chainName;
console.log({provider:options.provider, ensAddress, chainId, chainName})
const provider = new ethers.providers.JsonRpcProvider(options.l1_provider_url
//   , {
//   chainId,
//   name: chainName,
//   ensAddress
// }
);
const l2provider = new ethers.providers.JsonRpcProvider(options.l2_provider_url);

(async () => {
  console.log('11', (await provider.getBlock('latest')).number)
  console.log('111', (await l2provider.getBlock('latest')).number)
  const l1ChainId = parseInt(await provider.send('eth_chainId', []))
  const l2ChainId = parseInt(await l2provider.send('eth_chainId', []))
  console.log(1, l1ChainId)
  console.log(2, l2ChainId)

  const name = program.args[0];
  console.log('12', name)

  let r = await provider.getResolver(name);
  console.log('13', r)
  const node = namehash.hash(name)
  if(r){
    const resolver = new ethers.Contract(r.address, StubAbi, provider);
    const iresolver = new ethers.Contract(r.address, IResolverAbi, provider);
    try{
      console.log('14')
      console.log(await resolver.callStatic['addr(bytes32)'](node))
      
      // When all works, these should return an address
      // console.log('142', await r.getAddress());
      // console.log('143', await provider.resolveName(name));
    }catch(e){
      // Manually calling the gateway
      console.log('15', e.errorArgs)
      if(e.errorArgs){
        const {sender, urls, callData, callbackFunction, extraData } = e.errorArgs
        console.log(16,{sender, urls, callData, callbackFunction, extraData})
        const url = urls[0].replace(/{sender}/, sender).replace(/{data}/, callData)
        console.log(17, {url})
        const responseData:any = await (await fetch(url)).json()
        if(responseData){
          console.log(18, {node, responseData})
          const storageProof = iresolver.interface.decodeFunctionResult("addr", responseData.data);
          console.log(181, storageProof)
          const string = 'addrWithProof(bytes32,(bytes32,(uint256,bytes32,uint256,uint256,bytes),(uint256,bytes32[]),bytes,bytes))'  
          try{
            // const result = await resolver.callStatic[string](node, storageProof)
            // console.log('1811', result)
            // alternative way to call the function
            console.log('1811')
            const data =  resolver.interface.encodeFunctionData('addrWithProof', [node, storageProof])
            console.log('1812', {data})
            const result = await resolver.provider.call({
              to: resolver.address,
              data,
            });
            console.log('1813', {result})
            const decodedResult = resolver.interface.decodeFunctionResult("addrWithProof", result);
            console.log('1814', {decodedResult})
  
          }catch(ee){
            console.log({ee})
          }  
        }
      }
    }  
  }
})();