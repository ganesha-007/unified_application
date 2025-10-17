-- Create database schema for WhatsApp integration

-- Channels Account Table
CREATE TABLE IF NOT EXISTS channels_account (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('whatsapp', 'instagram', 'email')),
    external_account_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('connected', 'needs_action', 'disconnected', 'stopped')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider, external_account_id)
);

-- Channels Chat Table
CREATE TABLE IF NOT EXISTS channels_chat (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES channels_account(id) ON DELETE CASCADE,
    provider_chat_id TEXT NOT NULL,
    title TEXT,
    last_message_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, provider_chat_id)
);

-- Channels Message Table
CREATE TABLE IF NOT EXISTS channels_message (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES channels_chat(id) ON DELETE CASCADE,
    provider_msg_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    body TEXT,
    attachments JSONB DEFAULT '[]',
    sent_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, provider_msg_id)
);

-- Channels Entitlement Table
CREATE TABLE IF NOT EXISTS channels_entitlement (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('whatsapp', 'instagram', 'email')),
    is_active BOOLEAN DEFAULT true,
    source TEXT NOT NULL CHECK (source IN ('plan', 'addon')),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Channels Usage Table
CREATE TABLE IF NOT EXISTS channels_usage (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('whatsapp', 'instagram', 'email')),
    period_ym TEXT NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_rcvd INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider, period_ym)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_channels_account_user_id ON channels_account(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_account_provider ON channels_account(provider);
CREATE INDEX IF NOT EXISTS idx_channels_chat_account_id ON channels_chat(account_id);
CREATE INDEX IF NOT EXISTS idx_channels_message_chat_id ON channels_message(chat_id);
CREATE INDEX IF NOT EXISTS idx_channels_message_sent_at ON channels_message(sent_at);
CREATE INDEX IF NOT EXISTS idx_channels_entitlement_user_id ON channels_entitlement(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_usage_user_provider ON channels_usage(user_id, provider);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_channels_account_updated_at BEFORE UPDATE ON channels_account
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_chat_updated_at BEFORE UPDATE ON channels_chat
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_entitlement_updated_at BEFORE UPDATE ON channels_entitlement
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_usage_updated_at BEFORE UPDATE ON channels_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

