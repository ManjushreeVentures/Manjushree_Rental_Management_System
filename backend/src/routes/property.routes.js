import { Router } from 'express';
import {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyFile,
} from '../controllers/property.controller.js';
import { validate } from '../middleware/validate.js';
import { propertySchema } from '../models/property.model.js';
import { receiptUploadMiddleware } from '../middleware/receiptUpload.middleware.js';

const router = Router();

router.get('/',     getAllProperties);
router.get('/:id',  getPropertyById);
router.post('/',    validate(propertySchema), createProperty);
router.post('/upload', receiptUploadMiddleware, uploadPropertyFile);
router.put('/:id',  validate(propertySchema.partial()), updateProperty);
router.delete('/:id', deleteProperty);

export default router;