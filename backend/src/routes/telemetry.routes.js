// src/routes/telemetry.routes.js
import { Router } from 'express';
import {
  getLatestTelemetry,
  getTelemetryState,
  getTelemetryHistory,
} from '../controllers/telemetry.controller.js';

const router = Router();

router.get('/latest', getLatestTelemetry);
router.get('/state', getTelemetryState);
router.get('/history', getTelemetryHistory);

export default router;