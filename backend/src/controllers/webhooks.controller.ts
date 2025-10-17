import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { Server as SocketIOServer } from 'socket.io';

/**
 * Handle incoming messages from UniPile webhook
 */
export async function handleUniPileMessage(req: any, res: Response) {
  try {
    // Log the raw body for debugging
    console.log('📥 Webhook received - Raw body length:', req.body ? Object.keys(req.body).length : 'no body');
    
    // Check if body is valid
    if (!req.body || typeof req.body !== 'object') {
      console.warn('⚠️ Invalid webhook body received');
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    console.log('📥 Webhook received:', JSON.stringify(req.body, null, 2));
    
    // Handle webhook verification (if UniPile sends a challenge)
    if (req.body.challenge) {
      console.log('🔐 Webhook verification challenge received');
      return res.json({ challenge: req.body.challenge });
    }
    
    const { event, data } = req.body;

    // Handle multiple possible UniPile webhook formats
    if (event === 'message.new' || event === 'message_received' || req.body.message_id || req.body.account_id) {
      let account_id, chat_id, message;
      
      // UniPile webhook format - check for direct properties first
      if (req.body.account_id && (req.body.message_id || req.body.text)) {
        account_id = req.body.account_id;
        chat_id = req.body.chat_id || req.body.provider_chat_id;
        message = {
          id: req.body.message_id || req.body.id,
          body: req.body.text || req.body.message || req.body.body,
          text: req.body.text || req.body.message || req.body.body,
          from: {
            name: req.body.sender?.attendee_name || req.body.from?.name || req.body.sender_name || 'Unknown',
            phone: req.body.sender?.attendee_provider_id || req.body.from?.phone || req.body.sender_id || ''
          },
          timestamp: req.body.timestamp || req.body.created_at || new Date().toISOString(),
          attachments: req.body.attachments || []
        };
      } else if (data && data.account_id) {
        // Nested data format
        account_id = data.account_id;
        chat_id = data.chat_id;
        message = data.message;
      } else {
        console.warn('Unknown webhook format:', req.body);
        return res.status(200).json({ received: true });
      }
      

      // Find the account in our database, create if not exists
      let accountResult = await pool.query(
        'SELECT id FROM channels_account WHERE external_account_id = $1',
        [account_id]
      );

      if (accountResult.rows.length === 0) {
        console.log(`📝 Account ${account_id} not found, creating it automatically...`);
        
        // Create the account with a default user (you may want to modify this logic)
        const defaultUserId = 'user_123'; // This should be dynamic in production
        
        const newAccount = await pool.query(
          `INSERT INTO channels_account (user_id, provider, external_account_id, status)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [defaultUserId, 'whatsapp', account_id, 'connected']
        );
        
        accountResult = newAccount;
        console.log(`✅ Created account ${account_id} for user ${defaultUserId}`);
      }

      const dbAccountId = accountResult.rows[0].id;

      // Find or create chat using the actual provider_chat_id from webhook
      const actualProviderChatId = req.body.provider_chat_id || chat_id;
      let chatResult = await pool.query(
        'SELECT id FROM channels_chat WHERE account_id = $1 AND provider_chat_id = $2',
        [dbAccountId, actualProviderChatId]
      );

      let dbChatId: number;
      
      if (chatResult.rows.length === 0) {
        // Create chat metadata with UniPile chat ID
        const chatMetadata = {
          id: chat_id, // Store the UniPile chat ID
          provider_chat_id: actualProviderChatId,
          created_from_webhook: true
        };
        
        const newChat = await pool.query(
          `INSERT INTO channels_chat (account_id, provider_chat_id, title, last_message_at, metadata)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [dbAccountId, actualProviderChatId, message.from?.name || 'Unknown', new Date(message.timestamp), JSON.stringify(chatMetadata)]
        );
        dbChatId = newChat.rows[0].id;
      } else {
        dbChatId = chatResult.rows[0].id;
      }

      // Store the message
      await pool.query(
        `INSERT INTO channels_message (chat_id, provider_msg_id, direction, body, attachments, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (chat_id, provider_msg_id) DO NOTHING`,
        [
          dbChatId,
          message.id,
          'in',
          message.body || message.text,
          JSON.stringify(message.attachments || []),
          new Date(message.timestamp)
        ]
      );

      // Update chat's last_message_at
      await pool.query(
        'UPDATE channels_chat SET last_message_at = $1 WHERE id = $2',
        [new Date(message.timestamp), dbChatId]
      );

      // Update usage
      const userId = await getUserIdFromAccount(dbAccountId);
      if (userId) {
        await updateUsage(userId, 'whatsapp', 'received');
      }

      console.log(`✅ Stored incoming message: ${message.id}`);
      
      // Emit real-time notification to frontend
      const io = req.app.get('io');
      if (io) {
        // Get user ID from account
        const userId = await getUserIdFromAccount(dbAccountId);
        if (userId) {
          const messageData = {
            id: message.id,
            body: message.body || message.text,
            direction: 'in',
            sent_at: message.timestamp,
            from: message.from,
            chat_id: dbChatId,
            provider_chat_id: actualProviderChatId
          };
          
          // Emit to both user room and specific chat room for immediate updates
          io.to(`user:${userId}`).emit('new_message', {
            chatId: actualProviderChatId, // Use provider chat ID for frontend matching
            message: messageData
          });
          
          // Also emit to specific chat room if anyone is viewing that chat
          io.to(`chat:${actualProviderChatId}`).emit('new_message', {
            chatId: actualProviderChatId,
            message: messageData
          });
          
          console.log(`📡 Emitted new_message event to user:${userId} and chat:${actualProviderChatId}`);
        }
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook message error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
}

/**
 * Handle account status updates from UniPile webhook
 */
export async function handleUniPileAccountStatus(req: any, res: Response) {
  try {
    const { event, data } = req.body;

    if (event === 'account.update') {
      const { account_id, status } = data;

      // Update account status in database
      await pool.query(
        'UPDATE channels_account SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE external_account_id = $2',
        [status, account_id]
      );

      console.log(`✅ Updated account status: ${account_id} -> ${status}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook account status error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Helper function to get user ID from account ID
 */
async function getUserIdFromAccount(accountId: number): Promise<string | null> {
  const result = await pool.query(
    'SELECT user_id FROM channels_account WHERE id = $1',
    [accountId]
  );
  return result.rows.length > 0 ? result.rows[0].user_id : null;
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

