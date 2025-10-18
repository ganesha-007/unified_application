import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { channelsService, Account, Chat, Message } from '../services/channels.service';
import './InboxPage.css';

const InboxPage: React.FC = () => {
  const { user, logout, socket } = useAuth();
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<{[chatId: string]: number}>({});
  const [selectedProvider, setSelectedProvider] = useState<'whatsapp' | 'instagram'>('whatsapp');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Define all functions first
  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      // Clear current selections when switching providers
      setSelectedAccount(null);
      setSelectedChat(null);
      setChats([]);
      setMessages([]);
      
      const data = await channelsService.getAccounts(selectedProvider);
      setAccounts(data);
      if (data.length > 0) {
        setSelectedAccount(data[0]);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProvider]);

  const loadChats = useCallback(async (accountId: string) => {
    try {
      const data = await channelsService.getChats(selectedProvider, accountId);
      setChats(data);
      if (data.length > 0 && !selectedChat) {
        setSelectedChat(data[0]);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }, [selectedChat, selectedProvider]);

  const calculateUnreadCounts = useCallback((currentMessages: Message[], currentChatProviderId: string) => {
    // Only update unread counts for the current chat being viewed
    // Don't reset existing unread counts for other chats
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      
      // Find the chat by provider_chat_id and clear its unread count
      if (currentChatProviderId) {
        const chat = chats.find(c => c.provider_chat_id === currentChatProviderId);
        if (chat) {
          delete newCounts[chat.id.toString()];
        }
      }
      
      return newCounts;
    });
  }, [chats]);

  const loadMessages = useCallback(async (accountId: string, chatId: string) => {
    try {
      const data = await channelsService.getMessages(selectedProvider, accountId, chatId);
      setMessages(data.reverse()); // Reverse to show oldest first
      
      // Clear unread count for the currently viewed chat
      calculateUnreadCounts(data, chatId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [calculateUnreadCounts]);

  const clearUnreadCount = useCallback((chatId: string) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[chatId];
      return newCounts;
    });
  }, []);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedAccount || !selectedChat) return;

    const messageText = messageInput.trim();
    setMessageInput('');
    setSending(true);

    try {
      await channelsService.sendMessage(
        selectedProvider,
        selectedAccount.id as string,
        selectedChat.provider_chat_id,
        messageText
      );

      // Reload messages to get the latest
      await loadMessages(
        selectedAccount.id as string,
        selectedChat.provider_chat_id
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessageInput(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleNewMessage = useCallback((data: any) => {
    // Update unread count for the chat that received the message
    if (data.chatId && data.message && data.message.direction === 'in') {
      // Find the chat ID from the provider_chat_id
      const chat = chats.find(c => c.provider_chat_id === data.chatId);
      if (chat) {
        setUnreadCounts(prev => ({
          ...prev,
          [chat.id.toString()]: (prev[chat.id.toString()] || 0) + 1
        }));
      }
    }
    
    // Reload messages if it's for the current chat
    if (selectedChat && selectedAccount) {
      loadMessages(
        selectedAccount.id as string,
        selectedChat.provider_chat_id
      );
    }
    // Reload chats to update last message time
    if (selectedAccount) {
      loadChats(selectedAccount.id as string);
    }
  }, [selectedChat, selectedAccount, loadMessages, loadChats, chats]);

  const handleMessageSent = useCallback((data: any) => {
    console.log('Message sent confirmation:', data);
    if (selectedChat && selectedAccount) {
      loadMessages(
        selectedAccount.id as string,
        selectedChat.provider_chat_id
      );
    }
  }, [selectedChat, selectedAccount, loadMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    const days = diff / (1000 * 60 * 60 * 24);

    if (hours < 1) {
      return 'now';
    } else if (hours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getChatAvatar = (chat: Chat) => {
    const name = chat.title || 'Unknown';
    return (
      <div className="chat-avatar">
        {getInitials(name)}
      </div>
    );
  };

  const filteredChats = chats.filter(chat => 
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // useEffects after all functions are defined
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Setup socket connection and join user room
  useEffect(() => {
    if (socket && user) {
      // Join user's socket room for real-time updates
      socket.emit('join-user', user.id);
      
      // Listen for new messages
      socket.on('new_message', handleNewMessage);
      socket.on('message:sent', handleMessageSent);
      
      // Rejoin room on reconnection
      socket.on('connect', () => {
        socket.emit('join-user', user.id);
      });
      
      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('message:sent', handleMessageSent);
        socket.off('connect');
      };
    }
  }, [socket, user, handleNewMessage, handleMessageSent]);

  useEffect(() => {
    if (selectedAccount) {
      loadChats(selectedAccount.id as string);
    }
  }, [selectedAccount, loadChats]);

  useEffect(() => {
    if (selectedChat && selectedAccount) {
      loadMessages(
        selectedAccount.id as string,
        selectedChat.provider_chat_id
      );
      
      // Join chat room for real-time updates
      if (socket) {
        socket.emit('join-chat', selectedChat.provider_chat_id);
      }
    }
  }, [selectedChat, selectedAccount, socket, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="inbox-loading-container">
        <div className="inbox-loading-content">
          <div className="inbox-loading-spinner"></div>
          <div className="inbox-loading-text">Loading...</div>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="whatsapp-app">
        <div className="empty-state">
          <div className="empty-icon">📱</div>
          <h2>No WhatsApp accounts connected</h2>
          <p>Connect your WhatsApp account to start messaging</p>
          <button onClick={() => navigate('/connections')} className="btn-connect">
            Connect WhatsApp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="whatsapp-app">
      {/* Left Sidebar - Chat List */}
      <div className="sidebar">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="header-top">
            <div className="profile-section">
              <div className="profile-avatar">
                {getInitials(user?.email || 'User')}
              </div>
              <div className="profile-info">
                <h3>WhatsApp</h3>
                <p>Web</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="icon-btn" title="Status">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                </svg>
              </button>
              <button className="icon-btn" title="New Chat">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </button>
              <button className="icon-btn" title="Menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Provider Tabs */}
          <div className="provider-tabs">
            <button
              className={`provider-tab ${selectedProvider === 'whatsapp' ? 'active' : ''}`}
              onClick={() => setSelectedProvider('whatsapp')}
            >
              📱 WhatsApp
            </button>
            <button
              className={`provider-tab ${selectedProvider === 'instagram' ? 'active' : ''}`}
              onClick={() => setSelectedProvider('instagram')}
            >
              📸 Instagram
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="search-container">
            <div className="search-box">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Navigation Icons */}
        <div className="nav-icons">
          <button className="nav-icon active" title="Chats">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            {Object.values(unreadCounts).reduce((sum, count) => sum + count, 0) > 0 && (
              <span className="unread-badge">
                {Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)}
              </span>
            )}
          </button>
          <button className="nav-icon" title="Status">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
          </button>
          <button className="nav-icon" title="Channels">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </button>
        </div>

        {/* Chat List */}
        <div className="chat-list">
          {filteredChats.length === 0 ? (
            <div className="empty-chats">
              {searchQuery ? 'No chats found' : 'No conversations yet'}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedChat(chat);
                  clearUnreadCount(chat.id.toString());
                }}
              >
                {getChatAvatar(chat)}
                <div className="chat-info">
                  <div className="chat-header">
                    <div className="chat-name">{chat.title || 'Unknown'}</div>
                    <div className="chat-time">
                      {chat.last_message_at
                        ? formatLastMessageTime(chat.last_message_at)
                        : ''}
                    </div>
                  </div>
                  <div className="chat-preview">
                    <span className="last-message">
                      {messages.find(m => m.chat_id === chat.id)?.body || 'No messages yet'}
                    </span>
                    <div className="chat-status">
                      {unreadCounts[chat.id.toString()] ? (
                        <span className="unread-badge">{unreadCounts[chat.id.toString()]}</span>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-chat">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                {getChatAvatar(selectedChat)}
                <div className="chat-details">
                  <h3>{selectedChat.title || 'Conversation'}</h3>
                  <p>Click here for contact info</p>
                </div>
              </div>
              <div className="chat-header-actions">
                <button className="icon-btn" title="Video call">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                </button>
                <button className="icon-btn" title="Voice call">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                </button>
                <button className="icon-btn" title="Search">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                </button>
                <button className="icon-btn" title="Menu">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-container">
              <div className="messages-list">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.direction === 'out' ? 'sent' : 'received'}`}
                  >
                    <div className="message-bubble">
                      <div className="message-text">{message.body}</div>
                      <div className="message-meta">
                        <span className="message-time">
                          {formatTime(message.sent_at)}
                        </span>
                        {message.direction === 'out' && (
                          <div className="message-status">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="message-input-container">
              <div className="message-input-wrapper">
                <button className="icon-btn attachment-btn" title="Attach">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                  </svg>
                </button>
                <div className="message-input-box">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message"
                    className="message-input"
                    disabled={sending}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !messageInput.trim()}
                  className="send-btn"
                  title="Send"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="whatsapp-logo">
              <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
            </div>
            <h2>WhatsApp Web</h2>
            <p>Send and receive messages without keeping your phone online.</p>
            <p>Use WhatsApp on up to 4 linked devices and 1 phone at the same time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;