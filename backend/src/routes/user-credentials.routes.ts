import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { saveCredentials, getCredentials } from '../controllers/user-credentials.controller';

const router = Router();

// All routes require authentication
router.post('/credentials', authenticate, saveCredentials);
router.get('/credentials', authenticate, getCredentials);

export default router;
