/// <reference types="chrome" />
import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useProvider } from "@starknet-react/core";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
// Use 'type' for Abi to satisfy verbatimModuleSyntax
import { uint256, Contract, type Abi } from 'starknet';
import GravityVaultAbi from './abi/GravityVault.json';

// Since the JSON is a direct array, cast the import itself
const GRAVITY_VAULT_ABI = GravityVaultAbi as unknown as Abi;

const VAULT_ADDRESS = "0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769";
const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

function App() {
  const accountInfo = useAccount();
  const { address, account, isConnected } = accountInfo;
  const provider = useProvider();
  // Log provider details for debugging
  useEffect(() => {
    const envRpc = import.meta.env.VITE_STARKNET_RPC;
    if (provider && provider.provider) {
      console.log("[DEBUG] Starknet provider endpoint (from .env):", envRpc);
    } else {
      console.warn("[WARN] Starknet provider is not set up correctly.", provider);
    }
  }, [provider]);
  console.log("useAccount() output:", accountInfo);
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [delegatedBal, setDelegatedBal] = useState<string>("0.00");

  // Wait for account to be initialized before allowing contract calls
  const refreshBalance = async () => {
    console.log("refreshBalance called");
    // Only use account if defined, otherwise use provider.provider (starknet.js Provider)
    if (!provider || !provider.provider) {
      alert("Starknet provider is not set up. Please check your network or RPC configuration.");
      return;
    }
    const providerOrAccount = account ? account : provider.provider;
    if (!address) {
      console.error("[ERROR] No address found, aborting balance refresh.");
      console.log("Full useAccount() output:", accountInfo);
      return;
    }
    try {
        console.log("Instantiating Contract with:", {
          abi: GRAVITY_VAULT_ABI,
          address: VAULT_ADDRESS,
          providerOrAccount
        });
      // Use new starknet.js v9+ Contract signature (object form)
        const vault = new Contract({
          abi: GRAVITY_VAULT_ABI,
          address: VAULT_ADDRESS,
          providerOrAccount
        });
      console.log("Contract instance created:", vault);
      console.log("Calling get_balance with address:", address);
      const resAddr = await vault.get_balance(address);
      console.log("get_balance result:", resAddr);
      if (resAddr) {
        console.log("Parsing u256 result:", resAddr);
        const amountBigInt = uint256.uint256ToBN(resAddr);
        console.log("Converted to BigInt:", amountBigInt);
        const addrBal = (Number(amountBigInt) / 10 ** 18).toFixed(4);
        console.log("Formatted balance for STRK:", addrBal);
        setDelegatedBal(addrBal);
        console.log(`Balance sync successful: ${addrBal} STRK`);
        
        // PUSH TO DB: This is the ONLY way the extension will get the amount
        try {
          await fetch('http://localhost:3333/api/delegate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: address,
              amount: Number(addrBal),
              txHash: "manual_refresh" // Indicates this is a balance refresh, not a transaction
            })
          });
          console.log("Portal: Pushed delegation data to backend database");
        } catch (dbError) {
          console.warn("Portal: Failed to sync with database (non-critical):", dbError);
        }
        
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ 
            starknet_address: address,
            delegated_amount: Number(addrBal)
          }, () => {
            console.log("Portal: Synced delegation data to storage");
          });
        }
      } else {
        console.log("No result returned from get_balance.");
      }
    } catch (err) {
      console.error("Contract call failed. Ensure VAULT_ADDRESS is correct:", err);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      console.log("useEffect triggered", isConnected, address);
      refreshBalance();
      const interval = setInterval(() => {
        console.log("Interval: calling refreshBalance");
        refreshBalance();
      }, 10000);
      return () => clearInterval(interval);
    } else if (!isConnected) {
      // Clear storage on disconnect
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove(['starknet_address', 'delegated_amount'], () => {
          console.log("Portal: Cleared storage on disconnect");
        });
      }
    }
  }, [isConnected, address]);

  const handleTransaction = async (type: 'delegate' | 'undelegate') => {
    if (!account || !address) {
      alert("No wallet/account connected.");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }
    setLoading(true);
    try {
      const amountInWei = uint256.bnToUint256(BigInt(Math.floor(parseFloat(amount) * 10 ** 18)));
      
      const calls = type === 'delegate' ? [
        {
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: "approve",
          calldata: [VAULT_ADDRESS, amountInWei.low, amountInWei.high]
        },
        {
          contractAddress: VAULT_ADDRESS,
          entrypoint: "deposit", // Matches address-based contract
          calldata: [amountInWei.low, amountInWei.high]
        }
      ] : [
        {
          contractAddress: VAULT_ADDRESS,
          entrypoint: "reclaim", // Matches address-based contract
          calldata: [amountInWei.low, amountInWei.high]
        }
      ];

      const result = await account.execute(calls);
      const txHash = result?.transaction_hash;
      
      if (!txHash) throw new Error("No transaction hash returned.");
      
      await account.waitForTransaction(txHash);
      
      // Sync delegation with backend database
      if (type === 'delegate') {
        try {
          const syncResponse = await fetch('http://localhost:3333/api/delegate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: address,
              amount: parseFloat(amount),
              txHash: txHash
            })
          });
          
          if (!syncResponse.ok) {
            const errorText = await syncResponse.text();
            console.error('Failed to sync delegation with backend:', errorText);
            alert('Warning: Transaction succeeded on-chain but backend sync failed. Please refresh.');
          } else {
            const syncData = await syncResponse.json();
            console.log('Backend sync successful:', syncData);
            
            // Update chrome storage with confirmed database state
            if (typeof chrome !== 'undefined' && chrome.storage) {
              chrome.storage.local.set({ 
                starknet_address: address,
                delegated_amount: syncData.delegation.amountDelegated
              }, () => {
                console.log('Portal: Updated storage with backend-confirmed delegation');
              });
            }
          }
        } catch (syncError) {
          console.error('Database sync failed, but transaction succeeded on-chain:', syncError);
          alert('Warning: Transaction succeeded but backend sync failed. The extension may take longer to update.');
        }
      }
      
      // Add a short delay before refreshing balance to allow contract state to update
      setTimeout(async () => {
        await refreshBalance();
        setAmount("");
        alert("Transaction successful!");
      }, 3000);
    } catch (e) {
      console.error(`${type} error:`, e);
      alert(`Transaction Failed: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      <nav className="absolute top-0 right-0 p-6 z-50">
        {!isConnected ? (
          connectors.map((connector) => (
            connector.id === 'braavos' && (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-bold hover:bg-emerald-400 transition-all active:scale-95 z-50"
              >
                <Wallet size={18} /> Connect Braavos
              </button>
            )
          ))
        ) : (
          <button 
            onClick={() => disconnect()}
            className="text-xs text-rose-400/60 hover:text-rose-400 uppercase tracking-widest transition-colors z-50"
          >
            Disconnect {address?.slice(0, 6)}...
          </button>
        )}
      </nav>

      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[400px] animate-in fade-in zoom-in duration-500">
          <div className="p-8 rounded-3xl border border-emerald-500/20 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black text-emerald-400 tracking-tight">Gravity Vault</h1>
              <p className="text-slate-400 text-sm mt-1 font-mono uppercase tracking-tighter">Starknet Delegation Portal</p>
              
              <div className="mt-6 p-4 rounded-2xl bg-slate-950/40 border border-emerald-500/5">
                <p className="text-[10px] text-emerald-400/50 uppercase font-bold mb-1 tracking-widest">Active Delegation</p>
                <p className="text-3xl font-mono font-bold text-white">
                  {delegatedBal} <span className="text-xs text-slate-500">STRK</span>
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-emerald-400/50 uppercase font-bold tracking-widest ml-1">
                  Amount (STRK)
                </label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  className="w-full p-4 rounded-2xl bg-slate-950/50 border border-emerald-500/10 text-white text-xl font-bold outline-none focus:border-emerald-500/40 transition-all placeholder:text-slate-700" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleTransaction('delegate')}
                  disabled={loading || !isConnected || !amount}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-20 transition-all group z-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <ArrowDownCircle className="group-hover:translate-y-0.5 transition-transform" />}
                  Delegate
                </button>
                
                <button 
                  onClick={() => handleTransaction('undelegate')}
                  disabled={loading || !isConnected || !amount}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-emerald-500/20 text-emerald-400 font-bold hover:bg-emerald-500/5 disabled:opacity-20 transition-all group z-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <ArrowUpCircle className="group-hover:-translate-y-0.5 transition-transform" />}
                  Undelegate
                </button>
              </div>

              {!isConnected && (
                <p className="text-[10px] text-center text-rose-400/60 uppercase font-bold tracking-tighter">
                  Please connect your wallet to interact
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;