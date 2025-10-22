import { api } from '../config/api';

export const outlookService = {
  // Initiate Outlook OAuth
  initiateAuth: async (): Promise<any> => {
    const response = await api.get('/auth/outlook');
    return response.data;
  },

  // Get Outlook accounts
  getAccounts: async (): Promise<any> => {
    const response = await api.get('/channels/outlook/accounts');
    return response.data;
  },

  // Get Outlook chats (conversations)
  getChats: async (accountId: string): Promise<any> => {
    const response = await api.get(`/channels/outlook/${accountId}/chats`);
    return response.data;
  },

  // Get messages from Outlook conversation
  getMessages: async (accountId: string, chatId: string): Promise<any> => {
    const response = await api.get(`/channels/outlook/${accountId}/chats/${chatId}/messages`);
    return response.data;
  },

  // Send Outlook message
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
    const response = await api.post(`/channels/outlook/${accountId}/chats/${chatId}/send`, messageData);
    return response.data;
  },

  // Mark Outlook messages as read
  markAsRead: async (accountId: string, messageIds: string[]): Promise<any> => {
    const response = await api.post(`/channels/outlook/${accountId}/mark-read`, { messageIds });
    return response.data;
  }
};
