import pool from './src/config/db.js';

const seedData = [
  {
    name: 'MUCPL-Bidadi Warehouse',
    total_area: 302311,
    leased_area: 248868,
    vacant_area: 53443,
    total_amount: 6286772.37,
    units: [
      { unitName: 'GF & B-5, 1st Floor', tenantName: 'Britannia', area: 190512, isVacant: false, rent: 4882917.82 },
      { unitName: 'Block-4', tenantName: 'Britannia', area: 34034, isVacant: false, rent: 872308.44 },
      { unitName: 'Block-3', tenantName: null, area: 27041, isVacant: true, rent: 0 },
      { unitName: 'Block-2', tenantName: null, area: 26402, isVacant: true, rent: 0 },
      { unitName: 'BLOCK-1', tenantName: 'Marelli Motherson', area: 24322, isVacant: false, rent: 531546.12 }
    ]
  },
  {
    name: 'MUCPL-Bidadi Office',
    total_area: 126304,
    leased_area: 57661,
    vacant_area: 68643.00,
    total_amount: 2181848.78,
    units: [
      { unitName: 'GF Block-A', tenantName: 'Asahidenso Multilink Pvt Ltd', area: 19952, isVacant: false, rent: 813012.08 },
      { unitName: 'GF Block-B', tenantName: null, area: 18878, isVacant: true, rent: 0 },
      { unitName: 'FF', tenantName: null, area: 19162, isVacant: true, rent: 0 },
      { unitName: 'SF', tenantName: null, area: 30603, isVacant: true, rent: 0 },
      { unitName: 'TF', tenantName: 'Asahidenso Multilink Pvt Ltd', area: 37709, isVacant: false, rent: 1368836.70 }
    ]
  },
  {
    name: 'Ankit Kedia',
    total_area: 80725,
    leased_area: 80725,
    vacant_area: 0,
    total_amount: 1943531.76,
    units: [
      { unitName: 'MTL Unit', tenantName: 'Alternicq Limited', area: 65111, isVacant: false, rent: 1582848.36 },
      { unitName: 'Packetek Unit', tenantName: 'Manjushree Packtek Private Limited', area: 15614, isVacant: false, rent: 360683.40 }
    ]
  },
  {
    name: 'Vimal Kedia',
    total_area: 111762,
    leased_area: 76746,
    vacant_area: 35016,
    total_amount: 1901877.08,
    units: [
      { unitName: 'B-1', tenantName: 'Elins Switch Boards Pvt Ltd', area: 15467, isVacant: false, rent: 337636.88 },
      { unitName: 'B-2 GF', tenantName: 'Bio Labs and Life Science', area: 4234, isVacant: false, rent: 97339.66 },
      { unitName: 'B-2 FF', tenantName: 'Amazon Retailer India Pvt Ltd', area: 3849, isVacant: false, rent: 84021.75 },
      { unitName: 'B-3', tenantName: 'Amazon Seller Services Pvt Ltd', area: 5792, isVacant: false, rent: 168581.95 },
      { unitName: 'Parking', tenantName: 'Amazon Seller Services Pvt Ltd', area: 2000, isVacant: false, rent: 17640.00 },
      { unitName: 'B-4 GF', tenantName: 'Punarvi Crystals', area: 7517, isVacant: false, rent: 207469.20 },
      { unitName: 'B-5', tenantName: null, area: 26116, isVacant: true, rent: 0 },
      { unitName: 'Basement B-6', tenantName: 'SKR Traders', area: 4745, isVacant: false, rent: 142492.35 },
      { unitName: 'B-6 GF', tenantName: 'Orion', area: 8385, isVacant: false, rent: 212140.50 },
      { unitName: 'B-6', tenantName: 'Winnercom Technologies Pvt Ltd', area: 17300, isVacant: false, rent: 437690.00 },
      { unitName: 'B5', tenantName: 'Agrileaf Exports Private Limited', area: 7457, isVacant: false, rent: 196864.80 },
      { unitName: 'B_6', tenantName: null, area: 8900, isVacant: true, rent: 0 }
    ]
  },
  {
    name: 'Jallan',
    total_area: 43741,
    leased_area: 43741,
    vacant_area: 0,
    total_amount: 1194129.30,
    units: [
      { unitName: 'JPPL Block', tenantName: 'British Enginees', area: 43741, isVacant: false, rent: 1194129.30 }
    ]
  }
];

