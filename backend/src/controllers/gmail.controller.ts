import { Request, Response } from 'express';
import { google } from 'googleapis';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { emailSafetyService, EmailRequest } from '../services/emailSafety.service';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Initiate Gmail OAuth flow
 */
export async function initiateGmailAuth(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass user ID in state for callback
      prompt: 'consent' // Force consent screen to get refresh token
    });

    console.log(`🔐 Generated Gmail OAuth URL for user ${userId}`);
    res.json({ authUrl });
  } catch (error: any) {
    console.error('Gmail OAuth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate Gmail OAuth' });
  }
}

/**
 * Handle Gmail OAuth callback
 */
export async function handleGmailCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;
    const userId = state as string;

    if (!code || !userId) {
      return res.status(400).json({ error: 'Missing authorization code or user ID' });
    }

    console.log(`🔄 Processing Gmail OAuth callback for user ${userId}`);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    console.log('✅ Gmail OAuth tokens received:', {
      access_token: tokens.access_token ? 'present' : 'missing',
      refresh_token: tokens.refresh_token ? 'present' : 'missing',
      expiry_date: tokens.expiry_date
    });

    // Get user info from Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    const emailAddress = profile.data.emailAddress;
    console.log(`📧 Gmail account connected: ${emailAddress}`);

    // Store tokens in database (only update Gmail fields for existing user)
    await pool.query(
      `UPDATE user_credentials 
       SET gmail_access_token = $2,
           gmail_refresh_token = $3,
           gmail_token_expiry = $4,
           gmail_email = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId, tokens.access_token, tokens.refresh_token, tokens.expiry_date, emailAddress]
    );

    // Create Gmail account entry
    await pool.query(
      `INSERT INTO channels_account (user_id, provider, external_account_id, status, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, provider, external_account_id) 
       DO UPDATE SET status = EXCLUDED.status, metadata = EXCLUDED.metadata`,
      [
        userId, 
        'email', 
        emailAddress, 
        'connected',
        JSON.stringify({ email: emailAddress, type: 'GMAIL' })
      ]
    );

    console.log(`✅ Gmail account ${emailAddress} connected for user ${userId}`);

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/connections?gmail=connected`);
  } catch (error: any) {
    console.error('Gmail OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/connections?gmail=error`);
  }
}

/**
 * Get Gmail accounts for user
 */
