'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface ClioStatus {
  isConnected: boolean;
  lastSync?: string;
  error?: string;
  accountInfo?: {
    name: string;
    email: string;
  };
}

export default function ClioConnectionStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ClioStatus>({ isConnected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/clio/status?userEmail=${encodeURIComponent(user.email || '')}`);
        const data = await response.json();
        setStatus(data);
      } catch (err) {
        console.error('Connection check failed:', err);
        setStatus({ 
          isConnected: false, 
          error: 'Failed to check connection status' 
        });
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, [user]);

  const checkClioConnection = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/clio/status?userEmail=${encodeURIComponent(user.email || '')}`);
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Connection check failed:', err);
      setStatus({
        isConnected: false,
        error: 'Failed to check connection status'
      });
    } finally {
      setLoading(false);
    }
  };

  const connectToClio = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/clio/connect', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail: user.email })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate connection');
      }
      
      const data = await response.json();
      
      if (data.authUrl) {
        console.log('🔗 Redirecting to CLIO for authorization...');
        // Open CLIO authorization in the same window
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (err) {
      console.error('Connection failed:', err);
      setStatus(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to initiate connection'
      }));
      setLoading(false);
    }
  };

  const disconnectFromClio = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/clio/disconnect', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail: user.email })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect');
      }
      
      const data = await response.json();
      console.log('✅ Disconnected from CLIO:', data.message);
      setStatus({ isConnected: false });
    } catch (err) {
      console.error('Disconnect failed:', err);
      setStatus(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to disconnect'
      }));
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      await checkClioConnection();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="text-gray-600">Checking connection status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${status.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <div>
            <h3 className="font-medium text-gray-900">
              CLIO Connection
            </h3>
            <p className="text-sm text-gray-600">
              {status.isConnected ? 'Connected and synchronized' : 'Not connected'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {status.isConnected && (
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-3 py-1 text-sm rounded-md font-medium transition-colors bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            >
              Test Connection
            </button>
          )}
          <button
            onClick={status.isConnected ? disconnectFromClio : connectToClio}
            disabled={loading}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              status.isConnected
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{status.isConnected ? 'Disconnecting...' : 'Connecting...'}</span>
              </div>
            ) : (
              status.isConnected ? 'Disconnect' : 'Connect to CLIO'
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {status.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700 font-medium">Error</span>
          </div>
          <p className="text-red-600 mt-1">{status.error}</p>
        </div>
      )}

      {/* Account Information */}
      {status.isConnected && status.accountInfo && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">Account Information</h4>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Name:</span> {status.accountInfo.name}</p>
            <p><span className="font-medium">Email:</span> {status.accountInfo.email}</p>
            {status.lastSync && (
              <p><span className="font-medium">Last Sync:</span> {new Date(status.lastSync).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}

      {/* Connection Instructions */}
      {!status.isConnected && !status.error && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Connect Your CLIO Account</h4>
          <p className="text-blue-700 text-sm mb-3">
            To get started, you&apos;ll need to connect your CLIO account. This will allow MDRXLaw to securely access your practice data.
          </p>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Secure OAuth2 authentication</li>
            <li>• Read-only access to your data</li>
            <li>• Real-time synchronization</li>
            <li>• Can be disconnected at any time</li>
          </ul>
        </div>
      )}
    </div>
  );
}
