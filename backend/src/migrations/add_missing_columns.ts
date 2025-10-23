import { pool } from '../config/database';

async function addMissingColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding missing columns to existing tables...');
    
    // Add missing columns to channels_entitlement
    console.log('📋 Adding columns to channels_entitlement...');
    
    // Check if plan_type column exists
    const planTypeCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'plan_type'
      )
    `);
    
    if (!planTypeCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN plan_type VARCHAR(50) DEFAULT 'free'`);
      console.log('✅ Added plan_type column');
    }
    
    // Check if max_accounts column exists
    const maxAccountsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'max_accounts'
      )
    `);
    
    if (!maxAccountsCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN max_accounts INTEGER DEFAULT 1`);
      console.log('✅ Added max_accounts column');
    }
    
    // Check if max_messages_per_month column exists
    const maxMessagesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'max_messages_per_month'
      )
    `);
    
    if (!maxMessagesCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN max_messages_per_month INTEGER DEFAULT 100`);
      console.log('✅ Added max_messages_per_month column');
    }
    
    // Check if max_recipients_per_message column exists
    const maxRecipientsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'max_recipients_per_message'
      )
    `);
    
    if (!maxRecipientsCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN max_recipients_per_message INTEGER DEFAULT 10`);
      console.log('✅ Added max_recipients_per_message column');
    }
    
    // Check if max_emails_per_hour column exists
    const maxEmailsHourCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'max_emails_per_hour'
      )
    `);
    
    if (!maxEmailsHourCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN max_emails_per_hour INTEGER DEFAULT 50`);
      console.log('✅ Added max_emails_per_hour column');
    }
    
    // Check if max_emails_per_day column exists
    const maxEmailsDayCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'max_emails_per_day'
      )
    `);
    
    if (!maxEmailsDayCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN max_emails_per_day INTEGER DEFAULT 20`);
      console.log('✅ Added max_emails_per_day column');
    }
    
    // Check if max_attachment_size_mb column exists
    const maxAttachmentSizeCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'max_attachment_size_mb'
      )
    `);
    
    if (!maxAttachmentSizeCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN max_attachment_size_mb INTEGER DEFAULT 10`);
      console.log('✅ Added max_attachment_size_mb column');
    }
    
    // Check if features column exists
    const featuresCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'features'
      )
    `);
    
    if (!featuresCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN features JSONB DEFAULT '{}'`);
      console.log('✅ Added features column');
    }
    
    // Check if billing_cycle column exists
    const billingCycleCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'billing_cycle'
      )
    `);
    
    if (!billingCycleCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly'`);
      console.log('✅ Added billing_cycle column');
    }
    
    // Check if stripe_customer_id column exists
    const stripeCustomerCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'stripe_customer_id'
      )
    `);
    
    if (!stripeCustomerCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN stripe_customer_id VARCHAR(255)`);
      console.log('✅ Added stripe_customer_id column');
    }
    
    // Check if stripe_subscription_id column exists
    const stripeSubscriptionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'stripe_subscription_id'
      )
    `);
    
    if (!stripeSubscriptionCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN stripe_subscription_id VARCHAR(255)`);
      console.log('✅ Added stripe_subscription_id column');
    }
    
    // Check if trial_ends_at column exists
    const trialEndsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_entitlement' 
        AND column_name = 'trial_ends_at'
      )
    `);
    
    if (!trialEndsCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_entitlement ADD COLUMN trial_ends_at TIMESTAMP`);
      console.log('✅ Added trial_ends_at column');
    }

    // Add missing columns to channels_usage
    console.log('📊 Adding columns to channels_usage...');
    
    // Check if account_id column exists
    const accountIdCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_usage' 
        AND column_name = 'account_id'
      )
    `);
    
    if (!accountIdCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_usage ADD COLUMN account_id INTEGER NOT NULL DEFAULT 0`);
      console.log('✅ Added account_id column to channels_usage');
    }
    
    // Check if usage_type column exists
    const usageTypeCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_usage' 
        AND column_name = 'usage_type'
      )
    `);
    
    if (!usageTypeCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_usage ADD COLUMN usage_type VARCHAR(50) NOT NULL DEFAULT 'message'`);
      console.log('✅ Added usage_type column to channels_usage');
    }
    
    // Check if count column exists
    const countCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_usage' 
        AND column_name = 'count'
      )
    `);
    
    if (!countCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_usage ADD COLUMN count INTEGER NOT NULL DEFAULT 0`);
      console.log('✅ Added count column to channels_usage');
    }
    
    // Check if period_start column exists
    const periodStartCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_usage' 
        AND column_name = 'period_start'
      )
    `);
    
    if (!periodStartCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_usage ADD COLUMN period_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
      console.log('✅ Added period_start column to channels_usage');
    }
    
    // Check if period_end column exists
    const periodEndCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_usage' 
        AND column_name = 'period_end'
      )
    `);
    
    if (!periodEndCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_usage ADD COLUMN period_end TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
      console.log('✅ Added period_end column to channels_usage');
    }
    
    // Check if metadata column exists
    const metadataCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'channels_usage' 
        AND column_name = 'metadata'
      )
    `);
    
    if (!metadataCheck.rows[0].exists) {
      await client.query(`ALTER TABLE channels_usage ADD COLUMN metadata JSONB DEFAULT '{}'`);
      console.log('✅ Added metadata column to channels_usage');
    }

    // Create indexes
    console.log('🔍 Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_entitlement_user_id ON channels_entitlement(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_usage_user_id ON channels_usage(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rate_limit_user_id ON channels_rate_limit(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attachment_policy_user_id ON channels_attachment_policy(user_id)`);

    // Insert default data for existing users
    console.log('📝 Inserting default data for existing users...');
    
    // Update existing entitlements with default values
    await client.query(`
      UPDATE channels_entitlement 
      SET plan_type = 'free',
          max_accounts = 1,
          max_messages_per_month = 100,
          max_recipients_per_message = 10,
          max_emails_per_hour = 50,
          max_emails_per_day = 20,
          max_attachment_size_mb = 10,
          features = '{}',
          billing_cycle = 'monthly'
      WHERE plan_type IS NULL OR plan_type = ''
    `);
    
    console.log('✅ All missing columns added successfully');
  } catch (error) {
    console.error('❌ Adding missing columns failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingColumns();
