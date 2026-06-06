// src/services/control.service.js
import * as wsState from '../ws-state.js';

/**
 * Get current DevKit WebSocket safely.
 * This supports different ws-state export styles:
 * - getDevkitSocket()
 * - devkitSocket
 * - state.devkitSocket
 */
function getDevkitSocketSafe() {
  if (typeof wsState.getDevkitSocket === 'function') {
    return wsState.getDevkitSocket();
  }

  if (wsState.devkitSocket) {
    return wsState.devkitSocket;
  }

  if (wsState.state?.devkitSocket) {
    return wsState.state.devkitSocket;
  }

  if (wsState.realtimeState?.devkitSocket) {
    return wsState.realtimeState.devkitSocket;
  }

  return null;
}

export async function sendControlCommandToDevkit(payload = {}) {
  const ws = getDevkitSocketSafe();

  const cmdPayload = {
    cmd: payload.cmd || payload.action || 'stop',
    action: payload.action || payload.cmd || 'stop',
    value: payload.value ?? null,
    direction: payload.direction ?? null,
    train_id: payload.train_id || payload.trainId || 'Train01',
    reason: payload.reason || null,
    alert_id: payload.alert_id || null,
    event_id: payload.event_id || null,
    ts: payload.ts || Date.now(),
  };

  const isConnected = Boolean(ws && ws.readyState === 1);

  if (!isConnected) {
    return {
      sent: false,
      reason: 'devkit_not_connected',
      cmdPayload,
    };
  }

  try {
    ws.send(JSON.stringify(cmdPayload));

    return {
      sent: true,
      reason: 'sent_to_devkit',
      cmdPayload,
    };
  } catch (err) {
    return {
      sent: false,
      reason: err.message || 'send_failed',
      cmdPayload,
    };
  }
}