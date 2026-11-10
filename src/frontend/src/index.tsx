import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// Captcha de Cloudflare en logins y altas (no hay otro wrapper de fetch: si se agrega, va antes de esto).
import { installTurnstile } from './utils/turnstile';

installTurnstile();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);