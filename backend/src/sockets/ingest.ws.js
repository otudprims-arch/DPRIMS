// src/sockets/ingest.ws.js
import { WebSocketServer } from 'ws';
import { createAlertFromPayload } from '../services/alerts.service.js';
import {
  setPipelineSocket,
  clearPipelineSocket,
  setPipelineHeartbeat,
  setLatestAlert,
  emitToDashboard,
  sendToDevkit,
} from '../ws-state.js';

function safeJsonParse(message) {
  try {
    return JSON.parse(message.toString());
  } catch {
    return null;
  }
}

function getSeverityRank(severity) {
  const ranks = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  return ranks[severity] || 0;
}

function normalizeAlert(payload) {
  const defect = payload.defect || null;

  const defects = Array.isArray(payload.defects)
    ? payload.defects
    : defect
      ? [{
          class_id: defect.class_id ?? null,
          class_name: defect.type || defect.class_name || 'unknown',
          confidence: defect.confidence ?? null,
          severity: defect.severity || 'low',
          bbox: Array.isArray(defect.bbox) ? defect.bbox : [],
        }]
      : [];

  const highestSeverity = defects.reduce((max, d) => {
    return getSeverityRank(d.severity) > getSeverityRank(max)
      ? d.severity
      : max;
  }, payload.severity || defect?.severity || 'low');

  const primaryDefect =
    defect?.type ||
    defect?.class_name ||
    defects?.[0]?.class_name ||
    'unknown';

  return {
    event_id: payload.event_id || undefined,
    type: payload.type || 'rail_defect',
    timestamp: payload.timestamp || Date.now(),
    train_id: payload.train_id || 'Train01',

    source: payload.source || 'python-ai',
    model: payload.model || 'yolov8',
        model_version: payload.model_version || 'rail_defect_v3',
    camera: payload.camera || payload.defect_camera || payload.defect?.camera || 'front',
    defect_camera:
      payload.defect_camera ||
      payload.defect?.camera ||
      payload.camera ||
      'unknown',

    frame_id: payload.frame_id || null,

    encoder_position_cm: payload.encoder_position_cm ?? payload.raw_payload?.encoder_position_cm ?? 0,

    rear_camera_position_cm: payload.rear_camera_position_cm ?? 0,

    front_camera_position_cm: payload.front_camera_position_cm ?? 0,

    defect_position_cm: payload.defect_position_cm ?? payload.track_position_cm ?? 0,

    track_position_cm: payload.defect_position_cm ?? payload.track_position_cm ?? 0,

    nearest_sleeper: payload.nearest_sleeper || payload.defect?.nearest_sleeper || null,

    nearest_sleeper_center_cm: payload.nearest_sleeper_center_cm ?? null,

    rail_joint_distance_cm: payload.rail_joint_distance_cm ?? null,

    is_on_rail_joint: Boolean(payload.is_on_rail_joint),

    speed_cm_s: payload.speed_cm_s ?? 0,
    direction: payload.direction || 'unknown',

    gps: {
      lat: payload.gps?.lat ?? null,
      lng: payload.gps?.lng ?? null,
      hdop: payload.gps?.hdop ?? null,
    },

    primary_defect: primaryDefect,
    severity: highestSeverity,

    defect: defect || null,
    defects,

    ssim_score: payload.ssim_score ?? null,
    ssim_anomaly_score: payload.ssim_anomaly_score ?? payload.ssim_score ?? null,

    images: payload.images || { front: null, rear: null },

    action: payload.action || (highestSeverity === 'critical' ? 'stop' : 'warn'),

    status: 'new',
    acknowledged: false,

    raw_payload: payload,
  };
}

async function handleAlert(payload) {
  const result = await createAlertFromPayload(payload);
  const saved = result.alert;

  setLatestAlert(saved);

  emitToDashboard(result.duplicate ? 'alert:duplicate' : 'alert:new', saved);

  emitToDashboard('system:event', {
    type: result.duplicate ? 'alert_duplicate_updated' : 'alert_created',
    alert_id: saved._id,
    event_id: saved.event_id,
    severity: saved.severity,
    defect: saved.primary_defect,
    duplicate: result.duplicate,
    repeat_count: saved.repeat_count,
    ts: Date.now(),
  });

  if (
    !result.duplicate &&
    (saved.severity === 'critical' || saved.action === 'stop' || saved.action === 'emergency')
  ) {
    const cmdPayload = {
      cmd: 'emergency',
      reason: 'critical_alert',
      alert_id: saved._id,
      event_id: saved.event_id,
      ts: Date.now(),
    };

    const sent = sendToDevkit(cmdPayload);

    saved.auto_action_taken = sent;
    saved.auto_action = 'emergency';
    saved.auto_action_reason = 'critical_alert';
    await saved.save();

    emitToDashboard('control:auto_action', {
      sent,
      payload: cmdPayload,
      ts: Date.now(),
    });

    console.log('[AUTO SAFETY]', { sent, cmdPayload });
  }

  return result;
}
export function createIngestWSServer() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, req) => {
    console.log(`🧠 Python Pipeline connected from ${req.socket.remoteAddress}`);

    setPipelineSocket(ws, req);

    emitToDashboard('pipeline:status', {
      connected: true,
      at: new Date().toISOString(),
    });

    ws.send(JSON.stringify({
      type: 'hello',
      server: 'dprims-backend',
      path: '/ingest',
      connectedAt: new Date().toISOString(),
    }));

    ws.on('message', async (message) => {
      const payload = safeJsonParse(message);

      if (!payload) {
        ws.send(JSON.stringify({
          ok: false,
          error: 'invalid_json',
          ts: Date.now(),
        }));
        return;
      }

      try {
        if (payload.type === 'pipeline_heartbeat' || payload.type === 'heartbeat') {
          setPipelineHeartbeat(payload);

          emitToDashboard('pipeline:heartbeat', {
            ...payload,
            receivedAt: Date.now(),
          });

          ws.send(JSON.stringify({
            ok: true,
            type: 'heartbeat_ack',
            ts: Date.now(),
          }));

          return;
        }

const result = await handleAlert(payload);
const saved = result.alert;

ws.send(JSON.stringify({
  ok: true,
  type: result.duplicate ? 'alert_duplicate_ack' : 'alert_ack',
  duplicate: result.duplicate,
  event_id: saved.event_id,
  id: saved._id,
  repeat_count: saved.repeat_count,
  ts: Date.now(),
}));

console.log(result.duplicate ? '[INGEST DUPLICATE UPDATED]' : '[INGEST ALERT CREATED]', {
  event_id: saved.event_id,
  defect: saved.primary_defect,
  severity: saved.severity,
  repeat_count: saved.repeat_count,
  priority_score: saved.priority_score,
  zone: saved.track_zone,
});
      } catch (err) {
        console.error('[INGEST ERROR]', err.message);

        ws.send(JSON.stringify({
          ok: false,
          error: err.message,
          ts: Date.now(),
        }));
      }
    });

    ws.on('close', () => {
      console.log('🧠 Python Pipeline disconnected');

      clearPipelineSocket(ws);

      emitToDashboard('pipeline:status', {
        connected: false,
        at: new Date().toISOString(),
      });
    });

    ws.on('error', (err) => {
      console.error('[INGEST WS ERROR]', err.message);
    });
  });

  console.log('✅ Python ingest WebSocket prepared at /ingest');

  return wss;
}