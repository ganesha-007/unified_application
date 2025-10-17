# Quick Start Guide

Get your WhatsApp integration up and running in 5 minutes!

## Prerequisites

- Node.js 16+ installed
- PostgreSQL installed and running
- Git

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Set Up Database

```bash
# Create database
createdb whatsapp_integration

# Run migrations
cd backend
npm run migrate
```

### 3. Configure Environment

**Backend** - Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_integration
DB_USER=postgres
DB_PASSWORD=postgres
UNIPILE_API_KEY=YeP3w6Bw.g6eDNNAgsrT2l5pvbLdWwQKujoaBFdiZ5DG3pfrk3v4=
UNIPILE_API_URL=https://api22.unipile.com:15284/api/v1
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=http://localhost:3000
PRICING_MODE=bundled
```

**Frontend** - Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:3001/api
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### 6. Login

Use any credentials for testing:
- Email: `user@example.com`
- User ID: `user_123`

### 7. Connect WhatsApp Account

1. Go to **Connections** page
2. Enter your UniPile WhatsApp Account ID
3. Click **Connect Account**

### 8. Start Messaging

1. Go to **Inbox** page
2. Select a conversation
3. Send messages!

## Setting Up Webhooks (Important!)

To receive incoming messages in real-time:

### Option 1: Using ngrok (Local Development)

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Expose your backend
ngrok http 3001
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

### Option 2: Deploy to Production

Deploy your backend to a cloud provider (Heroku, AWS, etc.) and get a public URL.

### Configure in UniPile

1. Go to UniPile Dashboard → Settings → Webhooks
2. Add webhook:
   - **Event**: `message.new`
   - **URL**: `https://your-url.com/api/webhooks/unipile/messages`
3. Add another webhook:
   - **Event**: `account.update`
   - **URL**: `https://your-url.com/api/webhooks/unipile/account-status`

## Test the Integration

1. Send a WhatsApp message to your connected number
2. It should appear in the inbox within seconds!

## Common Issues

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL
brew services restart postgresql  # macOS
```

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### CORS Errors
Make sure `CORS_ORIGIN` in backend `.env` is set to `http://localhost:3000`

## Next Steps

- ✅ Test sending and receiving messages
- ✅ Set up webhooks for real-time updates
- ✅ Customize the UI to match your brand
- 📱 Add Instagram integration (next milestone)
- 📧 Add Email integration (next milestone)

## Need Help?

Check the main [README.md](./README.md) for detailed documentation.

---

**Happy coding! 🚀**

