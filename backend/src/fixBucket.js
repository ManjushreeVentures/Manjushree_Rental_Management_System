import pool from './config/db.js';

async function fixAgingBucketFunction() {
  try {
    console.log('🔧 Updating compute_aging_bucket function in database...');
    
    await pool.query(`
      DROP FUNCTION IF EXISTS compute_aging_bucket(DATE, NUMERIC, NUMERIC);
      
      CREATE OR REPLACE FUNCTION compute_aging_bucket(
        due_date DATE,
        amount_collected NUMERIC,
        bill_amount NUMERIC
      ) RETURNS TEXT AS $$
      DECLARE
        days_overdue INT;
      BEGIN
        IF amount_collected >= bill_amount THEN
          RETURN 'Current';
        END IF;

        IF due_date IS NULL THEN
          RETURN 'Current';
        END IF;

        days_overdue := CURRENT_DATE - due_date;

        IF days_overdue <= 0 THEN
          RETURN 'Current';
        ELSIF days_overdue <= 30 THEN
          RETURN '1-30 Days';
        ELSIF days_overdue <= 60 THEN
          RETURN '31-60 Days';
        ELSIF days_overdue <= 90 THEN
          RETURN '61-90 Days';
        ELSE
          RETURN '90+ Days';
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Successfully updated the aging bucket logic to use inclusive boundaries (<= 60)!');
  } catch (err) {
    console.error('❌ Error updating function:', err);
  } finally {
    process.exit(0);
  }
}

fixAgingBucketFunction();
