import { useState } from 'react';
import * as bitcore from 'bitcore-lib-cash';

export default function WalletPage() {
  const [loading, setLoading] = useState(false);

  // Generate a BCH wallet using bitcore-lib-cash
  const connectAndSendToExtension = async () => {
    try {
      const privateKey = new bitcore.PrivateKey();
      const address = privateKey.toAddress().toString();
      const pubKey = privateKey.toPublicKey().toString();

      // Send the address and pubKey back to the extension (or display them)
      alert(`Address: ${address}\nPublic Key: ${pubKey}`);
      // You can implement extension messaging here as needed
    } catch (err) {
      alert('Error generating wallet: ' + err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Touch Grass Wallet Connect</h1>
        <button 
          onClick={connectAndSendToExtension}
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg"
        >
          {loading ? "Configuring Vault..." : "Authorize & Return"}
        </button>
      </div>
    </div>
  );
}