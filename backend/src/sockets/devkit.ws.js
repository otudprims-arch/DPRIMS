// src/sockets/devkit.ws.js
import { WebSocketServer } from 'ws';
import {
  setDevkitSocket,
  clearDevkitSocket,
  setLatestTelemetry,
  emitToDashboard,
} from '../ws-state.js';

import Telemetry from '../models/Telemetry.js';
import { logSystemEvent } from '../services/system-events.service.js';

let lastTelemetrySaveAt = 0;

function safeJsonParse(message) {
  try {
    return JSON.parse(message.toString());
  } catch {
    return null;
  }
}

async function saveTelemetryIfNeeded(data) {
  const now = Date.now();

  // نخزن telemetry كل ثانيتين فقط عشان الداتابيز ما تتملاش بسرعة
  if (now - lastTelemetrySaveAt < 2000) return;

  lastTelemetrySaveAt = now;

await Telemetry.create({
  train_id: data.train_id || 'Train01',
  timestamp: data.ts || now,

  pulse_count: data.encoder_count || data.pulse_count || 0,
  distance_per_pulse_cm: data.cm_per_pulse || data.distance_per_pulse_cm || 0,

  track_position_cm: data.track_position_cm || 0,
  official_position_cm: data.official_position_cm || data.track_position_cm || 0,

  rear_wheel_cm: data.rear_wheel_cm || 0,
  front_wheel_cm: data.front_wheel_cm || 0,
  encoder_distance_cm: data.encoder_distance_cm || 0,

  speed_rpm: data.speed_rpm || 0,
  speed_cm_s: data.speed_cm_s || 0,
  speed_pct: data.speed_pct || 0,

  running: !!data.running,
  auto: !!data.auto,
  auto_state: data.auto_state || 'off',
  direction: data.direction || 'stop',

  nearest_sleeper: data.nearest_sleeper || null,
  track_zone: data.track_zone || 'Unknown',
  is_on_rail_joint: !!data.is_on_rail_joint,

  wifi_rssi: data.wifi_rssi ?? null,
  raw_payload: data,
});
}

export function createDevkitWSServer() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws, req) => {
    console.log(`⚡ DevKit connected from ${req.socket.remoteAddress}`);

    setDevkitSocket(ws, req);

    await logSystemEvent({
      type: 'devkit_connected',
      severity: 'info',
      source: 'devkit',
      title: 'DevKit connected',
      message: `ESP32 DevKit connected from ${req.socket.remoteAddress}`,
      metadata: {
        remoteAddress: req.socket.remoteAddress,
      },
    });

    emitToDashboard('devkit:status', {
      connected: true,
      at: new Date().toISOString(),
    });

    ws.send(JSON.stringify({
      type: 'hello',
      server: 'dprims-backend',
      path: '/devkit',
      connectedAt: new Date().toISOString(),
    }));

    ws.on('message', async (message) => {
      const data = safeJsonParse(message);

      if (!data) {
        console.warn('[DEVKIT] invalid JSON message');
        return;
      }

      if (data.type === 'telemetry') {
        setLatestTelemetry(data);
        emitToDashboard('telemetry:update', data);

        try {
          await saveTelemetryIfNeeded(data);
        } catch (err) {
          console.error('[TELEMETRY SAVE ERROR]', err.message);
        }

        if (Math.random() < 0.02) {
          console.log('[TELEMETRY]', {
            train_id: data.train_id,
            pos: data.track_position_cm,
            speed: data.speed_cm_s,
            running: data.running,
          });
        }

        return;
      }

      console.log('[DEVKIT MESSAGE]', data);
      emitToDashboard('devkit:message', data);
    });

    ws.on('close', async () => {
      console.log('🔌 DevKit disconnected');

      clearDevkitSocket(ws);

      await logSystemEvent({
        type: 'devkit_disconnected',
        severity: 'warning',
        source: 'devkit',
        title: 'DevKit disconnected',
        message: 'ESP32 DevKit WebSocket disconnected',
      });

      emitToDashboard('devkit:status', {
        connected: false,
        at: new Date().toISOString(),
      });
    });

    ws.on('error', (err) => {
      console.error('[DEVKIT WS ERROR]', err.message);
    });
  });

  console.log('✅ DevKit WebSocket prepared at /devkit');

  return wss;
}