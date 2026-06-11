import pool from './db.js';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  const adminEmail = 'admin@rentflow.com';
  const adminPassword = 'Admin@123'; // Change this after first login
  const adminName = 'Admin User';

  try {
    console.log('🌱 Seeding admin user...');

    // Check if admin already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existing.rows.length) {
      console.log('✅ Admin user already exists');
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       RETURNING id, email, name, role`,
      [adminEmail, passwordHash, adminName]
    );

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔐 Password:', adminPassword);
    console.log('⚠️  IMPORTANT: Change password after first login!');
    console.log('👤 User:', result.rows[0]);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed Error:', err.message);
    process.exit(1);
  }
}

seedAdmin();
