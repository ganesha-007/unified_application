import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import './OnboardingPage.css';

interface OnboardingData {
  unipileApiKey: string;
  unipileApiUrl: string;
  whatsappPhoneNumber: string;
  webhookUrl: string;
  selectedWhatsAppAccount?: string;
  selectedInstagramAccount?: string;
}

interface UniPileAccount {
  id: string;
  type: string;
  name: string;
  phone_number?: string;
  username?: string;
  is_connected?: boolean;
  connected_by?: string;
  status?: string;
}

const OnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<OnboardingData>({
    unipileApiKey: '',
    unipileApiUrl: 'https://api22.unipile.com:15284/api/v1',
    whatsappPhoneNumber: '',
    webhookUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<UniPileAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchAvailableAccounts = async () => {
    if (!formData.unipileApiKey || !formData.unipileApiUrl) {
      return;
    }

    setLoadingAccounts(true);
    try {
      // First save credentials temporarily to fetch accounts
      await api.post('/user/credentials', {
        unipileApiKey: formData.unipileApiKey,
        unipileApiUrl: formData.unipileApiUrl,
        whatsappPhoneNumber: formData.whatsappPhoneNumber,
        webhookUrl: formData.webhookUrl
      });

      // Fetch available accounts
      const whatsappResponse = await api.get('/channels/whatsapp/available');
      const instagramResponse = await api.get('/channels/instagram/available');
      
      const allAccounts = [
        ...whatsappResponse.data.map((acc: any) => ({ ...acc, type: 'WHATSAPP' })),
        ...instagramResponse.data.map((acc: any) => ({ ...acc, type: 'INSTAGRAM' }))
      ];
      
      setAvailableAccounts(allAccounts);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      setError('Failed to fetch available accounts. Please check your UniPile credentials.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Save credentials
      const response = await api.post('/user/credentials', formData);
      
      if (response.data.success) {
        // Connect selected accounts
        if (formData.selectedWhatsAppAccount) {
          await api.post('/channels/whatsapp/connect', {
            accountId: formData.selectedWhatsAppAccount
          });
        }
        
        if (formData.selectedInstagramAccount) {
          await api.post('/channels/instagram/connect', {
            accountId: formData.selectedInstagramAccount
          });
        }
        
        setSuccess(true);
        // Redirect to connections page after a short delay
        setTimeout(() => {
          window.location.href = '/connections';
        }, 2000);
      }
    } catch (error: any) {
      console.error('Onboarding error:', error);
      setError(error.response?.data?.error || 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="onboarding-container">
        <div className="onboarding-success">
          <div className="success-icon">✅</div>
          <h2>Setup Complete!</h2>
          <p>Your UniPile credentials have been saved successfully.</p>
          <p>Redirecting to connections page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Welcome to Social Media Integration</h1>
          <p>Let's set up your UniPile API credentials to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="form-group">
            <label htmlFor="unipileApiKey">
              UniPile API Key *
            </label>
            <input
              type="password"
              id="unipileApiKey"
              name="unipileApiKey"
              value={formData.unipileApiKey}
              onChange={handleInputChange}
              required
              placeholder="Enter your UniPile API key"
            />
            <small>Get this from your UniPile dashboard</small>
          </div>

          <div className="form-group">
            <label htmlFor="unipileApiUrl">
              UniPile API URL
            </label>
            <input
              type="url"
              id="unipileApiUrl"
              name="unipileApiUrl"
              value={formData.unipileApiUrl}
              onChange={handleInputChange}
              placeholder="https://api22.unipile.com:15284/api/v1"
            />
            <small>Leave default unless you have a custom endpoint</small>
          </div>

          <div className="form-group">
            <label htmlFor="whatsappPhoneNumber">
              WhatsApp Phone Number
            </label>
            <input
              type="tel"
              id="whatsappPhoneNumber"
              name="whatsappPhoneNumber"
              value={formData.whatsappPhoneNumber}
              onChange={handleInputChange}
              placeholder="919566651479@s.whatsapp.net"
            />
            <small>Your WhatsApp number in international format (e.g., 919566651479@s.whatsapp.net)</small>
          </div>

          <div className="form-group">
            <label htmlFor="webhookUrl">
              Webhook URL
            </label>
            <input
              type="url"
              id="webhookUrl"
              name="webhookUrl"
              value={formData.webhookUrl}
              onChange={handleInputChange}
              placeholder="https://your-domain.com/api/webhooks/unipile"
            />
            <small>Your webhook URL for receiving messages (optional for now)</small>
          </div>

          {/* Account Selection Section */}
          <div className="form-group">
            <button 
              type="button" 
              onClick={fetchAvailableAccounts}
              disabled={!formData.unipileApiKey || !formData.unipileApiUrl || loadingAccounts}
              className="fetch-accounts-button"
            >
              {loadingAccounts ? 'Loading...' : 'Load Available Accounts'}
            </button>
            <small>Click to see which accounts are available to connect</small>
          </div>

          {availableAccounts.length > 0 && (
            <>
              <div className="form-group">
                <label htmlFor="selectedWhatsAppAccount">
                  Select WhatsApp Account (Optional)
                </label>
                <select
                  id="selectedWhatsAppAccount"
                  name="selectedWhatsAppAccount"
                  value={formData.selectedWhatsAppAccount || ''}
                  onChange={handleSelectChange}
                >
                  <option value="">-- Select WhatsApp Account --</option>
                  {availableAccounts
                    .filter(acc => acc.type === 'WHATSAPP')
                    .map(account => (
                      <option 
                        key={account.id} 
                        value={account.id}
                        disabled={account.is_connected}
                      >
                        {account.phone_number || account.name} ({account.id}) 
                        {account.is_connected ? ' - Already connected' : ' - Available'}
                      </option>
                    ))}
                </select>
                <small>Choose which WhatsApp account to connect</small>
              </div>

              <div className="form-group">
                <label htmlFor="selectedInstagramAccount">
                  Select Instagram Account (Optional)
                </label>
                <select
                  id="selectedInstagramAccount"
                  name="selectedInstagramAccount"
                  value={formData.selectedInstagramAccount || ''}
                  onChange={handleSelectChange}
                >
                  <option value="">-- Select Instagram Account --</option>
                  {availableAccounts
                    .filter(acc => acc.type === 'INSTAGRAM')
                    .map(account => (
                      <option 
                        key={account.id} 
                        value={account.id}
                        disabled={account.is_connected}
                      >
                        {account.username || account.name} ({account.id}) 
                        {account.is_connected ? ' - Already connected' : ' - Available'}
                      </option>
                    ))}
                </select>
                <small>Choose which Instagram account to connect</small>
              </div>
            </>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading || !formData.unipileApiKey}
          >
            {loading ? 'Saving...' : 'Save Credentials & Connect Accounts'}
          </button>
        </form>

        <div className="onboarding-info">
          <h3>What happens next?</h3>
          <ul>
            <li>✅ Your credentials will be securely stored</li>
            <li>✅ We'll connect to your UniPile account</li>
            <li>✅ You can then connect your WhatsApp & Instagram accounts</li>
            <li>✅ Start managing all your messages in one place!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
