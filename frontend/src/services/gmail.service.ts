import { api } from '../config/api';

export const gmailService = {
  // Initiate Gmail OAuth flow
  initiateAuth: async (): Promise<{ authUrl: string }> => {
    const response = await api.get('/auth/gmail');
    return response.data;
  },

  // Get Gmail accounts
  getAccounts: async (): Promise<any[]> => {
    const response = await api.get('/channels/email/accounts');
    return response.data;
  },

  // Get Gmail chats (email threads)
  getChats: async (accountId: string): Promise<any[]> => {
    const response = await api.get(`/channels/email/${accountId}/chats`);
    return response.data;
  },

  // Get Gmail messages from a thread
  getMessages: async (accountId: string, chatId: string): Promise<any[]> => {
    const response = await api.get(`/channels/email/${accountId}/chats/${chatId}/messages`);
    return response.data;
  },

  // Send Gmail message
  sendMessage: async (
    accountId: string,
    chatId: string,
    messageData: {
      body: string;
      subject?: string;
      to?: string;
      cc?: string;
      bcc?: string;
      attachments?: Array<{
        name: string;
        type: string;
        data: string; // base64 encoded
      }>;
    }
  ): Promise<any> => {
    const response = await api.post(`/channels/email/${accountId}/chats/${chatId}/send`, messageData);
    return response.data;
  },

  // Mark Gmail messages as read
  markAsRead: async (accountId: string, messageIds: string[]): Promise<any> => {
    const response = await api.post(`/channels/email/${accountId}/mark-read`, { messageIds });
    return response.data;
  }
};


