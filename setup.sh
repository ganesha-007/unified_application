#!/bin/bash

# WhatsApp Integration - Setup Script
# This script helps you set up the development environment

echo "🚀 WhatsApp Integration Setup"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "✅ PostgreSQL is installed"

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

echo "✅ PostgreSQL is running"
echo ""

# Backend Setup
echo "📦 Setting up backend..."
cd backend

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in backend directory"
    exit 1
fi

npm install

if [ ! -f ".env" ]; then
    echo "📝 Creating backend .env file..."
    cat > .env << EOF
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_integration
DB_USER=postgres
DB_PASSWORD=postgres
UNIPILE_API_KEY=YeP3w6Bw.g6eDNNAgsrT2l5pvbLdWwQKujoaBFdiZ5DG3pfrk3v4=
UNIPILE_API_URL=https://api22.unipile.com:15284/api/v1
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=http://localhost:3000
PRICING_MODE=bundled
EOF
    echo "✅ Backend .env created"
else
    echo "✅ Backend .env already exists"
fi

# Create database
echo "🗄️  Creating database..."
createdb whatsapp_integration 2>/dev/null || echo "Database already exists or error occurred"

# Run migrations
echo "🔄 Running database migrations..."
npm run migrate

cd ..

# Frontend Setup
echo ""
echo "📦 Setting up frontend..."
cd frontend

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in frontend directory"
    exit 1
fi

npm install

if [ ! -f ".env" ]; then
    echo "📝 Creating frontend .env file..."
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:3001/api
EOF
    echo "✅ Frontend .env created"
else
    echo "✅ Frontend .env already exists"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start backend:   cd backend && npm run dev"
echo "2. Start frontend:  cd frontend && npm start"
echo "3. Open browser:    http://localhost:3000"
echo ""
echo "For webhook setup, see WEBHOOK_SETUP.md"
echo ""
echo "Happy coding! 🎉"

