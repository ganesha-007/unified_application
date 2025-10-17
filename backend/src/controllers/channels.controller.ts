import { Request, Response } from 'express';
import { unipileService } from '../services/unipile.service';
import { pool } from '../config/database';

/**
 * Get all connected accounts for a provider
 */
export async function getAccounts(req: Request, res: Response) {
  try {
    // Extract provider from the URL path
    const urlParts = req.originalUrl.split('/');
    const provider = urlParts[urlParts.indexOf('channels') + 1];
    const userId = 'user_123'; // Default user ID since no auth

    // Get accounts from database
    const result = await pool.query(
      'SELECT * FROM channels_account WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );

    // Enrich with UniPile data for WhatsApp/Instagram
    if (provider === 'whatsapp' || provider === 'instagram') {
      try {
        const unipileAccounts = await unipileService.getAccounts();
        const enrichedAccounts = result.rows.map((account: any) => {
          const unipileAccount = unipileAccounts.find(
            (ua: any) => ua.id === account.external_account_id
          );
          return {
            ...account,
            unipileData: unipileAccount,
          };
        });
        return res.json(enrichedAccounts);
      } catch (error) {
        // If UniPile fails, return DB data only
        return res.json(result.rows);
      }
    }

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
}

/**
 * Connect a new account (initiates hosted auth for WhatsApp/Instagram)
 */
export async function connectAccount(req: Request, res: Response) {
  try {
    // Extract provider from the URL path
    const urlParts = req.originalUrl.split('/');
    const provider = urlParts[urlParts.indexOf('channels') + 1];
    const userId = 'user_123'; // Default user ID since no auth

    if (provider === 'whatsapp' || provider === 'instagram') {
      try {
        // Get actual accounts from UniPile
        const unipileAccounts = await unipileService.getAccounts();
        console.log('📋 Available UniPile accounts:', JSON.stringify(unipileAccounts, null, 2));
        
        // Find the first WhatsApp account
        const whatsappAccount = unipileAccounts.find((account: any) => 
          account.type === 'WHATSAPP'
        );
        
        if (!whatsappAccount) {
          return res.status(404).json({ 
            error: 'No WhatsApp account found in UniPile',
            availableAccounts: unipileAccounts
          });
        }
        
        const accountId = whatsappAccount.id;
        console.log(`✅ Using WhatsApp account ID: ${accountId}`);
        
        // Store in database
        await pool.query(
          `INSERT INTO channels_account (user_id, provider, external_account_id, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, provider, external_account_id) 
           DO UPDATE SET status = $4, updated_at = CURRENT_TIMESTAMP`,
          [userId, provider, accountId, 'connected']
        );

        res.json({ 
          success: true, 
          message: `${provider} account connected successfully`,
          accountId,
          phoneNumber: whatsappAccount.connection_params?.im?.phone_number || whatsappAccount.name || 'Unknown',
          accountData: whatsappAccount
        });
      } catch (error: any) {
        console.error('Failed to get UniPile accounts:', error);
        res.status(500).json({ 
          error: 'Failed to connect to UniPile', 
          details: error.message 
        });
      }
    } else {
      res.status(400).json({ error: 'Unsupported provider' });
    }
  } catch (error: any) {
    console.error('Connect account error:', error);
    res.status(500).json({ error: 'Failed to connect account' });
  }
}

/**
 * Get chats for a specific account
 */
export async function getChats(req: Request, res: Response) {
  try {
    // Extract provider from the URL path
    const urlParts = req.originalUrl.split('/');
    const provider = urlParts[urlParts.indexOf('channels') + 1];
    const { accountId } = req.params;
    const userId = 'user_123'; // Default user ID since no auth

    // Verify account belongs to user
    const accountCheck = await pool.query(
      'SELECT id FROM channels_account WHERE user_id = $1 AND provider = $2 AND external_account_id = $3',
      [userId, provider, accountId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const dbAccountId = accountCheck.rows[0].id;

    // Get chats from database
    const dbChats = await pool.query(
      'SELECT * FROM channels_chat WHERE account_id = $1 ORDER BY last_message_at DESC',
      [dbAccountId]
    );

    // Fetch fresh data from UniPile
    if (provider === 'whatsapp' || provider === 'instagram') {
      try {
        const unipileChats = await unipileService.getChats(accountId);
        
        // Sync chats to database - deduplicate by provider_id (phone number)
        const uniqueChats = new Map();
        
        for (const chat of unipileChats) {
          const phoneNumber = chat.provider_id || chat.attendee_provider_id;
          
          // Skip if we already have this phone number and current chat is older
          if (uniqueChats.has(phoneNumber)) {
            const existingChat = uniqueChats.get(phoneNumber);
            const existingTime = new Date(existingChat.timestamp || 0).getTime();
            const currentTime = new Date(chat.timestamp || 0).getTime();
            
            if (currentTime <= existingTime) {
              continue; // Skip older chat
            }
          }
          
          uniqueChats.set(phoneNumber, chat);
        }
        
        // Insert unique chats
        for (const chat of uniqueChats.values()) {
          // Safely parse timestamp
          let lastMessageAt: Date;
          try {
            lastMessageAt = chat.timestamp ? new Date(chat.timestamp) : new Date();
            // Check if date is valid
            if (isNaN(lastMessageAt.getTime())) {
              lastMessageAt = new Date();
            }
          } catch (error) {
            console.warn(`Invalid timestamp for chat ${chat.id}:`, chat.timestamp);
            lastMessageAt = new Date();
          }
          
          // Use provider_id as the unique identifier instead of chat.id
          const providerChatId = chat.provider_id || chat.attendee_provider_id || chat.id;
          
          await pool.query(
            `INSERT INTO channels_chat (account_id, provider_chat_id, title, last_message_at, metadata)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (account_id, provider_chat_id) 
             DO UPDATE SET 
               title = CASE WHEN $3 != 'Unknown Chat' THEN $3 ELSE channels_chat.title END,
               last_message_at = $4, 
               metadata = $5, 
               updated_at = CURRENT_TIMESTAMP`,
            [dbAccountId, providerChatId, chat.name || 'Unknown Chat', lastMessageAt, JSON.stringify(chat)]
          );
        }
      } catch (error) {
        console.error('Failed to sync from UniPile:', error);
      }
    }

    // Return updated chats
    const updatedChats = await pool.query(
      'SELECT * FROM channels_chat WHERE account_id = $1 ORDER BY last_message_at DESC',
      [dbAccountId]
    );

    res.json(updatedChats.rows);
  } catch (error: any) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
}

/**
 * Get messages for a specific chat
 */
export async function getMessages(req: Request, res: Response) {
  try {
    // Extract provider from the URL path
    const urlParts = req.originalUrl.split('/');
    const provider = urlParts[urlParts.indexOf('channels') + 1];
    const { accountId, chatId } = req.params;
    const userId = 'user_123'; // Default user ID since no auth
    const { limit = 50, offset = 0 } = req.query;

    // Verify account belongs to user
    const accountCheck = await pool.query(
      'SELECT id FROM channels_account WHERE user_id = $1 AND provider = $2 AND external_account_id = $3',
      [userId, provider, accountId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const dbAccountId = accountCheck.rows[0].id;

    // Get chat from database
    const chatCheck = await pool.query(
      'SELECT id FROM channels_chat WHERE account_id = $1 AND provider_chat_id = $2',
      [dbAccountId, chatId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const dbChatId = chatCheck.rows[0].id;

    // Get messages from database
    const messages = await pool.query(
      `SELECT * FROM channels_message 
       WHERE chat_id = $1 
       ORDER BY sent_at DESC 
       LIMIT $2 OFFSET $3`,
      [dbChatId, limit, offset]
    );

    res.json(messages.rows);
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

/**
 * Send a message
 */
export async function sendMessage(req: Request, res: Response) {
  try {
    // Extract provider from the URL path
    const urlParts = req.originalUrl.split('/');
    const provider = urlParts[urlParts.indexOf('channels') + 1];
    const { accountId, chatId } = req.params;
    const userId = 'user_123'; // Default user ID since no auth
    const { body, attachments } = req.body;

    if (!body) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    // Verify account belongs to user
    const accountCheck = await pool.query(
      'SELECT id FROM channels_account WHERE user_id = $1 AND provider = $2 AND external_account_id = $3',
      [userId, provider, accountId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const dbAccountId = accountCheck.rows[0].id;

    // Get chat from database - chatId could be either provider_chat_id or the actual chat id
    let chatCheck = await pool.query(
      'SELECT id, provider_chat_id, metadata FROM channels_chat WHERE account_id = $1 AND provider_chat_id = $2',
      [dbAccountId, chatId]
    );

    // If not found by provider_chat_id, try by the actual UniPile chat ID stored in metadata
    if (chatCheck.rows.length === 0) {
      chatCheck = await pool.query(
        'SELECT id, provider_chat_id, metadata FROM channels_chat WHERE account_id = $1 AND metadata::json->>\'id\' = $2',
        [dbAccountId, chatId]
      );
    }

    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const dbChatId = chatCheck.rows[0].id;
    let chatMetadata: any = {};
    try {
      chatMetadata = typeof chatCheck.rows[0].metadata === 'string' 
        ? JSON.parse(chatCheck.rows[0].metadata || '{}')
        : chatCheck.rows[0].metadata || {};
    } catch (error) {
      console.warn('Failed to parse chat metadata:', error);
      chatMetadata = {};
    }
    const unipileChatId = chatMetadata.id || chatId; // Use UniPile chat ID from metadata

    // Send via UniPile
    if (provider === 'whatsapp' || provider === 'instagram') {
      try {
        console.log(`📤 Sending to UniPile chat ID: ${unipileChatId}`);
        const result = await unipileService.sendMessage(accountId, unipileChatId, {
          body,
          attachments: attachments || [],
        });

        // Store in database
        const messageId = result.id || result.message_id || `sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await pool.query(
          `INSERT INTO channels_message (chat_id, provider_msg_id, direction, body, attachments, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [dbChatId, messageId, 'out', body, JSON.stringify(attachments || []), new Date()]
        );

        // Update usage
        await updateUsage(userId, provider, 'sent');

        res.json({ success: true, messageId: messageId, real: true });
      } catch (error: any) {
        console.error('❌ UniPile send failed:', error.message);
        res.status(500).json({ error: 'Failed to send message', details: error.message });
      }
    } else {
      res.status(400).json({ error: 'Unsupported provider for sending' });
    }
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
}

/**
 * Mark messages as read
 */
export async function markAsRead(req: Request, res: Response) {
  try {
    const { provider, accountId, chatId } = req.params;
    const userId = 'user_123'; // Default user ID since no auth

    // Verify account belongs to user
    const accountCheck = await pool.query(
      'SELECT id FROM channels_account WHERE user_id = $1 AND provider = $2 AND external_account_id = $3',
      [userId, provider, accountId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Mark as read via UniPile
    if (provider === 'whatsapp' || provider === 'instagram') {
      await unipileService.markAsRead(accountId, chatId);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Unsupported provider' });
    }
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
}

/**
 * Debug endpoint to test UniPile API connectivity
 */
export async function debugUniPile(req: any, res: Response) {
  try {
    console.log('🔍 Testing UniPile API connectivity...');
    
    // Test getting accounts
    const accounts = await unipileService.getAccounts();
    console.log('📋 UniPile accounts response:', JSON.stringify(accounts, null, 2));
    
    res.json({
      success: true,
      accounts: accounts,
      accountCount: accounts.length,
      whatsappAccounts: accounts.filter((acc: any) => 
        acc.type === 'WHATSAPP'
      )
    });
  } catch (error: any) {
    console.error('❌ UniPile API test failed:', error);
    res.status(500).json({
      error: 'UniPile API test failed',
      details: error.message,
      response: error.response?.data,
      stack: error.stack
    });
  }
}

/**
 * Helper function to update usage statistics
 */
async function updateUsage(userId: string, provider: string, type: 'sent' | 'received') {
  const now = new Date();
  const period_ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const column = type === 'sent' ? 'messages_sent' : 'messages_rcvd';
  
  await pool.query(
    `INSERT INTO channels_usage (user_id, provider, period_ym, ${column})
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_id, provider, period_ym)
     DO UPDATE SET ${column} = channels_usage.${column} + 1, updated_at = CURRENT_TIMESTAMP`,
    [userId, provider, period_ym]
  );
}

