// src/routes/system.routes.js
import { Router } from 'express';
import {
  healthCheck,
  getTimeline,
} from '../controllers/system.controller.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/timeline', getTimeline);

export default router;