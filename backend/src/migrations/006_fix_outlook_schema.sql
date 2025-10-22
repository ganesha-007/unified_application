-- Fix database schema for Outlook integration

-- 1. Update provider constraint to include 'outlook'
ALTER TABLE channels_account 
DROP CONSTRAINT IF EXISTS channels_account_provider_check;

ALTER TABLE channels_account 
ADD CONSTRAINT channels_account_provider_check 
CHECK (provider IN ('whatsapp', 'instagram', 'email', 'outlook'));

-- 2. Add missing columns to channels_chat
ALTER TABLE channels_chat 
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS participants TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_message_preview TEXT DEFAULT '';

-- 3. Add missing columns to channels_message  
ALTER TABLE channels_message 
ADD COLUMN IF NOT EXISTS account_id INTEGER,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS text TEXT,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS sender_id TEXT;

-- 4. Add Outlook credentials columns to user_credentials
ALTER TABLE user_credentials 
ADD COLUMN IF NOT EXISTS outlook_access_token TEXT,
ADD COLUMN IF NOT EXISTS outlook_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS outlook_token_expiry BIGINT,
ADD COLUMN IF NOT EXISTS outlook_email VARCHAR(255);

-- 5. Create index for Outlook email
CREATE INDEX IF NOT EXISTS idx_user_credentials_outlook_email 
ON user_credentials(outlook_email);
