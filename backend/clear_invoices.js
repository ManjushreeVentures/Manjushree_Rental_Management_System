import pool from './src/config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function clearInvoicesOnly() {
  console.log('🗑️ Clearing invoices, receipts, and upload logs...');
  
  try {
    // Verify connection first
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('❌ DATABASE CONNECTION FAILED. Please check your .env file.', err.message);
    process.exit(1);
  }

  const tables = ['receipts', 'invoices', 'excel_uploads'];
  
  for (const table of tables) {
    try {
      await pool.query(`TRUNCATE TABLE ${table} CASCADE;`);
      console.log(`✅ Cleared ${table}`);
    } catch (err) {
      console.warn(`⚠️ Could not clear ${table}: ${err.message}`);
    }
  }
  
  console.log('✅ Invoices clearing process finished!');
  process.exit(0);
}

clearInvoicesOnly();
