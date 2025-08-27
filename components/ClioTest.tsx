'use client';

import { useState } from 'react';

export default function ClioTest() {
  const [status, setStatus] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState('minimal');

  const scopeOptions = [
    { value: 'minimal', label: 'read:user_profile (current)' },
    { value: 'basic_users', label: 'read:users' },
    { value: 'profile_only', label: 'profile' },
    { value: 'user_info', label: 'user_info' },
    { value: 'openid', label: 'openid profile' },
    { value: 'empty', label: 'no scope' }
  ];

  const connect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clio/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'test-user-123' })
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Connect error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testScope = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clio/auth-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: 'test-user-123',
          scope_test: selectedScope
        })
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Scope test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clio/status?user_id=test-user-123');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Status error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">CLIO Integration Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={connect}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Connect to CLIO'}
        </button>

        <button
          onClick={checkStatus}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 ml-4"
        >
          Check Status
        </button>
        
        <div className="mt-4 p-4 border rounded">
          <h3 className="font-semibold mb-2">Scope Testing:</h3>
          <select 
            value={selectedScope} 
            onChange={(e) => setSelectedScope(e.target.value)}
            className="mb-2 p-2 border rounded"
          >
            {scopeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={testScope}
            disabled={loading}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 ml-2"
          >
            Test This Scope
          </button>
        </div>
      </div>

      {status && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Status:</h3>
          <pre className="text-sm overflow-auto whitespace-pre-wrap">
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p>URL params: {typeof window !== 'undefined' ? window.location.search : 'N/A'}</p>
      </div>
    </div>
  );
}