export async function getGmailAccounts(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT ca.*, uc.gmail_email, uc.gmail_token_expiry
       FROM channels_account ca
       LEFT JOIN user_credentials uc ON ca.user_id = uc.user_id
       WHERE ca.user_id = $1 AND ca.provider = 'email'`,
      [userId]
    );

    const accounts = result.rows.map(account => ({
      id: account.id,
      external_account_id: account.external_account_id,
      provider: account.provider,
      status: account.status,
      email: account.gmail_email,
      connected_at: account.created_at,
      metadata: account.metadata
    }));

    console.log(`📧 Found ${accounts.length} Gmail accounts for user ${userId}`);
    res.json(accounts);
  } catch (error: any) {
    console.error('Get Gmail accounts error:', error);
    res.status(500).json({ error: 'Failed to get Gmail accounts' });
  }
}

/**
 * Get Gmail chats (email threads)
 */
export async function getGmailChats(req: AuthRequest, res: Response) {
  try {
    const { accountId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's Gmail credentials
    const credentialsResult = await pool.query(
      'SELECT gmail_access_token, gmail_refresh_token, gmail_token_expiry FROM user_credentials WHERE user_id = $1',
      [userId]
    );

    if (credentialsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Gmail credentials not found' });
    }

    const credentials = credentialsResult.rows[0];
    
    // Set up OAuth client with stored tokens
    oauth2Client.setCredentials({
      access_token: credentials.gmail_access_token,
      refresh_token: credentials.gmail_refresh_token,
      expiry_date: credentials.gmail_token_expiry
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get email threads
    const threadsResponse = await gmail.users.threads.list({
      userId: 'me',
      maxResults: 50
    });

    const threads = threadsResponse.data.threads || [];
    console.log(`📧 Found ${threads.length} Gmail threads`);

    // Get detailed thread information
    const chatPromises = threads.map(async (thread: any) => {
      const threadDetails = await gmail.users.threads.get({
        userId: 'me',
        id: thread.id
      });

      const messages = threadDetails.data.messages || [];
      const latestMessage = messages[messages.length - 1];
      
      if (!latestMessage) return null;

      const headers = latestMessage.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
      const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
      const snippet = latestMessage.snippet || '';

      return {
        id: thread.id,
        account_id: accountId,
        provider_chat_id: thread.id,
        title: subject,
        last_message_at: new Date(date).toISOString(),
        metadata: {
          subject,
          from,
          thread_id: thread.id,
          message_count: messages.length,
          snippet
        }
      };
    });

    const chats = (await Promise.all(chatPromises)).filter(chat => chat !== null);
    
    // Store chats in database (align with channels_chat schema)
    for (const chat of chats) {
      await pool.query(
        `INSERT INTO channels_chat (account_id, provider_chat_id, title, last_message_at, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (account_id, provider_chat_id) 
         DO UPDATE SET 
           title = EXCLUDED.title,
           last_message_at = EXCLUDED.last_message_at,
           metadata = EXCLUDED.metadata`,
        [
          accountId,
          chat.provider_chat_id,
          chat.title,
          chat.last_message_at,
          JSON.stringify(chat.metadata)
        ]
      );
    }

    console.log(`📧 Stored ${chats.length} Gmail chats in database`);
    res.json(chats);
  } catch (error: any) {
    console.error('Get Gmail chats error:', error);
    res.status(500).json({ error: 'Failed to get Gmail chats' });
  }
}

/**
 * Get messages from Gmail thread
 */
export async function getGmailMessages(req: AuthRequest, res: Response) {
  try {
    const { accountId, chatId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's Gmail credentials
    const credentialsResult = await pool.query(
      'SELECT gmail_access_token, gmail_refresh_token, gmail_token_expiry FROM user_credentials WHERE user_id = $1',
      [userId]
    );

    if (credentialsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Gmail credentials not found' });
    }

    const credentials = credentialsResult.rows[0];
    
    // Set up OAuth client with stored tokens
    oauth2Client.setCredentials({
      access_token: credentials.gmail_access_token,
      refresh_token: credentials.gmail_refresh_token,
      expiry_date: credentials.gmail_token_expiry
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Resolve numeric chat row id from provider_chat_id
    const chatRow = await pool.query(
      `SELECT id FROM channels_chat WHERE account_id = $1 AND provider_chat_id = $2`,
      [accountId, chatId]
    );
    const numericChatId: number | null = chatRow.rows[0]?.id ?? null;

    // Get thread details from Gmail using provider chat id
    const threadResponse = await gmail.users.threads.get({
      userId: 'me',
      id: chatId
    });

    const messages = threadResponse.data.messages || [];
    console.log(`📧 Found ${messages.length} messages in thread ${chatId}`);

    // Process each message
    // Helper to recursively extract text/plain or text/html parts
    const extractBody = (payload: any): { body: string; isHtml: boolean } => {
      if (!payload) return { body: '', isHtml: false };
      
      // Try direct body first
      const data = payload.body?.data;
      if (data) {
        const decoded = Buffer.from(data, 'base64').toString();
        return { body: decoded, isHtml: payload.mimeType === 'text/html' };
      }
      
      // Traverse parts
      if (payload.parts && payload.parts.length) {
        // Prefer text/plain
        const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          const decoded = Buffer.from(textPart.body.data, 'base64').toString();
          return { body: decoded, isHtml: false };
        }
        // Fallback to text/html
        const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
        if (htmlPart?.body?.data) {
          const decoded = Buffer.from(htmlPart.body.data, 'base64').toString();
          return { body: decoded, isHtml: true };
        }
        // Recurse into nested parts
        for (const part of payload.parts) {
          const res = extractBody(part);
          if (res.body) return res;
        }
      }
      return { body: '', isHtml: false };
    };

    // Helper to clean email body content
    const cleanEmailBody = (body: string): string => {
      if (!body) return '';
      
      // Remove MIME headers and boundaries more aggressively
      let cleaned = body
        .replace(/MIME-Version:.*?\r?\n/g, '')
        .replace(/Content-Type:.*?\r?\n/g, '')
        .replace(/Content-Transfer-Encoding:.*?\r?\n/g, '')
        .replace(/Content-Disposition:.*?\r?\n/g, '')
        .replace(/--boundary[^-\r\n]*/g, '')
        .replace(/--boundary[^-\r\n]*--/g, '')
        .replace(/^\s*--[^-\r\n]*.*$/gm, '') // Remove boundary lines
        .replace(/^\s*Content-Type:.*$/gm, '') // Remove content-type lines
        .replace(/^\s*MIME-Version:.*$/gm, '') // Remove MIME version lines
        .replace(/^\s*Content-Transfer-Encoding:.*$/gm, '') // Remove encoding lines
        .replace(/^\s*Content-Disposition:.*$/gm, '') // Remove disposition lines
        .replace(/^[A-Za-z0-9+/=]{50,}$/gm, '') // Remove long base64 strings
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove multiple empty lines
        .trim();
      
      // If the cleaned content is empty or just whitespace, return original
      if (!cleaned || cleaned.length < 3) {
        return body.trim();
      }
      
      return cleaned;
    };

    const messagePromises = messages.map(async (message: any) => {
      const messageDetails = await gmail.users.messages.get({
        userId: 'me',
        id: message.id
      });

      const headers = messageDetails.data.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
      
      // Extract message body (handles multipart/alternative and nested parts)
      const bodyExtract = extractBody(messageDetails.data.payload);
      const body = cleanEmailBody(bodyExtract.body);

      // Determine direction (simplified - in real implementation, compare with user's email)
      const userEmail = credentials.gmail_email || '';
      const direction = from.includes(userEmail) ? 'out' : 'in';

      return {
        id: message.id,
        chat_id: numericChatId ?? chatId,
        provider_msg_id: message.id,
        direction,
        body: body || subject,
        sent_at: new Date(date).toISOString(),
        metadata: {
          subject,
          from,
          to,
          message_id: message.id,
          thread_id: chatId
        }
      };
    });

    const processedMessages = await Promise.all(messagePromises);
    
    // Store messages in database (align with channels_message schema)
    for (const message of processedMessages) {
      await pool.query(
        `INSERT INTO channels_message (chat_id, provider_msg_id, direction, body, sent_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (chat_id, provider_msg_id) 
         DO UPDATE SET 
           direction = EXCLUDED.direction,
           body = EXCLUDED.body,
           sent_at = EXCLUDED.sent_at`,
        [
          numericChatId ?? null,
          message.provider_msg_id,
          message.direction,
          message.body,
          message.sent_at
        ]
      );
    }

    console.log(`📧 Stored ${processedMessages.length} Gmail messages in database`);
    res.json(processedMessages);
  } catch (error: any) {
    console.error('Get Gmail messages error:', error);
    res.status(500).json({ error: 'Failed to get Gmail messages' });
  }
}

/**
 * Send Gmail message
 */
export async function sendGmailMessage(req: AuthRequest, res: Response) {
  try {
    const { accountId, chatId } = req.params;
    const { body, subject, to, cc, bcc, attachments } = req.body;
    const userId = req.user?.id;

    console.log('📧 Sending Gmail message with attachments:', {
      body: body?.substring(0, 50) + '...',
      bodyLength: body?.length || 0,
      subject,
      to,
      attachmentsCount: attachments?.length || 0,
      attachments: attachments?.map((att: any) => ({ name: att.name, type: att.type, dataLength: att.data?.length }))
    });

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's Gmail credentials
    const credentialsResult = await pool.query(
      'SELECT gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email FROM user_credentials WHERE user_id = $1',
      [userId]
    );

    if (credentialsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Gmail credentials not found' });
    }

    const credentials = credentialsResult.rows[0];
    
    // Set up OAuth client with stored tokens
    oauth2Client.setCredentials({
      access_token: credentials.gmail_access_token,
      refresh_token: credentials.gmail_refresh_token,
      expiry_date: credentials.gmail_token_expiry
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build email message with attachments support
    const toField = to || '';
    const ccField = cc ? `Cc: ${cc}\r\n` : '';
    const bccField = bcc ? `Bcc: ${bcc}\r\n` : '';
    
    let emailMessage = '';
    
    if (attachments && attachments.length > 0) {
      console.log('📎 Processing attachments:', attachments.length);
      
      // Create multipart/mixed message with attachments
      const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('📎 Using boundary:', boundary);
      
      const headers = [
        `To: ${toField}`,
        ccField,
        bccField,
        `Subject: ${subject || 'No Subject'}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ''
      ].filter(Boolean).join('\r\n');
      
      // Add text body part - ensure message text is included
      const messageText = body && body.trim() ? body.trim() : 'No message content';
      console.log('📧 Message text being included:', messageText);
      
      const textPart = [
        `--${boundary}`,
        `Content-Type: text/plain; charset=UTF-8`,
        `Content-Transfer-Encoding: 7bit`,
        '',
        messageText,
        ''
      ].join('\r\n');
      
      // Add attachment parts
      const attachmentParts = attachments.map((attachment: any, index: number) => {
        console.log(`📎 Processing attachment ${index + 1}:`, {
          name: attachment.name,
          type: attachment.type,
          dataLength: attachment.data?.length
        });
        
        const attachmentData = Buffer.from(attachment.data, 'base64');
        const encodedAttachment = attachmentData.toString('base64');
        
        console.log(`📎 Attachment ${index + 1} encoded length:`, encodedAttachment.length);
        
        return [
          `--${boundary}`,
          `Content-Type: ${attachment.type || 'application/octet-stream'}`,
          `Content-Disposition: attachment; filename="${attachment.name}"`,
          `Content-Transfer-Encoding: base64`,
          '',
          encodedAttachment,
          ''
        ].join('\r\n');
      });
      
      emailMessage = [
        headers,
        textPart,
        ...attachmentParts,
        `--${boundary}--`
      ].join('\r\n');
    } else {
      // Simple text message without attachments
      emailMessage = [
        `To: ${toField}`,
        ccField,
        bccField,
        `Subject: ${subject || 'No Subject'}`,
        '',
        body
      ].join('\r\n');
    }

    // Encode message
    console.log('📧 Final email message length:', emailMessage.length);
    console.log('📧 Email message preview (first 500 chars):', emailMessage.substring(0, 500));
    const encodedMessage = Buffer.from(emailMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    console.log('📧 Encoded message length:', encodedMessage.length);

    // Send email
    const sendResponse = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: chatId // Reply to existing thread if chatId provided
      }
    });

    console.log(`📧 Gmail message sent: ${sendResponse.data.id}`);

    // Store sent message in database
    const messageId = sendResponse.data.id;
    // Resolve numeric chat id for storage
    const chatRow = await pool.query(
      `SELECT id FROM channels_chat WHERE account_id = $1 AND provider_chat_id = $2`,
      [accountId, chatId]
    );
    const numericChatId: number | null = chatRow.rows[0]?.id ?? null;

    const messageBody = body && body.trim() ? body.trim() : 'No message content';
    console.log('📧 Storing message in database with body:', messageBody);
    
    await pool.query(
      `INSERT INTO channels_message (chat_id, provider_msg_id, direction, body, sent_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        numericChatId ?? null,
        messageId,
        'out',
        messageBody, // Store the actual message content
        new Date().toISOString()
      ]
    );

    res.json({
      success: true,
      messageId,
      message: 'Email sent successfully'
    });
  } catch (error: any) {
    console.error('Send Gmail message error:', error);
    res.status(500).json({ error: 'Failed to send Gmail message' });
  }
}

/**
 * Mark Gmail messages as read
 */
export async function markGmailAsRead(req: AuthRequest, res: Response) {
  try {
    const { accountId } = req.params;
    const { messageIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's Gmail credentials
    const credentialsResult = await pool.query(
      'SELECT gmail_access_token, gmail_refresh_token, gmail_token_expiry FROM user_credentials WHERE user_id = $1',
      [userId]
    );

    if (credentialsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Gmail credentials not found' });
    }

    const credentials = credentialsResult.rows[0];
    
    // Set up OAuth client with stored tokens
    oauth2Client.setCredentials({
      access_token: credentials.gmail_access_token,
      refresh_token: credentials.gmail_refresh_token,
      expiry_date: credentials.gmail_token_expiry
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Mark messages as read (remove UNREAD label)
    for (const messageId of messageIds) {
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
    }

    console.log(`📧 Marked ${messageIds.length} Gmail messages as read`);
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error: any) {
    console.error('Mark Gmail as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
}
