import { Router } from 'express';
import { getUserUsage, getUserEntitlements } from '../controllers/usage.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Usage routes - AUTHENTICATION REQUIRED
router.get('/usage', authenticate, getUserUsage);
router.get('/entitlements', authenticate, getUserEntitlements);

export default router;
