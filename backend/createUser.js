import pool from './src/config/db.js';
import bcrypt from 'bcryptjs';

const [,, email, password, name, roleParam] = process.argv;
const role = roleParam || 'user';

if (!email || !password || !name) {
  console.log('Usage: node createUser.js <email> <password> <name> [role]');
  console.log('Example: node createUser.js admin@rentflow.com Admin@123 "System Admin" admin');
  process.exit(1);
}

async function createUser() {
  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length) {
      console.log(`❌ Error: User with email ${email} already exists.`);
      process.exit(1);
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert the new user
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
      [email, passwordHash, name, role]
    );

    console.log(`✅ Successfully created user: ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating user:', err.message);
    process.exit(1);
  }
}

createUser();