async function seedAll() {
  try {
    console.log('🌱 Starting full database seed...');

    // 0. Ensure columns and tables exist
    await pool.query(`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS gstin TEXT,
      ADD COLUMN IF NOT EXISTS total_area NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS leased_area NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS vacant_area NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS vacated_date DATE;
    `);

    // Clean up the old un-split MUCPL-Bidadi ghost property
    await pool.query(`DELETE FROM properties WHERE name ILIKE 'MUCPL-Bidadi'`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS units (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id   UUID REFERENCES properties(id) ON DELETE CASCADE,
        name          TEXT NOT NULL,
        total_area    NUMERIC(14,2) NOT NULL,
        tenant_id     UUID,
        rent_amount   NUMERIC(14,2) DEFAULT 0,
        is_active     BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    for (const p of seedData) {
      let propertyId;

      // Match by exact name to sync with Excel uploads!
      const existing = await pool.query('SELECT id FROM properties WHERE name = $1', [p.name]);
      if (existing.rows.length > 0) {
        propertyId = existing.rows[0].id;
        await pool.query(
          `UPDATE properties SET total_area = $2, leased_area = $3, vacant_area = $4, total_amount = $5, updated_at = NOW() WHERE id = $1`,
          [propertyId, p.total_area, p.leased_area, p.vacant_area, p.total_amount]
        );
        console.log(`Linked to existing Excel property: ${p.name}`);
      } else {
        const insertRes = await pool.query(
          `INSERT INTO properties (name, total_area, leased_area, vacant_area, total_amount, is_active) VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
          [p.name, p.total_area, p.leased_area, p.vacant_area, p.total_amount]
        );
        propertyId = insertRes.rows[0].id;
        console.log(`Inserted new property: ${p.name}`);
      }

      // Seed units
      for (const item of p.units) {
        // Check if unit exists
        let unitId;
        const unitExists = await pool.query(`SELECT id FROM units WHERE property_id = $1 AND name = $2`, [propertyId, item.unitName]);

        if (unitExists.rows.length > 0) {
          unitId = unitExists.rows[0].id;
        } else {
          const unitRes = await pool.query(
            `INSERT INTO units (property_id, name, total_area, rent_amount, is_active)
             VALUES ($1, $2, $3, $4, true) RETURNING id`,
            [propertyId, item.unitName, item.area, item.rent]
          );
          unitId = unitRes.rows[0].id;
          console.log(`  -> Created Unit: ${item.unitName}`);
        }

        // Create Tenant & Assign
        if (!item.isVacant && item.tenantName) {
          let tenantId;
          // Match tenant exactly to sync with Excel upload!
          const tenantExists = await pool.query(`SELECT id FROM tenants WHERE name = $1 AND property_id = $2`, [item.tenantName, propertyId]);

          if (tenantExists.rows.length > 0) {
            tenantId = tenantExists.rows[0].id;
          } else {
            const newTenant = await pool.query(
              `INSERT INTO tenants (property_id, name, monthly_rent, tenant_area, is_active)
               VALUES ($1, $2, $3, $4, true) RETURNING id`,
              [propertyId, item.tenantName, item.rent, item.area]
            );
            tenantId = newTenant.rows[0].id;
            console.log(`    -> Created Tenant: ${item.tenantName}`);
          }

          await pool.query(
            `UPDATE units SET tenant_id = $1 WHERE id = $2`,
            [tenantId, unitId]
          );
        }
      }
    }

    console.log('\n✅ Successfully synced units and tenants with Excel data!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
}

seedAll();
