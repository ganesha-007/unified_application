-- Create channels_usage table for monthly message counts and rate limiting
CREATE TABLE IF NOT EXISTS channels_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    account_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL, -- whatsapp, instagram, gmail, outlook
    usage_type VARCHAR(50) NOT NULL, -- message, email, recipient, attachment
    count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP NOT NULL, -- Start of the counting period (hour/day/month)
    period_end TIMESTAMP NOT NULL, -- End of the counting period
    metadata JSONB DEFAULT '{}', -- Additional usage data like recipient domains, attachment sizes, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, account_id, provider, usage_type, period_start),
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (account_id),
    INDEX idx_provider (provider),
    INDEX idx_usage_type (usage_type),
    INDEX idx_period_start (period_start),
    INDEX idx_period_end (period_end),
    INDEX idx_user_provider_period (user_id, provider, period_start)
);

-- Create channels_rate_limit table for real-time rate limiting
CREATE TABLE IF NOT EXISTS channels_rate_limit (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    account_id INTEGER,
    provider VARCHAR(50) NOT NULL,
    limit_type VARCHAR(50) NOT NULL, -- recipient, domain, mailbox, global
    limit_key VARCHAR(255) NOT NULL, -- The specific key being limited (email, domain, etc.)
    count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, account_id, provider, limit_type, limit_key, window_start),
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (account_id),
    INDEX idx_provider (provider),
    INDEX idx_limit_type (limit_type),
    INDEX idx_limit_key (limit_key),
    INDEX idx_window_start (window_start),
    INDEX idx_window_end (window_end)
);

-- Create channels_attachment_policy table for attachment validation
CREATE TABLE IF NOT EXISTS channels_attachment_policy (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    account_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL,
    max_size_mb INTEGER NOT NULL DEFAULT 10,
    allowed_types TEXT[] DEFAULT ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    blocked_types TEXT[] DEFAULT ARRAY['application/x-executable', 'application/x-msdownload', 'application/x-msdos-program'],
    max_attachments_per_message INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, account_id, provider),
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (account_id),
    INDEX idx_provider (provider)
);

-- Insert default attachment policies for existing accounts
INSERT INTO channels_attachment_policy (user_id, account_id, provider, max_size_mb, allowed_types, blocked_types, max_attachments_per_message)
SELECT user_id, id, provider, 10, ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], 
       ARRAY['application/x-executable', 'application/x-msdownload', 'application/x-msdos-program'], 5
FROM channels_account
WHERE NOT EXISTS (
    SELECT 1 FROM channels_attachment_policy cap 
    WHERE cap.user_id = channels_account.user_id 
    AND cap.account_id = channels_account.id 
    AND cap.provider = channels_account.provider
)
ON CONFLICT (user_id, account_id, provider) DO NOTHING;
