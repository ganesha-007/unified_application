import { pool } from '../config/database';

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking existing table schemas...');
    
    // Check channels_entitlement columns
    const entitlementColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'channels_entitlement'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 channels_entitlement columns:');
    entitlementColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check channels_usage columns
    const usageColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'channels_usage'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 channels_usage columns:');
    usageColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check channels_rate_limit columns
    const rateLimitColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'channels_rate_limit'
      ORDER BY ordinal_position
    `);
    
    console.log('⏱️ channels_rate_limit columns:');
    rateLimitColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check channels_attachment_policy columns
    const attachmentPolicyColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'channels_attachment_policy'
      ORDER BY ordinal_position
    `);
    
    console.log('📎 channels_attachment_policy columns:');
    attachmentPolicyColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
