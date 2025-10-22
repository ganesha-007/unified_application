-- Add Outlook credentials columns to user_credentials table
ALTER TABLE user_credentials 
ADD COLUMN IF NOT EXISTS outlook_access_token TEXT,
ADD COLUMN IF NOT EXISTS outlook_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS outlook_token_expiry BIGINT,
ADD COLUMN IF NOT EXISTS outlook_email VARCHAR(255);

-- Add index for Outlook email lookup
CREATE INDEX IF NOT EXISTS idx_user_credentials_outlook_email ON user_credentials(outlook_email);