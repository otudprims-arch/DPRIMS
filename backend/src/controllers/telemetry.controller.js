// src/controllers/telemetry.controller.js
import {
  getLatestTelemetry as getLatestTelemetryState,
  getRuntimeState,
} from '../ws-state.js';

import Telemetry from '../models/Telemetry.js';

export function getLatestTelemetry(req, res) {
  return res.status(200).json({
    success: true,
    data: getLatestTelemetryState(),
  });
}

export function getTelemetryState(req, res) {
  const runtime = getRuntimeState();

  return res.status(200).json({
    success: true,
    data: {
      latest: runtime.telemetry.latest,
      updatedAt: runtime.telemetry.updatedAt,
      count: runtime.telemetry.count,
      devkit_connected: runtime.devkit.connected,
    },
  });
}

export async function getTelemetryHistory(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);

    const data = await Telemetry.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'failed to fetch telemetry history',
      error: err.message,
    });
  }
}