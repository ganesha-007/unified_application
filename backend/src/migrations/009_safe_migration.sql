-- Safe migration that handles existing objects
-- Create channels_entitlement table if it doesn't exist
CREATE TABLE IF NOT EXISTS channels_entitlement (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'free',
    max_accounts INTEGER NOT NULL DEFAULT 1,
    max_messages_per_month INTEGER NOT NULL DEFAULT 100,
    max_recipients_per_message INTEGER NOT NULL DEFAULT 10,
    max_emails_per_hour INTEGER NOT NULL DEFAULT 50,
    max_emails_per_day INTEGER NOT NULL DEFAULT 20,
    max_attachment_size_mb INTEGER NOT NULL DEFAULT 10,
    features JSONB DEFAULT '{}',
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    trial_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_entitlement_user_id ON channels_entitlement(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_plan_type ON channels_entitlement(plan_type);
CREATE INDEX IF NOT EXISTS idx_entitlement_stripe_customer_id ON channels_entitlement(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_expires_at ON channels_entitlement(expires_at);

-- Create channels_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS channels_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    account_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL,
    usage_type VARCHAR(50) NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, account_id, provider, usage_type, period_start)
);

-- Create indexes for channels_usage
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON channels_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_account_id ON channels_usage(account_id);
CREATE INDEX IF NOT EXISTS idx_usage_provider ON channels_usage(provider);
CREATE INDEX IF NOT EXISTS idx_usage_usage_type ON channels_usage(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_period_start ON channels_usage(period_start);
CREATE INDEX IF NOT EXISTS idx_usage_period_end ON channels_usage(period_end);
CREATE INDEX IF NOT EXISTS idx_usage_user_provider_period ON channels_usage(user_id, provider, period_start);

-- Create channels_rate_limit table if it doesn't exist
CREATE TABLE IF NOT EXISTS channels_rate_limit (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    account_id INTEGER,
    provider VARCHAR(50) NOT NULL,
    limit_type VARCHAR(50) NOT NULL,
    limit_key VARCHAR(255) NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, account_id, provider, limit_type, limit_key, window_start)
);

-- Create indexes for channels_rate_limit
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_id ON channels_rate_limit(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_account_id ON channels_rate_limit(account_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_provider ON channels_rate_limit(provider);
CREATE INDEX IF NOT EXISTS idx_rate_limit_limit_type ON channels_rate_limit(limit_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_limit_key ON channels_rate_limit(limit_key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start ON channels_rate_limit(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_end ON channels_rate_limit(window_end);

-- Create channels_attachment_policy table if it doesn't exist
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
    
    UNIQUE(user_id, account_id, provider)
);

-- Create indexes for channels_attachment_policy
CREATE INDEX IF NOT EXISTS idx_attachment_policy_user_id ON channels_attachment_policy(user_id);
CREATE INDEX IF NOT EXISTS idx_attachment_policy_account_id ON channels_attachment_policy(account_id);
CREATE INDEX IF NOT EXISTS idx_attachment_policy_provider ON channels_attachment_policy(provider);

-- Insert default free plan for existing users (only if they don't already have entitlements)
INSERT INTO channels_entitlement (user_id, plan_type, max_accounts, max_messages_per_month, max_recipients_per_message, max_emails_per_hour, max_emails_per_day, max_attachment_size_mb, features)
SELECT DISTINCT user_id, 'free', 1, 100, 10, 50, 20, 10, '{}'
FROM channels_account
WHERE user_id NOT IN (SELECT user_id FROM channels_entitlement)
ON CONFLICT (user_id) DO NOTHING;

-- Insert default attachment policies for existing accounts (only if they don't already exist)
INSERT INTO channels_attachment_policy (user_id, account_id, provider, max_size_mb, allowed_types, blocked_types, max_attachments_per_message)
SELECT user_id, id, provider, 10, 
       ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'], 
       ARRAY['application/x-executable', 'application/x-msdownload', 'application/x-msdos-program', 'application/x-msi', 'application/x-ms-shortcut', 'application/x-ms-wim'], 5
FROM channels_account
WHERE NOT EXISTS (
    SELECT 1 FROM channels_attachment_policy cap 
    WHERE cap.user_id = channels_account.user_id 
    AND cap.account_id = channels_account.id 
    AND cap.provider = channels_account.provider
)
ON CONFLICT (user_id, account_id, provider) DO NOTHING;
