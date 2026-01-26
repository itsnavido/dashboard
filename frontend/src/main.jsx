import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryProvider } from './providers/QueryProvider';
import { SettingsProvider } from './contexts/SettingsContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SettingsProvider>
      <QueryProvider>
        <App />
      </QueryProvider>
    </SettingsProvider>
  </React.StrictMode>
);

