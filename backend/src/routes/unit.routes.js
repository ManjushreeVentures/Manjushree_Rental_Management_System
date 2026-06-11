import express from 'express';
import { unitSchema } from '../models/unit.model.js';
import { validate } from '../middleware/validate.js';
import {
  getAllUnits,
  createUnit,
  updateUnit,
  deleteUnit
} from '../controllers/unit.controller.js';

const router = express.Router();

router.get('/', getAllUnits);
router.post('/', validate(unitSchema), createUnit);
router.put('/:id', validate(unitSchema.partial()), updateUnit);
router.delete('/:id', deleteUnit);

export default router;
