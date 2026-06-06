// src/routes/index.js
import { Router } from 'express';

import systemRoutes from './system.routes.js';
import controlRoutes from './control.routes.js';
import telemetryRoutes from './telemetry.routes.js';
import alertsRoutes from './alerts.routes.js';
import sessionsRoutes from './sessions.routes.js';
import faultsRoutes from './faults.routes.js';
import eventsRoutes from './events.routes.js';

const router = Router();

router.use('/system', systemRoutes);
router.use('/control', controlRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/alerts', alertsRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/faults', faultsRoutes);
router.use('/events', eventsRoutes);

export default router;