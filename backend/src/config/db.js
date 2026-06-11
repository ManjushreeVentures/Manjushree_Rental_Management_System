// import mongoose from "mongoose";

// export function isDbConnected() {
//   return mongoose.connection.readyState === 1;
// }

// export async function connectDB() {
//   const uri = process.env.MONGODB_URI;
//   if (!uri) {
//     throw new Error("MONGODB_URI is missing in environment variables");
//   }

//   mongoose.set("strictQuery", true);

//   await mongoose.connect(uri, {
//     serverSelectionTimeoutMS: 5000,
//   });

//   return mongoose.connection;
// }


import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
});

pool.on('connect', () => console.log('✅ PostgreSQL connected'));
pool.on('error',   (err) => console.error('❌ DB error:', err));

// Auto-migration: ensure tables have attachment_url column
pool.query('ALTER TABLE receipts ADD COLUMN IF NOT EXISTS attachment_url TEXT')
  .then(() => console.log('✅ Checked database schema: attachment_url column exists in receipts'))
  .catch(console.error);

pool.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS attachment_url TEXT')
  .then(() => console.log('✅ Checked database schema: attachment_url column exists in properties'))
  .catch(console.error);

pool.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS attachment_url TEXT')
  .then(() => console.log('✅ Checked database schema: attachment_url column exists in tenants'))
  .catch(console.error);

// Auto-migration: ensure audit_logs table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email    TEXT,
    action        TEXT NOT NULL,
    entity        TEXT NOT NULL,
    entity_id     UUID,
    details       JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );
`)
  .then(() => console.log('✅ Checked database schema: audit_logs table exists'))
  .catch(console.error);

// One-time fix: downgrade Manikant's role to user
pool.query(`UPDATE users SET role = 'user' WHERE email = 'manikant.g@manjushreeventures.com'`)
  .then((res) => { if (res.rowCount > 0) console.log('✅ Downgraded manikant.g@manjushreeventures.com to user role'); })
  .catch(console.error);
import fs from 'fs';
import path from 'path';

pool.query(`SELECT * FROM invoices ORDER BY created_at DESC LIMIT 5`)
  .then((res) => {
    fs.writeFileSync(path.join(process.cwd(), 'latest_invoices.json'), JSON.stringify(res.rows, null, 2));
    console.log('✅ Dumped latest invoices');
  })
  .catch(console.error);

export default pool;