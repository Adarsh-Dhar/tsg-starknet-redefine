import { Contract, ElectrumNetworkProvider } from 'cashscript';
import fs from 'fs';

const artifact = JSON.parse(fs.readFileSync('/Users/adarsh/Documents/touch-some-grass/contract/Delegation.json', 'utf8'));
const pubkey = '02dbfac7875a46417263feda159e09445711f759e8a976a0d54ccd253bddb4826c';
const provider = new ElectrumNetworkProvider('chipnet');

try {
  const contract = new Contract(artifact, [pubkey, pubkey], { provider });
  console.log('Success:', contract.address);
} catch (e) {
  console.error('Error:', e.message);
}