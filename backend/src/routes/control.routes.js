// src/routes/control.routes.js
import { Router } from 'express';
import {
  sendControlCommand,
  getControlHistory,
} from '../controllers/control.controller.js';

const router = Router();

router.get('/history', getControlHistory);
router.post('/', sendControlCommand);

export default router;