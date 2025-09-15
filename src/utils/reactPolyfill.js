/**
 * React Polyfill for Production Build
 * Ensures React is available globally for vendor chunks that expect it
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';

// Make React available globally for vendor chunks that might expect it
if (typeof window !== 'undefined') {
  // Expose React globally
  window.React = React;
  window.ReactDOM = ReactDOM;

  // Log success for debugging
  console.log('✅ React polyfill: React and ReactDOM exposed globally');

  // Verify hooks are available
  if (typeof React.useLayoutEffect === 'undefined') {
    console.error('❌ React.useLayoutEffect is not available!');
  } else {
    console.log('✅ React hooks verified');
  }
}

// Export for compatibility
export { React, ReactDOM };
export default React;