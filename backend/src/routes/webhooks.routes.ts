import { Router } from 'express';
import {
  handleUniPileMessage,
  handleUniPileAccountStatus,
} from '../controllers/webhooks.controller';

const router = Router();

// UniPile webhooks (no auth required, but should verify signature in production)
router.post('/unipile/messages', handleUniPileMessage);
router.get('/unipile/messages', (req, res) => {
  console.log('🔐 Webhook verification GET request received');
  res.json({ status: 'webhook endpoint active' });
});
router.post('/unipile/account-status', handleUniPileAccountStatus);

export default router;

