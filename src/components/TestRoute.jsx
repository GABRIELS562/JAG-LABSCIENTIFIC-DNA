import React from 'react';

const TestRoute = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Route Works!</h1>
      <p>If you can see this, routing is working.</p>
      <p>Current URL: {window.location.pathname}</p>
    </div>
  );
};

export default TestRoute;