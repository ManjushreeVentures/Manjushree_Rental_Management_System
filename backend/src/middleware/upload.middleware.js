import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage(); // keep in memory, no disk write

const fileFilter = (req, file, cb) => {
  const allowed = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only .xlsx and .xls files are allowed'), false);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
}).single('file');