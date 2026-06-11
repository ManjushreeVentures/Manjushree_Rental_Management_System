import pool from './src/config/db.js';
import bcrypt from 'bcryptjs';

async function testLogin() {
  const email = 'admin@rentflow.com';
  const password = 'Admin@123';
  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (!rows.length) {
      console.log('User not found');
      process.exit(1);
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('Invalid password');
      process.exit(1);
    }
    
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    console.log('Login logic succeeded');
  } catch (err) {
    console.error('Error during login logic:', err);
  }
  process.exit(0);
}

testLogin();
