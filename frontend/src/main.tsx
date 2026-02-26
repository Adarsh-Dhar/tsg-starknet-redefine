import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { StarknetConfig, braavos, argent, voyager } from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StarknetConfig
      chains={[sepolia]}
      connectors={[braavos(), argent()]}
      explorer={voyager}
      autoConnect
    >
      <App />
    </StarknetConfig>
  </React.StrictMode>,
)
