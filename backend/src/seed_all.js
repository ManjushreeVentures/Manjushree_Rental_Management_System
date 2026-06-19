import pool from './config/db.js';

// Convert DD-MM-YYYY to YYYY-MM-DD
function parseDate(dateStr) {
  if (!dateStr || dateStr === 'NA') return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

const data = [
  {
    property: 'MUCPL Bidadi',
    total_area: 428615,
    vacant_blocks: [
      { name: 'Block-3', area: 27041 },
      { name: 'Block-2', area: 26402 }
    ],
    tenants: [
      {
        name: 'Britannia',
        unit_no: 'GF & B-5, 1st Floor, Block-4',
        lease_start: '05-05-2026',
        area: 224546,
        security: 15000000,
        leased: 11,
        lock: 11,
        rent: 5755226.25,
        cam: 0,
        pct: 5,
        due: '01-10-2026',
        newRent: 6042987.57,
        rate: 25.63,
        blocks: [
          { name: 'GF & B-5, 1st Floor', area: 190512, rent: 4882917.82 },
          { name: 'Block-4', area: 34034, rent: 872308.44 }
        ]
      },
      {
        name: 'Marelli Motherson',
        unit_no: 'BLOCK-1',
        lease_start: '01-02-2022',
        area: 24322,
        security: 4864400,
        leased: 84,
        lock: 84,
        rent: 547245.00,
        cam: 0,
        pct: 3,
        due: '01-01-2027',
        newRent: 563662.35,
        rate: 22.50,
        blocks: [
          { name: 'BLOCK-1', area: 24322, rent: 547245.00 }
        ]
      },
      {
        name: 'Asahidenso Multilink Pvt Ltd',
        unit_no: 'GF Block-A, TF',
        lease_start: '01-09-2022',
        area: 19952.48 + 37709, // 57661.48
        security: 6484800 + 12443970, // 18928770
        leased: 60,
        lock: 36,
        rent: 739119.67 + 1244397.00, // 1983516.67
        cam: 73911.97 + 124439.70, // 198351.67
        pct: 5,
        due: '01-09-2026',
        newRent: 853683.22 + 1437278.54, // 2290961.76
        rate: 34.40, // weighted avg
        blocks: [
          { name: 'GF Block-A', area: 19952.48, rent: 813031.64 },
          { name: 'TF', area: 37709, rent: 1368836.70 }
        ]
      }
    ]
  },
  {
    property: 'Vimal Kedia',
    total_area: 111762,
    tenants: [
      { name: 'Elins Switch Boards Pvt Ltd', unit_no: 'B-1', lease_start: '11-09-2023', area: 15467, security: 2785000, leased: 60, lock: 60, rent: 306962.46, cam: 46044.37, pct: 5, due: '11-09-2026', newRent: 370657.17, rate: 19.85, blocks: [{ name: 'B-1', area: 15467, rent: 353006.83 }] },
      { name: 'Bio Labs and Life Science', unit_no: 'B-2 GF', lease_start: '23-08-2023', area: 4234, security: 884970, leased: 36, lock: 36, rent: 92942.89, cam: 9294.29, pct: 5, due: '01-09-2026', newRent: 107349.03, rate: 21.95, blocks: [{ name: 'B-2 GF', area: 4234, rent: 102237.18 }] },
      { name: 'SKR Traders', unit_no: 'Basement B-6', lease_start: '14-06-2024', area: 4745, security: 1357070, leased: 36, lock: 36, rent: 136015.43, cam: 13601.54, pct: 5, due: '21-05-2027', newRent: 157097.82, rate: 28.67, blocks: [{ name: 'Basement B-6', area: 4745, rent: 149616.97 }] },
      { name: 'Agrileaf Exports Private Limited', unit_no: 'B5', lease_start: '05-03-2026', area: 7457, security: 1073808, leased: 24, lock: 11, rent: 149140.00, cam: 29828.00, pct: 5, due: '05-03-2027', newRent: 187916.40, rate: 20.00, blocks: [{ name: 'B5', area: 7457, rent: 178968.00 }] },
      { name: 'Orion Apparel Trim Pvt Ltd', unit_no: 'B-6 GF', lease_start: '14-02-2025', area: 8385, security: 1844700, leased: 60, lock: 60, rent: 193693.50, cam: 29054.03, pct: 5, due: '14-02-2027', newRent: 233884.90, rate: 23.10, blocks: [{ name: 'B-6 GF', area: 8385, rent: 222747.53 }] },
      { name: 'Winnercom Sandhar Technologies Pvt Ltd', unit_no: 'B-6', lease_start: '01-04-2026', area: 17300, security: 4376900, leased: 60, lock: 36, rent: 380600.00, cam: 57090.00, pct: 5, due: '01-04-2027', newRent: 459574.50, rate: 22.00, blocks: [{ name: 'B-6', area: 17300, rent: 437690.00 }] },
      { name: 'Amazon Retailer India Pvt Ltd', unit_no: 'B-2 FF', lease_start: '13-12-2025', area: 3849, security: 212472, leased: 60, lock: 24, rent: 208453.97, cam: 19061.40, pct: 5, due: '26-12-2026', newRent: 238891.14, rate: 19.85, blocks: [
        { name: 'B-2 FF (Unit 1)', area: 3195, rent: 188857.06 },
        { name: 'B-2 FF (Unit 2)', area: 654, rent: 38658.30 }
      ] },
      { name: 'Amazon Seller Services Pvt Ltd', unit_no: 'B-3, Parking', lease_start: '13-12-2025', area: 5792, security: 1133268, leased: 60, lock: 24, rent: 39045.00, cam: 3904.50, pct: 5, due: '26-12-2026', newRent: 45096.97, rate: 26.46, blocks: [
        { name: 'B-3', area: 4807, rent: 35645.39 },
        { name: 'Parking', area: 985, rent: 7304.11 }
      ] },
      { name: 'Punarvi Industries', unit_no: 'B-4 GF', lease_start: '06-09-2025', area: 7517, security: 2074692, leased: 60, lock: 60, rent: 180408.00, cam: 27061.20, pct: 10, due: '01-09-2026', newRent: 228216.12, rate: 24.00, blocks: [{ name: 'B-4 GF', area: 7517, rent: 207469.20 }] }
    ]
  },
  {
    property: 'Ankit Kedia',
    total_area: 80725,
    tenants: [
      { name: 'Manjushree Packtek Private Limited', unit_no: 'Packetek Unit', lease_start: '01-10-2022', area: 15614, security: 0, leased: 84, lock: 84, rent: 327894.00, cam: 32789.40, pct: null, due: null, newRent: null, rate: 21.00, blocks: [{ name: 'Packetek Unit', area: 15614, rent: 360683.40 }] },
      { name: 'Alternicq Limited', unit_no: 'MTL Unit', lease_start: '25-11-2025', area: 65111, security: 8335234, leased: 12, lock: null, rent: 1575034.12, cam: 126002.73, pct: 5, due: '25-11-2026', newRent: 1786088.69, rate: 24.19, blocks: [{ name: 'MTL Unit', area: 65111, rent: 1701036.85 }] }
    ]
  },
  {
    property: 'Jallan',
    total_area: 43741,
    tenants: [
      { name: 'British Engines', unit_no: 'JPPL Block', lease_start: '23-04-2025', area: 43741, security: 6823596, leased: 240, lock: 120, rent: 1194129.30, cam: 0, pct: 5, due: '01-04-2027', newRent: 1253835.77, rate: 27.30, blocks: [{ name: 'JPPL Block', area: 43741, rent: 1194129.30 }] }
    ]
  },
  {
    property: 'Internal',
    total_area: null,
    tenants: [
      { name: 'Manjushree Venture LLP', unit_no: null, lease_start: null, area: null, security: null, leased: null, lock: null, rent: null, cam: null, pct: null, due: null, newRent: null, rate: null, blocks: [] },
      { name: 'Caremont Medtech Pvt Ltd', unit_no: null, lease_start: null, area: null, security: null, leased: null, lock: null, rent: null, cam: null, pct: null, due: null, newRent: null, rate: null, blocks: [] },
      { name: 'Manjushree Fincap Pvt Ltd', unit_no: null, lease_start: null, area: null, security: null, leased: null, lock: null, rent: null, cam: null, pct: null, due: null, newRent: null, rate: null, blocks: [] }
    ]
  }
];

async function runSeed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const p of data) {
      if (!p.property) continue;

      try {
        let propId = null;
        const propRes = await client.query(`SELECT id FROM properties WHERE name ILIKE $1`, [`%${p.property}%`]);
        if (propRes.rows.length > 0) {
          propId = propRes.rows[0].id;
          if (p.total_area) {
            await client.query(`UPDATE properties SET total_area = $1 WHERE id = $2`, [p.total_area, propId]);
          }
        } else {
          const newProp = await client.query(`INSERT INTO properties (name, city, total_area, is_active) VALUES ($1, 'Bangalore', $2, true) RETURNING id`, [p.property, p.total_area || null]);
          propId = newProp.rows[0].id;
          console.log(`Created new property: ${p.property}`);
        }

        for (const t of p.tenants) {
          const lDate = parseDate(t.lease_start);
          const dueDate = parseDate(t.due);

          // Always check if tenant already exists by name
          const existRes = await client.query(`SELECT id FROM tenants WHERE name = $1 AND property_id = $2`, [t.name, propId]);
          let targetTenantId = existRes.rows.length > 0 ? existRes.rows[0].id : null;

          if (targetTenantId) {
            await client.query(`
              UPDATE tenants 
              SET lease_start=$1, tenant_area=$2, security_deposit=$3, 
                  leased_period=$4, lock_in_period=$5, monthly_rent=COALESCE(monthly_rent, $6), cam_amount=COALESCE(cam_amount, $7), 
                  escalation_pct=$8, escalation_due_date=$9, escalation_new_rent=$10, unit_no=$11, rate_per_sft=$13
              WHERE id=$12
            `, [lDate, t.area, t.security, t.leased, t.lock, t.rent, t.cam, t.pct, dueDate, t.newRent, t.unit_no, targetTenantId, t.rate]);
            console.log(`✅ Updated existing tenant: ${t.name}`);
          } else {
            const insertRes = await client.query(`
              INSERT INTO tenants (
                property_id, name, lease_start, tenant_area, security_deposit, 
                leased_period, lock_in_period, monthly_rent, cam_amount, 
                escalation_pct, escalation_due_date, escalation_new_rent, unit_no, rate_per_sft, is_active
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
              RETURNING id
            `, [propId, t.name, lDate, t.area, t.security, t.leased, t.lock, t.rent, t.cam, t.pct, dueDate, t.newRent, t.unit_no, t.rate]);
            targetTenantId = insertRes.rows[0].id;
            console.log(`✨ Created new tenant: ${t.name}`);
          }

          // Seed Blocks (units)
          if (t.blocks && t.blocks.length > 0) {
            for (const b of t.blocks) {
              const unitRes = await client.query(`SELECT id FROM units WHERE name = $1 AND property_id = $2`, [b.name, propId]);
              if (unitRes.rows.length > 0) {
                await client.query(`
                  UPDATE units SET total_area=$1, tenant_id=$2, rent_amount=$3 WHERE id=$4
                `, [b.area, targetTenantId, b.rent, unitRes.rows[0].id]);
              } else {
                await client.query(`
                  INSERT INTO units (property_id, name, total_area, tenant_id, rent_amount, is_active)
                  VALUES ($1, $2, $3, $4, $5, true)
                `, [propId, b.name, b.area, targetTenantId, b.rent]);
              }
            }
          }
        }

        // Seed Vacant Blocks
        if (p.vacant_blocks && p.vacant_blocks.length > 0) {
          for (const vb of p.vacant_blocks) {
            const unitRes = await client.query(`SELECT id FROM units WHERE name = $1 AND property_id = $2`, [vb.name, propId]);
            if (unitRes.rows.length === 0) {
              await client.query(`
                INSERT INTO units (property_id, name, total_area, tenant_id, rent_amount, is_active)
                VALUES ($1, $2, $3, NULL, 0, true)
              `, [propId, vb.name, vb.area]);
            }
          }
        }
      } catch (err) {
        console.error(`❌ Error processing property ${p.property}:`, err);
      }
    }

    await client.query('COMMIT');
    console.log('🎉 All excel data successfully seeded into database!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during seed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

runSeed();
