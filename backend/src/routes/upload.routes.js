import { Router } from 'express';
import { uploadMiddleware } from '../middleware/upload.middleware.js';
import { uploadExcel, getUploadHistory, verifyPin } from '../controllers/upload.controller.js';

const router = Router();

router.post('/excel',      uploadMiddleware, uploadExcel);
router.get('/history',     getUploadHistory);
router.post('/verify-pin', verifyPin);
export default router;