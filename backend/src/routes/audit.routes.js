import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { authenticateJWT, authorizeRole } from '../middleware/authJwt.js';

const router = Router();

// Only allow admins to access audit logs
router.get('/', authenticateJWT, authorizeRole('admin'), getAuditLogs);

export default router;
