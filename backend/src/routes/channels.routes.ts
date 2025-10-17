import { Router } from 'express';
import {
  getAccounts,
  connectAccount,
  getChats,
  getMessages,
  sendMessage,
  markAsRead,
  debugUniPile,
} from '../controllers/channels.controller';

const router = Router();

// WhatsApp routes - NO AUTHENTICATION REQUIRED
router.get('/whatsapp/accounts', getAccounts);
router.post('/whatsapp/connect', connectAccount);
router.get('/whatsapp/:accountId/chats', getChats);
router.get('/whatsapp/:accountId/chats/:chatId/messages', getMessages);
router.post('/whatsapp/:accountId/chats/:chatId/send', sendMessage);
router.post('/whatsapp/:accountId/mark-read', markAsRead);

// Instagram routes (for future use) - NO AUTHENTICATION REQUIRED
router.get('/instagram/accounts', getAccounts);
router.post('/instagram/connect', connectAccount);
router.get('/instagram/:accountId/chats', getChats);
router.get('/instagram/:accountId/chats/:chatId/messages', getMessages);
router.post('/instagram/:accountId/chats/:chatId/send', sendMessage);
router.post('/instagram/:accountId/mark-read', markAsRead);

export default router;

