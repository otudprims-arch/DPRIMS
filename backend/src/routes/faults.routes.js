// src/routes/faults.routes.js
import { Router } from 'express';

import {
  getFaults,
  getFaultById,
  assignFault,
  startRepairFault,
  markRepairedFault,
  verifyFault,
  closeFault,
  rejectFault,
  getFaultStats,
} from '../controllers/faults.controller.js';

const router = Router();

router.get('/stats', getFaultStats);
router.get('/', getFaults);
router.get('/:id', getFaultById);

router.patch('/:id/assign', assignFault);
router.patch('/:id/start-repair', startRepairFault);
router.patch('/:id/repaired', markRepairedFault);
router.patch('/:id/verify', verifyFault);
router.patch('/:id/close', closeFault);
router.patch('/:id/reject', rejectFault);

export default router;