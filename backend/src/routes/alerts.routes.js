// src/routes/alerts.routes.js
import { Router } from 'express';

import {
  createAlert,
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  markFalsePositive,
  getStats,
  getTimeline,
  confirmFaultFromAlert,
} from '../controllers/alerts.controller.js';

const router = Router();

router.get('/stats', getStats);
router.get('/timeline', getTimeline);

router.post('/', createAlert);
router.get('/', getAlerts);
router.get('/:id', getAlertById);

router.patch('/:id/ack', acknowledgeAlert);
router.patch('/:id/resolve', resolveAlert);
router.patch('/:id/false-positive', markFalsePositive);

router.post('/:id/confirm-fault', confirmFaultFromAlert);

export default router;