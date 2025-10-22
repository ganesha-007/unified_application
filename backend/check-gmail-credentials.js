const { Pool } = require('pg');
require('dotenv').config();

async function checkGmailCredentials() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'whatsapp_integration',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔍 Checking for Gmail credentials in database...');
    
    // Check if user_credentials table has Gmail data
    const credentialsResult = await pool.query(`
      SELECT user_id, gmail_email, gmail_access_token, gmail_refresh_token, gmail_token_expiry
      FROM user_credentials 
      WHERE gmail_email IS NOT NULL
    `);
    
    console.log(`📧 Found ${credentialsResult.rows.length} Gmail credentials:`);
    
    if (credentialsResult.rows.length > 0) {
      credentialsResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. User: ${row.user_id}`);
        console.log(`   📧 Gmail Email: ${row.gmail_email}`);
        console.log(`   🔑 Access Token: ${row.gmail_access_token ? 'Present' : 'Missing'}`);
        console.log(`   🔄 Refresh Token: ${row.gmail_refresh_token ? 'Present' : 'Missing'}`);
        console.log(`   ⏰ Token Expiry: ${row.gmail_token_expiry ? new Date(parseInt(row.gmail_token_expiry)).toISOString() : 'Not set'}`);
      });
    } else {
      console.log('❌ No Gmail credentials found in database');
      console.log('💡 You need to complete the OAuth flow to connect your Gmail account');
    }
    
    // Check channels_account table for Gmail accounts
    const accountsResult = await pool.query(`
      SELECT user_id, external_account_id, status, metadata
      FROM channels_account 
      WHERE provider = 'email'
    `);
    
    console.log(`\n📋 Found ${accountsResult.rows.length} Gmail accounts in channels_account:`);
    
    if (accountsResult.rows.length > 0) {
      accountsResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. User: ${row.user_id}`);
        console.log(`   📧 Account ID: ${row.external_account_id}`);
        console.log(`   📊 Status: ${row.status}`);
        console.log(`   📝 Metadata: ${row.metadata}`);
      });
    } else {
      console.log('❌ No Gmail accounts found in channels_account table');
    }
    
  } catch (error) {
    console.error('❌ Error checking Gmail credentials:', error.message);
  } finally {
    await pool.end();
  }
}

checkGmailCredentials();



