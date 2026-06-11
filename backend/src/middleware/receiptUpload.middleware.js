import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only .pdf, .png, .jpg, and .jpeg files are allowed'), false);
  }
};

export const receiptUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('file');
