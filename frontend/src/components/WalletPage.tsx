import { useState } from 'react';
import { TestNetWallet } from 'mainnet-js';

export default function WalletPage() {
  const [loading, setLoading] = useState(false);

  const connectAndSendToExtension = async () => {
    setLoading(true);
    try {
      // 1. Generate a new testnet wallet
      const wallet = await TestNetWallet.newRandom();
      
      // FIX 1: Ensure public key exists to satisfy TypeScript
      if (!wallet.publicKey) {
        throw new Error("Failed to generate public key.");
      }
      
      // 2. Convert the valid Uint8Array into Hex
      const pubKeyBytes = wallet.publicKey;
      const userPubKeyHex = Array.from(pubKeyBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // FIX 2: Use getDepositAddress() instead of .address
      const walletAddress = wallet.getDepositAddress();
      console.log("Generated Wallet Address:", walletAddress);
      console.log("Generated PubKey (Hex):", userPubKeyHex);

      // 3. Extract the Extension ID from the URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const extId = urlParams.get('extId');
      
      if (!extId) {
        alert("Extension ID missing from URL. Open this page from the extension.");
        return;
      }

      // FIX 3: Bypass TypeScript missing "chrome" types by grabbing it from the window
      const chromeApi = (window as any).chrome;
      if (!chromeApi || !chromeApi.runtime) {
        console.warn("Chrome API not found. Please open via the extension.");
        alert("Failed to connect: Chrome Extension environment missing.");
        return;
      }

      // 4. Send the payload back to the Extension
      chromeApi.runtime.sendMessage(
        extId, 
        { type: "WALLET_CONNECTED", pubKey: userPubKeyHex },
        (response: any) => {
          if (chromeApi.runtime.lastError) {
            console.error("Failed to send:", chromeApi.runtime.lastError.message);
            alert("Failed to connect. Make sure the extension is running.");
          } else {
            // Success! Close the web tab automatically
            window.close(); 
          }
        }
      );
    } catch (err) {
      console.error(err);
      alert("Error generating wallet. Check the console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Touch Grass Wallet Connect</h1>
        <p className="text-gray-600 mb-8">
          Authorize the extension to create your penalty delegation vault.
        </p>
        <button 
          onClick={connectAndSendToExtension}
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Generating & Connecting..." : "Authorize & Return to Extension"}
        </button>
      </div>
    </div>
  );
}