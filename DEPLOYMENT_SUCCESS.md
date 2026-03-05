# GravityVault Deployment Summary

## ✅ Deployment Successful

**Date:** March 5, 2026  
**Network:** Starknet Sepolia Testnet

## Contract Details

**Class Hash:** `0x6f50ea1f5ee6905f98930f21ea4ed00c86cac2a75392c8727f4e17309ec9a2b`  
**Contract Address:** `0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630`  
**Transaction Hash:** `0x072cc7955794cd539efc09f58a21af7d3b52597f35c218bf6713088a9ae6c871`

## Constructor Parameters

- **Delegate Address:** `0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3` (Backend account)
- **Token Address:** `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` (STRK token on Sepolia)

## Explorer Links

- **Contract:** https://sepolia.voyager.online/contract/0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630
- **Class:** https://sepolia.voyager.online/class/0x06f50ea1f5ee6905f98930f21ea4ed00c86cac2a75392c8727f4e17309ec9a2b
- **Deployment Transaction:** https://sepolia.voyager.online/tx/0x072cc7955794cd539efc09f58a21af7d3b52597f35c218bf6713088a9ae6c871

## Current Status

✅ Contract declared successfully  
✅ Contract deployed successfully  
✅ Server updated with new contract address  
✅ Real blockchain integration working  
⚠️ Users need to delegate STRK tokens to the vault before transfers work

## Next Steps

1. **For Users:** Delegate STRK tokens to the vault contract
2. **Test Transfer:** Once delegated, transfers will execute on-chain
3. **Monitor:** Check transactions on Voyager explorer

## Environment Configuration

Updated `.env` files with:
```
VAULT_ADDRESS=0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630
```

## Testing

The system now attempts real blockchain transfers. When a transfer is requested:
- ✅ Connects to Starknet Sepolia RPC
- ✅ Creates Account with backend credentials
- ✅ Invokes the vault's `transfer()` function
- ✅ Returns real transaction hashes from the blockchain
- ⚠️ Will fail with `INSUFFICIENT_FUNDS` if user hasn't delegated tokens

## Tools Used

- **sncast** (Starknet Foundry): v0.57.0
- **scarb** (Cairo build tool): v2.15.0
- **universal-sierra-compiler**: v2.7.0

## Smart Contract Functions

The deployed `GravityVault` contract supports:
- `delegate(amount)` - Delegate STRK to the vault
- `undelegate(amount)` - Withdraw delegated STRK
- `transfer(user, recipient, amount)` - Transfer from user's delegation to recipient
- `get_delegation(user)` - Query user's delegated balance
