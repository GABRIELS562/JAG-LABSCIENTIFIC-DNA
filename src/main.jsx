// Import React polyfill first to ensure React hooks are available globally
import './utils/reactPolyfill';
import React, { StrictMode } from 'react'
import ReactDOM, { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ForensicWorkflowTest from './utils/testWorkflow'
import { initSW } from './utils/serviceWorker'
import { logEnvironmentInfo } from './utils/environment'

// Initialize environment and service worker
logEnvironmentInfo();
initSW();

// Ensure React is available globally for vendor chunks
if (typeof window !== 'undefined') {
  window.React = React;
  window.ReactDOM = ReactDOM;
  console.log('✅ React exposed globally for vendor chunks');
}

// Make test available globally for console testing
window.ForensicWorkflowTest = ForensicWorkflowTest;
window.runWorkflowTest = async () => {
  const test = new ForensicWorkflowTest();
  return await test.runCompleteWorkflow();
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
