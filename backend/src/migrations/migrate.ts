import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running database migrations...');
    
    // Read and execute initial schema
    const schema = readFileSync(join(__dirname, '001_initial_schema.sql'), 'utf-8');
    await client.query(schema);
    
    // Read and execute Gmail credentials migration
    const gmailMigration = readFileSync(join(__dirname, '004_add_gmail_credentials.sql'), 'utf-8');
    await client.query(gmailMigration);
    
    // Read and execute Outlook credentials migration
    const outlookMigration = readFileSync(join(__dirname, '005_add_outlook_credentials.sql'), 'utf-8');
    await client.query(outlookMigration);
    
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();

