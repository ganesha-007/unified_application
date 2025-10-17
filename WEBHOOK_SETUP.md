# Webhook Setup Guide

This guide explains how to configure UniPile webhooks to receive real-time WhatsApp messages in your application.

## Why Webhooks?

Webhooks allow UniPile to push new messages and account updates to your application in real-time, eliminating the need for polling and providing instant message delivery.

## Prerequisites

- Your backend server must be publicly accessible
- For local development, use **ngrok** or similar tunneling service
- Your UniPile account must be active

## Step 1: Make Your Backend Publicly Accessible

### Option A: Using ngrok (Local Development)

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/
   ```

2. **Start your backend:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Expose your backend:**
   ```bash
   ngrok http 3001
   ```

4. **Copy your ngrok URL:**
   ```
   Forwarding: https://abc123def456.ngrok.io -> http://localhost:3001
   ```

### Option B: Deploy to Production

Deploy your backend to:
- **Heroku**: `heroku create your-app-name`
- **AWS**: Use Elastic Beanstalk or EC2
- **DigitalOcean**: Use App Platform
- **Railway**: `railway up`

Your production URL will be: `https://your-app.herokuapp.com`

## Step 2: Configure Webhooks in UniPile

### Access UniPile Dashboard

1. Go to https://dashboard.unipile.com
2. Log in with your credentials
3. Navigate to **Settings** → **Webhooks**

### Add Message Webhook

1. Click **Add Webhook** or **New Webhook**
2. Configure the webhook:
   ```
   Name: WhatsApp Messages
   Event: message.new
   URL: https://your-domain.com/api/webhooks/unipile/messages
   Method: POST
   ```

3. Click **Save** or **Create**

### Add Account Status Webhook

1. Click **Add Webhook** again
2. Configure the webhook:
   ```
   Name: Account Status Updates
   Event: account.update
   URL: https://your-domain.com/api/webhooks/unipile/account-status
   Method: POST
   ```

3. Click **Save** or **Create**

## Step 3: Test Your Webhooks

### Test Message Webhook

1. **Send a WhatsApp message** to your connected number from another device
2. **Check your backend logs** for the incoming webhook:
   ```
   ✅ Stored incoming message: msg_123456
   ```
3. **Refresh your inbox** - the message should appear

### Test Account Status Webhook

1. **Disconnect/reconnect** your WhatsApp account in UniPile
2. **Check your backend logs** for the status update:
   ```
   ✅ Updated account status: w0Qf7ufAQ66t5CdQdqXW8w -> disconnected
   ```

## Webhook Payload Examples

### Message Webhook Payload

```json
{
  "event": "message.new",
  "data": {
    "account_id": "w0Qf7ufAQ66t5CdQdqXW8w",
    "chat_id": "chat_123456",
    "message": {
      "id": "msg_789012",
      "from": {
        "name": "John Doe",
        "phone": "+1234567890"
      },
      "body": "Hello! This is a test message.",
      "timestamp": "2025-10-16T10:30:00Z",
      "attachments": []
    }
  }
}
```

### Account Status Webhook Payload

```json
{
  "event": "account.update",
  "data": {
    "account_id": "w0Qf7ufAQ66t5CdQdqXW8w",
    "status": "connected",
    "metadata": {
      "phone": "+1234567890",
      "name": "My WhatsApp"
    }
  }
}
```

## Webhook Security (Recommended)

### 1. Add HMAC Signature Verification

Update your webhook handler to verify the signature:

```typescript
// backend/src/controllers/webhooks.controller.ts
import crypto from 'crypto';

function verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const calculatedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

export async function handleUniPileMessage(req: any, res: Response) {
  // Verify signature
  const signature = req.headers['x-unipile-signature'];
  const secret = process.env.UNIPILE_WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
}
```

### 2. Add Webhook Secret to Environment

```env
UNIPILE_WEBHOOK_SECRET=your_webhook_secret_from_unipile
```

## Troubleshooting

### Webhook Not Receiving Messages

1. **Check webhook URL is correct:**
   - Must be publicly accessible
   - Must use HTTPS (for production)
   - Must include `/api/webhooks/unipile/messages`

2. **Check backend logs:**
   ```bash
   cd backend
   npm run dev
   # Watch for incoming webhook requests
   ```

3. **Test webhook with curl:**
   ```bash
   curl -X POST https://your-domain.com/api/webhooks/unipile/messages \
     -H "Content-Type: application/json" \
     -d '{
       "event": "message.new",
       "data": {
         "account_id": "test",
         "chat_id": "test",
         "message": {
           "id": "test",
           "body": "Test message"
         }
       }
     }'
   ```

4. **Check UniPile webhook logs:**
   - Go to UniPile Dashboard → Settings → Webhooks
   - Click on your webhook to see delivery history
   - Check for failed deliveries and error messages

### Webhook Returns 401/403

- Check your backend is running
- Verify the URL is correct
- Check CORS settings (webhooks should not require CORS)
- Verify no authentication middleware is blocking webhooks

### Messages Not Appearing in Inbox

1. **Check database:**
   ```sql
   SELECT * FROM channels_message ORDER BY created_at DESC LIMIT 10;
   ```

2. **Check account is connected:**
   ```sql
   SELECT * FROM channels_account WHERE status = 'connected';
   ```

3. **Check chat exists:**
   ```sql
   SELECT * FROM channels_chat;
   ```

## Webhook Best Practices

1. **Always return 200 OK** to acknowledge receipt
2. **Process webhooks asynchronously** to avoid timeouts
3. **Implement idempotency** to handle duplicate webhooks
4. **Log all webhook events** for debugging
5. **Use HTTPS** for production webhooks
6. **Verify signatures** to prevent spoofing
7. **Handle rate limits** gracefully

## Monitoring Webhooks

### Add Webhook Monitoring

```typescript
// Log webhook events
console.log(`📥 Webhook received: ${req.body.event} at ${new Date().toISOString()}`);

// Track webhook metrics
await db.query(
  'INSERT INTO webhook_logs (event, payload, created_at) VALUES ($1, $2, $3)',
  [req.body.event, JSON.stringify(req.body), new Date()]
);
```

### Create Webhook Logs Table

```sql
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  payload JSONB,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Next Steps

- ✅ Configure webhooks in UniPile
- ✅ Test with real WhatsApp messages
- ✅ Monitor webhook delivery
- ✅ Implement signature verification
- ✅ Set up webhook monitoring/logging

## Support

If you encounter issues:
1. Check UniPile documentation: https://docs.unipile.com
2. Review backend logs for errors
3. Test webhook URL with curl
4. Contact UniPile support if webhooks aren't being sent

---

**Your webhooks are now configured! 🎉**

Send a WhatsApp message and watch it appear in real-time in your inbox.

