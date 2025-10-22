import { api } from '../config/api';

export interface Account {
  id: string;
  user_id: string;
  provider: string;
  external_account_id: string;
  status: string;
  metadata: any;
  created_at: string;
  connected_at?: string;
  display_name?: string;
  phone_number?: string;
  username?: string;
  is_connected?: boolean;
  unipileData?: any;
}

export interface Chat {
  id: number;
  account_id: number;
  provider_chat_id: string;
  title: string;
  last_message_at: string;
  metadata: any;
  created_at: string;
}

export interface Message {
  id: number;
  chat_id: number;
  provider_msg_id: string;
  direction: 'in' | 'out';
  body: string;
  attachments: any[];
  sent_at: string;
  created_at: string;
}

export const channelsService = {
  // Get all accounts for a provider
  getAccounts: async (provider: string): Promise<Account[]> => {
    const response = await api.get(`/channels/${provider}/accounts`);
    return response.data;
  },

  // Connect a new account
  connectAccount: async (provider: string, accountId: string): Promise<any> => {
    const response = await api.post(`/channels/${provider}/connect`, { accountId });
    return response.data;
  },

  // Get chats for an account
  getChats: async (provider: string, accountId: string): Promise<Chat[]> => {
    const response = await api.get(`/channels/${provider}/${accountId}/chats`);
    return response.data;
  },

  // Get messages for a chat
  getMessages: async (
    provider: string,
    accountId: string,
    chatId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> => {
    const response = await api.get(
      `/channels/${provider}/${accountId}/chats/${chatId}/messages`,
      { params: { limit, offset } }
    );
    return response.data;
  },

  // Send a message
  sendMessage: async (
    provider: string,
    accountId: string,
    chatId: string,
    body: string,
    attachments: any[] = [],
    emailData?: {
      subject?: string;
      to?: string;
      cc?: string;
      bcc?: string;
    }
  ): Promise<any> => {
    const payload: any = { body, attachments };
    if (emailData) {
      payload.subject = emailData.subject;
      payload.to = emailData.to;
      payload.cc = emailData.cc;
      payload.bcc = emailData.bcc;
    }
    
    const response = await api.post(
      `/channels/${provider}/${accountId}/chats/${chatId}/send`,
      payload
    );
    return response.data;
  },

  // Mark messages as read
  markAsRead: async (provider: string, accountId: string, chatId: string): Promise<any> => {
    const response = await api.post(`/channels/${provider}/${accountId}/mark-read`, { chatId });
    return response.data;
  },
};

