-- Create channels_entitlement table for user access permissions
CREATE TABLE IF NOT EXISTS channels_entitlement (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'free', -- free, basic, pro, enterprise
    max_accounts INTEGER NOT NULL DEFAULT 1,
    max_messages_per_month INTEGER NOT NULL DEFAULT 100,
    max_recipients_per_message INTEGER NOT NULL DEFAULT 10,
    max_emails_per_hour INTEGER NOT NULL DEFAULT 50,
    max_emails_per_day INTEGER NOT NULL DEFAULT 20,
    max_attachment_size_mb INTEGER NOT NULL DEFAULT 10,
    features JSONB DEFAULT '{}', -- Additional features like webhooks, analytics, etc.
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    trial_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_plan_type (plan_type),
    INDEX idx_stripe_customer_id (stripe_customer_id),
    INDEX idx_expires_at (expires_at)
);

-- Insert default free plan for existing users
INSERT INTO channels_entitlement (user_id, plan_type, max_accounts, max_messages_per_month, max_recipients_per_message, max_emails_per_hour, max_emails_per_day, max_attachment_size_mb, features)
SELECT DISTINCT user_id, 'free', 1, 100, 10, 50, 20, 10, '{}'
FROM channels_account
WHERE user_id NOT IN (SELECT user_id FROM channels_entitlement)
ON CONFLICT (user_id) DO NOTHING;
