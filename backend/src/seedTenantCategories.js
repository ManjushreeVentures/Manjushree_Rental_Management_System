import pool from './config/db.js';

const rawData = [
  {
    property: 'Ankit Kedia',
    tenant: 'Alternicq Limited',
    categories: ['Rent & CAM', 'Power Charges']
  },
  {
    property: 'Ankit Kedia',
    tenant: 'Manjushree Packtek Private Limited',
    categories: ['Rent & CAM', 'Water Charges']
  },
  {
    property: 'Ankit Kedia',
    tenant: 'Manjushree Venture LLP - A',
    categories: ['Rent & CAM']
  },
  {
    property: 'Vimal Kedia',
    tenant: 'Agrileaf Exports Private Limited',
    categories: ['Rent & CAM', 'Power Charges']
  },
  {
    property: 'Vimal Kedia',
    tenant: 'Amazon Retailer India Pvt Ltd - V1',
    categories: ['Rent & CAM']
  },
  {
    property: 'Vimal Kedia',
    tenant: 'Amazon Retailer India Pvt Ltd - V2',
    categories: ['Rent & CAM']
  },
  {
    property: 'Vimal Kedia',
    tenant: 'Amazon Seller Services Pvt Ltd',
    categories: ['Rent & CAM', 'Power Charges']
  },
  {
    property: 'Vimal Kedia',
    tenant: 'Bio Labs and Life Science',
    categories: ['Rent & CAM', 'Power Charges', 'Water Charges']
  },
  {
    property: 'Vimal Kedia',
    tenant: 'Elins Switch Boards Pvt Ltd',
    categories: ['Rent & CAM', 'Power Charges', 'Water Charges']
  },
  {
    property: 'Vimal Kedia',
    tenant: 'Orion',
    categories: ['Rent & CAM', 'Power Charges']
  },
  {
    property: 'Vimal Kedia',
    tenant: 'Punarvi Crystals',
    categories: ['Infrastructural']
  },
  {
    property: 'Vimal Kedia',
    tenant: 'SKR Traders',
    categories: ['Rent & CAM', 'Power Charges', 'Water Charges']
  },
  {
    property: 'MUCPL-Bidadi',
    tenant: 'Asahidenso Multilink Pvt Ltd',
    categories: ['Rent & CAM', 'Power Charges']
  },
  {
    property: 'MUCPL-Bidadi',
    tenant: 'Marelli Motherson',
    categories: ['Rent & CAM', 'Power Charges']
  },
  {
    property: 'MUCPL-Bidadi',
    tenant: 'Manjushree Venture LLP - B',
    categories: ['Rent & CAM']
  },
  {
    property: 'MUCPL-Bidadi',
    tenant: 'Britannia',
    categories: ['Rent & CAM', 'Power Charges']
  },
  {
    property: 'Jallan',
    tenant: 'British Enginees',
    categories: ['Rent & CAM']
  }

];

async function seedCategories() {
  try {
    console.log('🔄 Starting bulk update for tenant categories...');
    const client = await pool.connect();

    // De-duplicate in case of multiple same entries
    const uniqueMap = new Map();
    for (const item of rawData) {
      let tenantName = item.tenant.trim();
      // Handle known typos
      if (tenantName === 'British Enginees') tenantName = 'British Engines';

      const key = `${tenantName}|${item.category}`;
      uniqueMap.set(key, { tenantName, category: item.category });
    }

    const uniqueData = Array.from(uniqueMap.values());

    try {
      await client.query('BEGIN');

      // We will loop through the grouped data to insert. 
      // Note: A single tenant could be stored multiple times (e.g. MTL), so we match all tenants with that name
      for (const { tenantName, category } of uniqueData) {
        // Find tenant by name ILIKE
        const res = await client.query(
          `SELECT id, name, monthly_rent FROM tenants WHERE name ILIKE $1`,
          [`%${tenantName}%`]
        );

        if (res.rows.length === 0) {
          console.log(`⚠️  Could not find tenant: ${tenantName} for category ${category}`);
          continue;
        }

        for (const row of res.rows) {
          // Check if category already exists for this tenant
          const existingRes = await client.query(
            `SELECT id FROM tenant_categories WHERE tenant_id = $1 AND category = $2`,
            [row.id, category]
          );

          if (existingRes.rows.length === 0) {
            // Check if we have an invoice for this category to get the bill amount
            const invoiceRes = await client.query(
              `SELECT bill_amount FROM invoices 
               WHERE tenant_name ILIKE $1 AND category ILIKE $2 
               ORDER BY bill_date DESC LIMIT 1`,
              [`%${tenantName}%`, `%${category}%`]
            );

            let amount = 0;
            if (invoiceRes.rows.length > 0) {
              amount = invoiceRes.rows[0].bill_amount;
            } else if (category === 'Rent & CAM' && row.monthly_rent) {
              amount = row.monthly_rent;
            }

            await client.query(
              `INSERT INTO tenant_categories (tenant_id, category, amount, is_active)
               VALUES ($1, $2, $3, true)`,
              [row.id, category, amount]
            );
            console.log(`✅ Added ${category} (Amount: ${amount}) for ${row.name}`);
          } else {
            console.log(`ℹ️  Skipped ${category} for ${row.name} (Already exists)`);
          }
        }
      }
      await client.query('COMMIT');
      console.log('🎉 All tenant categories have been successfully populated!');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error updating tenant categories:', err);
    process.exit(1);
  }
}

seedCategories();
