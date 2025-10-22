-- Add Gmail credentials columns to user_credentials table
ALTER TABLE user_credentials 
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expiry BIGINT,
ADD COLUMN IF NOT EXISTS gmail_email VARCHAR(255);

-- Add index for Gmail email lookup
CREATE INDEX IF NOT EXISTS idx_user_credentials_gmail_email ON user_credentials(gmail_email);

-- Update channels_account to support email provider
-- (No changes needed as provider is already flexible)



