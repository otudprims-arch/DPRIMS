// src/routes/sessions.routes.js
import { Router } from 'express';
import {
  startSession,
  endSession,
  getCurrentSession,
  getSessions,
  getSessionSummary,
} from '../controllers/sessions.controller.js';

const router = Router();

router.post('/start', startSession);
router.post('/end', endSession);
router.get('/current', getCurrentSession);
router.get('/', getSessions);
router.get('/:sessionId/summary', getSessionSummary);

export default router;