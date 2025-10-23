import { pool } from '../config/database';

async function checkAndCreateTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Checking existing tables and creating new ones...');
    
    // Check if channels_entitlement exists
    const entitlementCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'channels_entitlement'
      )
    `);
    
    if (!entitlementCheck.rows[0].exists) {
      console.log('📋 Creating channels_entitlement table...');
      await client.query(`
        CREATE TABLE channels_entitlement (
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
        )
      `);
      console.log('✅ channels_entitlement table created');
    } else {
      console.log('✅ channels_entitlement table already exists');
    }

    // Check if channels_usage exists
    const usageCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'channels_usage'
      )
    `);
    
    if (!usageCheck.rows[0].exists) {
      console.log('📊 Creating channels_usage table...');
      await client.query(`
        CREATE TABLE channels_usage (
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
        )
      `);
      console.log('✅ channels_usage table created');
    } else {
      console.log('✅ channels_usage table already exists');
    }

    // Check if channels_rate_limit exists
    const rateLimitCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'channels_rate_limit'
      )
    `);
    
    if (!rateLimitCheck.rows[0].exists) {
      console.log('⏱️ Creating channels_rate_limit table...');
      await client.query(`
        CREATE TABLE channels_rate_limit (
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
        )
      `);
      console.log('✅ channels_rate_limit table created');
    } else {
      console.log('✅ channels_rate_limit table already exists');
    }

    // Check if channels_attachment_policy exists
    const attachmentPolicyCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'channels_attachment_policy'
      )
    `);
    
    if (!attachmentPolicyCheck.rows[0].exists) {
      console.log('📎 Creating channels_attachment_policy table...');
      await client.query(`
        CREATE TABLE channels_attachment_policy (
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
        )
      `);
      console.log('✅ channels_attachment_policy table created');
    } else {
      console.log('✅ channels_attachment_policy table already exists');
    }

    // Create indexes
    console.log('🔍 Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_entitlement_user_id ON channels_entitlement(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_usage_user_id ON channels_usage(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rate_limit_user_id ON channels_rate_limit(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attachment_policy_user_id ON channels_attachment_policy(user_id)`);

    // Insert default data only if tables are empty
    console.log('📝 Inserting default data...');
    
    // Insert default free plan for existing users
    const entitlementCount = await client.query('SELECT COUNT(*) FROM channels_entitlement');
    if (parseInt(entitlementCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO channels_entitlement (user_id, plan_type, max_accounts, max_messages_per_month, max_recipients_per_message, max_emails_per_hour, max_emails_per_day, max_attachment_size_mb, features)
        SELECT DISTINCT user_id, 'free', 1, 100, 10, 50, 20, 10, '{}'
        FROM channels_account
        ON CONFLICT (user_id) DO NOTHING
      `);
      console.log('✅ Default entitlements inserted');
    }

    // Insert default attachment policies for existing accounts
    const attachmentPolicyCount = await client.query('SELECT COUNT(*) FROM channels_attachment_policy');
    if (parseInt(attachmentPolicyCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO channels_attachment_policy (user_id, account_id, provider, max_size_mb, allowed_types, blocked_types, max_attachments_per_message)
        SELECT user_id, id, provider, 10, 
               ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], 
               ARRAY['application/x-executable', 'application/x-msdownload', 'application/x-msdos-program'], 5
        FROM channels_account
        ON CONFLICT (user_id, account_id, provider) DO NOTHING
      `);
      console.log('✅ Default attachment policies inserted');
    }
    
    console.log('✅ All new tables and data migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndCreateTables();
