import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { channelsService, Account } from '../services/channels.service';
import './ConnectionsPage.css';

const ConnectionsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [accountIdInput, setAccountIdInput] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await channelsService.getAccounts('whatsapp');
      setAccounts(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError('');
      // Auto-connect without requiring account ID input
      await channelsService.connectAccount('whatsapp', '');
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect account');
    } finally {
      setConnecting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return '#4caf50';
      case 'needs_action':
        return '#ff9800';
      case 'disconnected':
        return '#f44336';
      case 'stopped':
        return '#9e9e9e';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <div className="connections-page">
      <div className="header">
        <div className="header-content">
          <h1>WhatsApp Integration</h1>
          <div className="header-actions">
            <button onClick={() => navigate('/inbox')} className="btn-secondary">
              Go to Inbox
            </button>
            <button onClick={logout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="page-header">
          <h2>Connected Accounts</h2>
          <p>Manage your WhatsApp accounts</p>
        </div>

        {/* Connect New Account Section */}
        <div className="connect-section">
          <h3>Connect WhatsApp Account</h3>
          <div className="connect-form">
            <p className="connect-info">
              Click below to automatically connect your WhatsApp number (+919566651479)
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn-primary"
            >
              {connecting ? 'Connecting...' : 'Connect WhatsApp Account'}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>

        {/* Accounts List */}
        <div className="accounts-section">
          {loading ? (
            <div className="loading">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📱</div>
              <h3>No accounts connected</h3>
              <p>Connect your first WhatsApp account to get started</p>
            </div>
          ) : (
            <div className="accounts-list">
              {accounts.map((account) => (
                <div key={account.id} className="account-card">
                  <div className="account-info">
                    <div className="account-icon">💬</div>
                    <div className="account-details">
                      <h4>{account.external_account_id}</h4>
                      <div className="account-meta">
                        <span className="status-badge" style={{ color: getStatusColor(account.status) }}>
                          {account.status}
                        </span>
                        <span className="account-date">
                          Connected on {new Date(account.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/inbox')}
                    className="btn-view"
                  >
                    View Messages
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionsPage;

