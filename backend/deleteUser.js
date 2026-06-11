import pool from './src/config/db.js';

const email = process.argv[2];

if (!email) {
  console.log('Usage: node deleteUser.js <email>');
  console.log('Example: node deleteUser.js admin@rentflow.com');
  process.exit(1);
}

async function deleteUser() {
  try {
    const result = await pool.query('DELETE FROM users WHERE email = $1 RETURNING *', [email]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Successfully deleted user: ${email}`);
    } else {
      console.log(`⚠️ User not found in the database: ${email}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error deleting user:', err.message);
    process.exit(1);
  }
}

deleteUser();
