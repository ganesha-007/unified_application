import { Router } from 'express';
import {
  getAccounts,
  getAvailableAccounts,
  connectAccount,
  getChats,
  getMessages,
  sendMessage,
  markAsRead,
  debugUniPile,
  cleanupDuplicates,
  cleanupUnknownChats,
} from '../controllers/channels.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// WhatsApp routes - AUTHENTICATION REQUIRED
router.get('/whatsapp/accounts', authenticate, getAccounts);
router.get('/whatsapp/available', authenticate, getAvailableAccounts);
router.post('/whatsapp/connect', authenticate, connectAccount);
router.get('/whatsapp/:accountId/chats', authenticate, getChats);
router.get('/whatsapp/:accountId/chats/:chatId/messages', authenticate, getMessages);
router.post('/whatsapp/:accountId/chats/:chatId/send', authenticate, sendMessage);
router.post('/whatsapp/:accountId/mark-read', authenticate, markAsRead);
router.post('/whatsapp/:accountId/cleanup-duplicates', authenticate, cleanupDuplicates);
router.post('/whatsapp/:accountId/cleanup-unknown-chats', authenticate, cleanupUnknownChats);

// Instagram routes - AUTHENTICATION REQUIRED
router.get('/instagram/accounts', authenticate, getAccounts);
router.get('/instagram/available', authenticate, getAvailableAccounts);
router.post('/instagram/connect', authenticate, connectAccount);
router.get('/instagram/:accountId/chats', authenticate, getChats);
router.get('/instagram/:accountId/chats/:chatId/messages', authenticate, getMessages);
router.post('/instagram/:accountId/chats/:chatId/send', authenticate, sendMessage);
router.post('/instagram/:accountId/mark-read', authenticate, markAsRead);

// Debug route - NO AUTHENTICATION (for development)
router.get('/debug/unipile', debugUniPile);

export default router;

