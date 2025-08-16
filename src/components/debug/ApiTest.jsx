import React, { useState, useEffect } from 'react';
import { api as optimizedApi } from '../../services/api';

const ApiTest = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Test basic connection
      const healthCheck = await optimizedApi.checkHealth();
      // Test samples API
      const samples = await optimizedApi.getSamples(1, 5);
      setResult({
        health: healthCheck,
        samples: samples,
        baseURL: optimizedApi.baseURL
      });
      
    } catch (err) {
      console.error('API Test Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h2>API Debug Test</h2>
      
      <button onClick={testApi} disabled={loading}>
        {loading ? 'Testing...' : 'Test API'}
      </button>
      
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div style={{ marginTop: '10px' }}>
          <strong>Results:</strong>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiTest;