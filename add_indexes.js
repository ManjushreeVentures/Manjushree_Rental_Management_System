import pool from './backend/src/config/db.js';

async function addIndexes() {
  try {
    console.log('Adding database indexes for performance...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_categories_tenant_id ON tenant_categories(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_categories_is_active ON tenant_categories(is_active);
      
      CREATE INDEX IF NOT EXISTS idx_units_tenant_id ON units(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_units_is_active ON units(is_active);
      
      CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON invoices(property_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_category ON invoices(category);
      CREATE INDEX IF NOT EXISTS idx_invoices_bill_date ON invoices(bill_date);
    `);
    
    console.log('Successfully added performance indexes!');
  } catch (err) {
    console.error('Error adding indexes:', err);
  } finally {
    process.exit(0);
  }
}

addIndexes();
