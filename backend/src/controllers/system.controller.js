// src/controllers/system.controller.js
import { getSystemHealth } from '../services/system.service.js';
import { getSystemTimeline } from '../services/system-events.service.js';

export function healthCheck(req, res) {
  const data = getSystemHealth();

  res.status(200).json({
    success: true,
    data,
  });
}

export async function getTimeline(req, res) {
  try {
    const limit = Number(req.query.limit || 100);

    const data = await getSystemTimeline({ limit });

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'failed to fetch system timeline',
      error: err.message,
    });
  }
}