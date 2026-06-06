// src/services/system-events.service.js
import SystemEvent from '../models/SystemEvent.js';

export async function logSystemEvent({
  type,
  severity = 'info',
  source = 'backend',
  title = '',
  message = '',
  entity_type = null,
  entity_id = null,
  metadata = {},
}) {
  try {
    return await SystemEvent.create({
      type,
      severity,
      source,
      title,
      message,
      entity_type,
      entity_id,
      metadata,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[SYSTEM EVENT LOG ERROR]', err.message);
    return null;
  }
}

export async function getSystemTimeline({ limit = 100 } = {}) {
  return SystemEvent.find()
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit || 100), 300));
}