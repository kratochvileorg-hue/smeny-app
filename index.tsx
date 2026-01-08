import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logErrorToDb } from './firebase';

// Global error handlers to catch issues outside React
window.onerror = (message, source, lineno, colno, error) => {
  logErrorToDb(error || new Error(String(message)), `Global window.onerror: ${source}:${lineno}`);
};

window.onunhandledrejection = (event) => {
  logErrorToDb(event.reason, 'Unhandled Promise Rejection');
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);