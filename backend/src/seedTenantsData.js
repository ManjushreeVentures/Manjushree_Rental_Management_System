import pool from './config/db.js';

// Extracted exactly from your Excel image!
const tenantData = [
  // MUCPL Bidadi
  { name: 'Britannia', area: 190512, rate: 24.41, rent: 4650397.92, cam: 0, pct: 5, date: '2026-07-31', newRent: 4882917.82, security: 15000000 },
  { name: 'Marelli Motherson', area: 24322, rate: 21.84, rent: 531302.90, cam: 0, pct: 3, date: '2026-01-01', newRent: 547241.99 },
  { name: 'Asahidenso Multilink Pvt Ltd', area: 19952.5, rate: 35.28, rent: 703923.49, cam: 70392.35, pct: 5, date: '2025-09-01', newRent: 813031.64 },

  // 143D Bommasandra
  { name: 'Elins Switch Boards Pvt Ltd', area: 15468, rate: 18.90, rent: 292345.20, cam: 29234.52, pct: 5, date: '2025-09-11', newRent: 337658.71 },
  { name: 'Bio Labs and Life Science', area: 4234.3, rate: 19.80, rent: 83839.14, cam: 8383.91, pct: 5, date: '2026-09-01', newRent: 96834.21 },
  { name: 'SKR Traders', area: 4745, rate: 29.40, rent: 139503.00, cam: 13950.30, pct: 5, date: '2026-05-21', newRent: 161125.97 },
  { name: 'MTL', area: 28885, rate: 18.68, rent: 539550.90, cam: 53955.09, pct: 5, date: '2025-11-10', newRent: 623181.29 }, // Note: MTL is in 143D
  { name: 'Orion', area: 8385, rate: 22.00, rent: 184470.00, cam: 27670.50, pct: 5, date: '2026-02-15', newRent: 222747.53 },
  { name: 'Amazon Retailer India Pvt Ltd', area: 5792, rate: 25.20, rent: 145958.40, cam: 14595.84, pct: 5, date: '2025-12-26', newRent: 168581.95 },

  // 143 C5 Bommasandra
  { name: 'Manjushree Packtek Private Limited', area: 15614, rate: 21.00, rent: 327894.00, cam: 32789.40, pct: null, date: null, newRent: null },
  { name: 'MTL', area: 65111, rate: 23.04, rent: 1500156.52, cam: 86597, pct: 5, date: '2025-07-19', newRent: 1666091.19 }, // Note: MTL is in 143 C5

  // JPPL
  { name: 'British Engines', area: 43741, rate: 26.00, rent: 1137266.00, cam: 0, pct: 5, date: '2026-04-01', newRent: 1194129.30 },
];

async function seedData() {
  try {
    console.log('🔄 Starting bulk update for tenants from Excel image data...');

    // First apply the schema patch just in case it wasn't run
    await pool.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS tenant_area NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS rate_per_sft NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS cam_amount NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS escalation_pct NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS escalation_due_date DATE,
      ADD COLUMN IF NOT EXISTS escalation_new_rent NUMERIC(14,2)
    `);

    const client = await pool.connect();
    try {
      for (const t of tenantData) {
        // Find tenant by name ILIKE to ignore case, and order by whether it has area to prefer updating correctly.
        // We do a simple ILIKE match. If MTL matches 2 properties, we just update all matches with that name.
        const params = [
          t.area, t.rate, t.cam, t.rent, t.pct, t.date, t.newRent
        ];

        let securityClause = '';
        let nameParamIndex = 8;

        if (t.security) {
          securityClause = `, security_deposit = $8`;
          params.push(t.security);
          nameParamIndex = 9;
        }

        const query = `
          UPDATE tenants 
          SET 
            tenant_area = $1, 
            rate_per_sft = $2, 
            cam_amount = $3, 
            monthly_rent = $4,
            escalation_pct = $5,
            escalation_due_date = $6,
            escalation_new_rent = $7
            ${securityClause}
          WHERE name ILIKE $${nameParamIndex}
          RETURNING id, name
        `;

        params.push(`%${t.name}%`);

        const res = await client.query(query, params);
        if (res.rows.length > 0) {
          console.log(`✅ Updated: ${t.name}`);
        } else {
          console.log(`⚠️  Could not find existing tenant in DB to update: ${t.name}`);
        }
      }
      console.log('🎉 All tenant data has been successfully populated!');
    } finally {
      client.release();
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error updating tenants:', err);
    process.exit(1);
  }
}

seedData();
