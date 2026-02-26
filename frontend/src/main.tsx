// frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { StarknetConfig, braavos, argent, voyager, jsonRpcProvider } from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';
import './index.css'

// Define a provider function that explicitly handles the RPC connection
function rpc() {
  return {
    // You can use a public node or your own API key from Alchemy/Infura
    nodeUrl: "https://starknet-sepolia.public.blastapi.io" 
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StarknetConfig
      chains={[sepolia]}
      provider={jsonRpcProvider({ rpc })} // Use jsonRpcProvider instead of publicProvider
      connectors={[braavos(), argent()]}
      explorer={voyager}
      autoConnect
    >
      <App />
    </StarknetConfig>
  </React.StrictMode>,
)