import pool from './config/db.js';

async function fixProperties() {
  console.log('🔧 Updating properties table...');
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS gstin TEXT,
      ADD COLUMN IF NOT EXISTS total_area NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS leased_area NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS vacant_area NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS vacated_date DATE;
    `);
    
    // Also drop owner_email and owner_phone since they are not required anymore
    // await client.query(`
    //   ALTER TABLE properties 
    //   DROP COLUMN IF EXISTS owner_email,
    //   DROP COLUMN IF EXISTS owner_phone,
    //   DROP COLUMN IF EXISTS city,
    //   DROP COLUMN IF EXISTS total_units;
    // `);

    console.log('✅ Success! Added gstin, total_area, leased_area, vacant_area, vacated_date to properties.');
  } catch (err) {
    console.error('❌ Error updating properties:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixProperties();
