import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { pool } from './config/database';

// Import routes
import channelsRoutes from './routes/channels.routes';
import webhooksRoutes from './routes/webhooks.routes';
import authRoutes from './routes/auth.routes';
import userCredentialsRoutes from './routes/user-credentials.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// JSON parsing - simple approach
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Make io instance available to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/user', userCredentialsRoutes);

// Direct Gmail OAuth callback route (for compatibility with Google OAuth config)
app.get('/auth/gmail/callback', (req, res) => {
  // Redirect to the API route
  const { code, state, scope } = req.query;
  const redirectUrl = `/api/auth/gmail/callback?code=${code}&state=${state}&scope=${scope}`;
  res.redirect(redirectUrl);
});

// Direct Outlook OAuth callback route (for compatibility with Microsoft OAuth config)
app.get('/auth/outlook/callback', (req, res) => {
  // Redirect to the API route
  const queryString = new URLSearchParams(req.query as any).toString();
  const redirectUrl = `/api/auth/outlook/callback?${queryString}`;
  res.redirect(redirectUrl);
});

// Socket.io connection handling with JWT authentication
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Join user's room for real-time updates
  socket.on('join-user', (userId: string) => {
    // Verify the user ID matches the authenticated user from the token
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET;
        if (secret) {
          const decoded = jwt.verify(token, secret) as { userId: string; email: string };
          if (decoded.userId === userId) {
            socket.join(`user:${userId}`);
            console.log(`User ${userId} joined their room`);
          } else {
            console.log(`❌ User ID mismatch: ${userId} vs ${decoded.userId}`);
          }
        }
      } catch (error) {
        console.log(`❌ Invalid token for user: ${userId}`);
      }
    } else {
      // Fallback for development - allow any user ID
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room (no auth)`);
    }
  });

  // Join chat room for live messages
  socket.on('join-chat', (chatId: string) => {
    socket.join(`chat:${chatId}`);
    console.log(`Socket ${socket.id} joined chat ${chatId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Export io for use in controllers
export { io };

// Start server
async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io ready for connections`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💰 Pricing mode: ${process.env.PRICING_MODE || 'bundled'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

