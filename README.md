# WhatsApp Integration Platform

A full-stack messaging integration platform that connects WhatsApp, Instagram, and Email channels through a unified interface. This project implements the first milestone: **WhatsApp Integration** using UniPile API.

## 🚀 Features

### Implemented (WhatsApp)
- ✅ Connect WhatsApp accounts via UniPile
- ✅ View all conversations in a unified inbox
- ✅ Send and receive messages in real-time
- ✅ Socket.io for live message updates
- ✅ PostgreSQL database for data persistence
- ✅ JWT authentication
- ✅ Entitlement system for plan-based access
- ✅ Webhook handlers for incoming messages
- ✅ Beautiful, modern React UI

### Coming Soon
- 📱 Instagram integration
- 📧 Email integration (Gmail + Outlook)
- 💳 Stripe billing integration
- 📊 Usage analytics and limits
- 🔐 Enhanced security features

## 🏗️ Architecture

```
┌─────────────────┐
│   React Frontend │
│   (TypeScript)   │
└────────┬─────────┘
         │
         │ REST API + Socket.io
         │
┌────────▼─────────┐
│  Node.js Backend │
│   (Express)      │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼─────┐
│PostgreSQL│ │UniPile│
│ Database │ │  API  │
└─────────┘ └───────┘
```

## 📋 Prerequisites

- **Node.js** v16+ and npm
- **PostgreSQL** v12+
- **UniPile API Key** (provided in project)
- **Git**

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd whatsapp-integration
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_integration
DB_USER=postgres
DB_PASSWORD=postgres

# UniPile Configuration
UNIPILE_API_KEY=YeP3w6Bw.g6eDNNAgsrT2l5pvbLdWwQKujoaBFdiZ5DG3pfrk3v4=
UNIPILE_API_URL=https://api22.unipile.com:15284/api/v1

# JWT Secret (generate a secure random string)
JWT_SECRET=your_jwt_secret_here_change_this

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Pricing Mode (bundled or addons)
PRICING_MODE=bundled
```

### 3. Database Setup

Create the PostgreSQL database:

```bash
createdb whatsapp_integration
```

Run migrations:

```bash
npm run migrate
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

## 🚀 Running the Application

### Start Backend

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3001`

### Start Frontend

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

## 📱 Usage Guide

### 1. Login

- Navigate to `http://localhost:3000`
- Use any email and user ID to login (test mode)
- Example: `user@example.com` / `user_123`

### 2. Connect WhatsApp Account

1. Go to **Connections** page
2. Enter your UniPile WhatsApp Account ID
   - You can find this in your UniPile dashboard
   - Example: `w0Qf7ufAQ66t5CdQdqXW8w`
3. Click **Connect Account**

### 3. Send and Receive Messages

1. Go to **Inbox** page
2. Select a conversation from the sidebar
3. Type your message and press **Enter** or click **Send**
4. Receive real-time updates for new messages

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/test-token` - Generate test JWT token

### Channels

- `GET /api/channels/whatsapp/accounts` - List connected accounts
- `POST /api/channels/whatsapp/connect` - Connect new account
- `GET /api/channels/whatsapp/:accountId/chats` - List chats
- `GET /api/channels/whatsapp/:accountId/chats/:chatId/messages` - Get messages
- `POST /api/channels/whatsapp/:accountId/chats/:chatId/send` - Send message
- `POST /api/channels/whatsapp/:accountId/mark-read` - Mark as read

### Webhooks

- `POST /api/webhooks/unipile/messages` - Handle incoming messages
- `POST /api/webhooks/unipile/account-status` - Handle account updates

## 🔗 Setting Up Webhooks

### Step 1: Get Your Webhook URL

Your webhook URL will be:
```
https://your-domain.com/api/webhooks/unipile/messages
```

For local development, use a service like **ngrok**:

```bash
ngrok http 3001
```

This will give you a public URL like:
```
https://abc123.ngrok.io/api/webhooks/unipile/messages
```

### Step 2: Configure in UniPile Dashboard

1. Log in to your UniPile dashboard
2. Go to **Settings** → **Webhooks**
3. Add a new webhook:
   - **Event**: `message.new`
   - **URL**: Your webhook URL from Step 1
4. Repeat for account status:
   - **Event**: `account.update`
   - **URL**: `https://your-domain.com/api/webhooks/unipile/account-status`

### Step 3: Test Webhook

Send a test message to your WhatsApp number, and it should appear in the inbox automatically!

## 📊 Database Schema

### Tables

- `channels_account` - Connected accounts
- `channels_chat` - Conversations/threads
- `channels_message` - Individual messages
- `channels_entitlement` - User access permissions
- `channels_usage` - Usage statistics

## 🔒 Security Features

- JWT-based authentication
- CORS protection
- SQL injection prevention (parameterized queries)
- Environment-based configuration
- Webhook signature verification (ready to implement)

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Manual Testing

1. **Connect Account**: Test connecting a WhatsApp account
2. **Send Message**: Send a message and verify it appears
3. **Receive Message**: Have someone send you a WhatsApp message
4. **Real-time Updates**: Open inbox in two tabs and verify sync

## 📝 Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_NAME` | Database name | whatsapp_integration |
| `UNIPILE_API_KEY` | UniPile API key | - |
| `JWT_SECRET` | JWT signing secret | - |
| `PRICING_MODE` | bundled or addons | bundled |

### Frontend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | http://localhost:3001/api |

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep whatsapp_integration
```

### Port Already in Use

```bash
# Find process using port 3001
lsof -ti:3001 | xargs kill -9
```

### CORS Errors

Make sure `CORS_ORIGIN` in backend `.env` matches your frontend URL.

## 📚 Tech Stack

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Socket.io** - Real-time communication
- **Axios** - HTTP client
- **JWT** - Authentication

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **React Router** - Routing
- **Socket.io Client** - Real-time updates
- **Axios** - API client

## 🎯 Next Steps

1. **Set up webhooks** in UniPile dashboard (see instructions above)
2. **Test the integration** by sending and receiving messages
3. **Customize the UI** to match your brand
4. **Add Instagram integration** (next milestone)
5. **Add Email integration** (Gmail + Outlook)
6. **Implement Stripe billing**

## 📄 License

This project is proprietary and confidential.

## 👥 Support

For issues or questions, contact the development team.

---

**Built with ❤️ using Node.js, React, and UniPile API**

