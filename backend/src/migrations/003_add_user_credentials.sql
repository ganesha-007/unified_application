-- Add table to store user-specific UniPile credentials
-- This enables multi-tenant system where each user has their own UniPile account

CREATE TABLE IF NOT EXISTS user_credentials (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  unipile_api_key VARCHAR(500) NOT NULL,
  unipile_api_url VARCHAR(500) NOT NULL DEFAULT 'https://api22.unipile.com:15284/api/v1',
  whatsapp_phone_number VARCHAR(50),
  webhook_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);

-- Add foreign key relationship (optional, for data integrity)
-- ALTER TABLE channels_account ADD CONSTRAINT fk_channels_account_user_id 
-- FOREIGN KEY (user_id) REFERENCES user_credentials(user_id) ON DELETE CASCADE;
