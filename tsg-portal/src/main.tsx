import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StarknetConfig, braavos, argent, voyager, jsonRpcProvider } from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';

function rpc() {
  return {
    nodeUrl: "https://starknet-sepolia.public.blastapi.io"
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StarknetConfig
      chains={[sepolia]}
      provider={jsonRpcProvider({ rpc })}
      connectors={[braavos(), argent()]}
      explorer={voyager}
      autoConnect
    >
      <App />
    </StarknetConfig>
  </StrictMode>,
)
