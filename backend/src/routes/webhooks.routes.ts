import { Router } from 'express';
import {
  handleUniPileMessage,
  handleUniPileAccountStatus,
  checkDataConsistency,
} from '../controllers/webhooks.controller';
import { verifyUniPileWebhook, verifyGraphWebhook, verifyGmailWebhook } from '../middleware/webhookAuth';

const router = Router();

// UniPile webhooks with signature verification
router.post('/unipile/messages', verifyUniPileWebhook, handleUniPileMessage);
router.post('/unipile/account-status', verifyUniPileWebhook, handleUniPileAccountStatus);

// Microsoft Graph webhooks with signature verification
router.post('/graph/messages', verifyGraphWebhook, (req, res) => {
  console.log('📧 Microsoft Graph webhook received:', req.body);
  res.json({ received: true });
});

// Gmail webhooks with signature verification
router.post('/gmail/messages', verifyGmailWebhook, (req, res) => {
  console.log('📧 Gmail webhook received:', req.body);
  res.json({ received: true });
});

// Data consistency check (no auth required for internal use)
router.post('/consistency-check', checkDataConsistency);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'webhook endpoints active' });
});

export default router;

