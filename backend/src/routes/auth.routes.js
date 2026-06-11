import { Router } from 'express';
import { login, getCurrentUser, changePassword } from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middleware/authJwt.js';

const router = Router();

import pool from '../config/db.js';

router.post('/login',           login);
router.get('/me',               authenticateJWT, getCurrentUser);
router.post('/change-password', authenticateJWT, changePassword);

router.get('/tenant-debug', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT name, monthly_rent FROM tenants');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
