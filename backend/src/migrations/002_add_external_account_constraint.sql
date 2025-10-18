-- Add constraint to prevent multiple users from connecting the same external account
-- This ensures each WhatsApp/Instagram account can only be connected by one user

-- First, let's check if there are any duplicate external accounts
-- If there are, we need to handle them before adding the constraint

-- Add the unique constraint on external account
ALTER TABLE channels_account 
ADD CONSTRAINT unique_external_account_per_provider 
UNIQUE (provider, external_account_id);

-- Add index for better performance on external account lookups
CREATE INDEX IF NOT EXISTS idx_channels_account_external_id 
ON channels_account(provider, external_account_id);
