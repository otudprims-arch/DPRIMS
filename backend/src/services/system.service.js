// src/services/system.service.js
import mongoose from 'mongoose';
import { getRuntimeState } from '../ws-state.js';

export function getSystemHealth() {
  const runtime = getRuntimeState();

  return {
    status: 'ok',
    service: 'dprims-backend',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',

    realtime: {
      devkit_connected: runtime.devkit.connected,
      pipeline_connected: runtime.pipeline.connected,
      dashboard_clients: runtime.socketio.clients,
    },

    telemetry: {
      received_count: runtime.telemetry.count,
      updated_at: runtime.telemetry.updatedAt,
      latest: runtime.telemetry.latest,
    },

    alerts: {
      received_count: runtime.alerts.count,
      updated_at: runtime.alerts.updatedAt,
      latest: runtime.alerts.latest,
    },

    pipeline: runtime.pipeline,
    devkit: runtime.devkit,
  };
}