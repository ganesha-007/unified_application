import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware to verify webhook signatures using HMAC-SHA256
 */
export const verifyWebhookSignature = (secret: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-signature'] as string;
      const timestamp = req.headers['x-timestamp'] as string;
      
      if (!signature || !timestamp) {
        console.warn('⚠️ Missing webhook signature or timestamp');
        return res.status(401).json({ error: 'Missing signature or timestamp' });
      }

      // Check timestamp to prevent replay attacks (within 5 minutes)
      const now = Date.now();
      const requestTime = parseInt(timestamp);
      const timeDiff = Math.abs(now - requestTime);
      
      if (timeDiff > 300000) { // 5 minutes
        console.warn('⚠️ Webhook timestamp too old:', timeDiff);
        return res.status(401).json({ error: 'Request too old' });
      }

      // Create the payload string
      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(timestamp + payload)
        .digest('hex');

      // Compare signatures using constant-time comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        console.warn('⚠️ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      console.log('✅ Webhook signature verified');
      next();
    } catch (error) {
      console.error('❌ Webhook verification error:', error);
      return res.status(401).json({ error: 'Verification failed' });
    }
  };
};

/**
 * Generate webhook signature for outgoing requests
 */
export const generateWebhookSignature = (payload: any, secret: string): { signature: string; timestamp: string } => {
  const timestamp = Date.now().toString();
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(timestamp + payloadString)
    .digest('hex');

  return { signature, timestamp };
};

/**
 * Middleware to verify UniPile webhook signatures
 */
export const verifyUniPileWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-unipile-signature'] as string;
    const timestamp = req.headers['x-unipile-timestamp'] as string;
    
    if (!signature || !timestamp) {
      console.warn('⚠️ Missing UniPile webhook signature or timestamp');
      return res.status(401).json({ error: 'Missing signature or timestamp' });
    }

    // Verify timestamp (within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const timeDiff = Math.abs(now - requestTime);
    
    if (timeDiff > 300000) {
      console.warn('⚠️ UniPile webhook timestamp too old:', timeDiff);
      return res.status(401).json({ error: 'Request too old' });
    }

    // Create the payload string
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.UNIPILE_WEBHOOK_SECRET || 'default-secret')
      .update(timestamp + payload)
      .digest('hex');

    // Compare signatures
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      console.warn('⚠️ Invalid UniPile webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ UniPile webhook signature verified');
    next();
  } catch (error) {
    console.error('❌ UniPile webhook verification error:', error);
    return res.status(401).json({ error: 'Verification failed' });
  }
};

/**
 * Middleware to verify Microsoft Graph webhook signatures
 */
export const verifyGraphWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-ms-signature'] as string;
    const timestamp = req.headers['x-ms-timestamp'] as string;
    
    if (!signature || !timestamp) {
      console.warn('⚠️ Missing Microsoft Graph webhook signature or timestamp');
      return res.status(401).json({ error: 'Missing signature or timestamp' });
    }

    // Verify timestamp (within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const timeDiff = Math.abs(now - requestTime);
    
    if (timeDiff > 300000) {
      console.warn('⚠️ Graph webhook timestamp too old:', timeDiff);
      return res.status(401).json({ error: 'Request too old' });
    }

    // Create the payload string
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.MICROSOFT_WEBHOOK_SECRET || 'default-secret')
      .update(timestamp + payload)
      .digest('hex');

    // Compare signatures
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      console.warn('⚠️ Invalid Microsoft Graph webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Microsoft Graph webhook signature verified');
    next();
  } catch (error) {
    console.error('❌ Microsoft Graph webhook verification error:', error);
    return res.status(401).json({ error: 'Verification failed' });
  }
};

/**
 * Middleware to verify Gmail webhook signatures
 */
export const verifyGmailWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-gmail-signature'] as string;
    const timestamp = req.headers['x-gmail-timestamp'] as string;
    
    if (!signature || !timestamp) {
      console.warn('⚠️ Missing Gmail webhook signature or timestamp');
      return res.status(401).json({ error: 'Missing signature or timestamp' });
    }

    // Verify timestamp (within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const timeDiff = Math.abs(now - requestTime);
    
    if (timeDiff > 300000) {
      console.warn('⚠️ Gmail webhook timestamp too old:', timeDiff);
      return res.status(401).json({ error: 'Request too old' });
    }

    // Create the payload string
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.GMAIL_WEBHOOK_SECRET || 'default-secret')
      .update(timestamp + payload)
      .digest('hex');

    // Compare signatures
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      console.warn('⚠️ Invalid Gmail webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Gmail webhook signature verified');
    next();
  } catch (error) {
    console.error('❌ Gmail webhook verification error:', error);
    return res.status(401).json({ error: 'Verification failed' });
  }
};
