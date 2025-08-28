import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ForensicWorkflowTest from './utils/testWorkflow'

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
