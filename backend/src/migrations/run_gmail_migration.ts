import { pool } from '../config/database';

async function runGmailMigration() {
  try {
    console.log('🔄 Running Gmail credentials migration...');
    
    // Add Gmail credentials columns to user_credentials table
    await pool.query(`
      ALTER TABLE user_credentials 
      ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
      ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS gmail_token_expiry BIGINT,
      ADD COLUMN IF NOT EXISTS gmail_email VARCHAR(255)
    `);
    
    // Add index for Gmail email lookup
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_credentials_gmail_email 
      ON user_credentials(gmail_email)
    `);
    
    console.log('✅ Gmail credentials migration completed successfully');
  } catch (error: any) {
    console.error('❌ Gmail credentials migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runGmailMigration();



