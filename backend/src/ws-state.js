// src/ws-state.js

export const state = {
  devkit: {
    socket: null,
    connected: false,
    connectedAt: null,
    disconnectedAt: null,
    remoteAddress: null,
  },

  pipeline: {
    socket: null,
    connected: false,
    connectedAt: null,
    disconnectedAt: null,
    remoteAddress: null,
    lastHeartbeatAt: null,
    lastFps: null,
    model: null,
    device: null,
  },

  telemetry: {
    latest: null,
    updatedAt: null,
    count: 0,
  },

  alerts: {
    latest: null,
    updatedAt: null,
    count: 0,
  },

  socketio: {
    io: null,
    clients: 0,
  },
};

// =========================
// Socket.io
// =========================
export function setIO(io) {
  state.socketio.io = io;
}

export function getIO() {
  return state.socketio.io;
}

export function emitToDashboard(eventName, payload) {
  if (state.socketio.io) {
    state.socketio.io.emit(eventName, payload);
  }
}

// =========================
// DevKit State
// =========================
export function setDevkitSocket(socket, req = null) {
  state.devkit.socket = socket;
  state.devkit.connected = true;
  state.devkit.connectedAt = new Date();
  state.devkit.disconnectedAt = null;
  state.devkit.remoteAddress = req?.socket?.remoteAddress || null;
}

export function clearDevkitSocket(socket) {
  if (state.devkit.socket === socket) {
    state.devkit.socket = null;
    state.devkit.connected = false;
    state.devkit.disconnectedAt = new Date();
  }
}

export function isDevkitConnected() {
  return !!state.devkit.socket && state.devkit.socket.readyState === 1;
}

export function sendToDevkit(payload) {
  if (!isDevkitConnected()) return false;

  state.devkit.socket.send(JSON.stringify(payload));
  return true;
}

// =========================
// Pipeline State
// =========================
export function setPipelineSocket(socket, req = null) {
  state.pipeline.socket = socket;
  state.pipeline.connected = true;
  state.pipeline.connectedAt = new Date();
  state.pipeline.disconnectedAt = null;
  state.pipeline.remoteAddress = req?.socket?.remoteAddress || null;
}

export function clearPipelineSocket(socket) {
  if (state.pipeline.socket === socket) {
    state.pipeline.socket = null;
    state.pipeline.connected = false;
    state.pipeline.disconnectedAt = new Date();
  }
}

export function setPipelineHeartbeat(payload = {}) {
  state.pipeline.lastHeartbeatAt = new Date();
  state.pipeline.lastFps = payload.fps ?? state.pipeline.lastFps;
  state.pipeline.model = payload.model ?? state.pipeline.model;
  state.pipeline.device = payload.device ?? state.pipeline.device;
}

// =========================
// Telemetry
// =========================
export function setLatestTelemetry(data) {
  state.telemetry.latest = data;
  state.telemetry.updatedAt = new Date();
  state.telemetry.count += 1;
}

export function getLatestTelemetry() {
  return state.telemetry.latest;
}

// =========================
// Alerts
// =========================
export function setLatestAlert(alert) {
  state.alerts.latest = alert;
  state.alerts.updatedAt = new Date();
  state.alerts.count += 1;
}

export function getRuntimeState() {
  return {
    devkit: {
      connected: state.devkit.connected,
      connectedAt: state.devkit.connectedAt,
      disconnectedAt: state.devkit.disconnectedAt,
      remoteAddress: state.devkit.remoteAddress,
    },

    pipeline: {
      connected: state.pipeline.connected,
      connectedAt: state.pipeline.connectedAt,
      disconnectedAt: state.pipeline.disconnectedAt,
      remoteAddress: state.pipeline.remoteAddress,
      lastHeartbeatAt: state.pipeline.lastHeartbeatAt,
      lastFps: state.pipeline.lastFps,
      model: state.pipeline.model,
      device: state.pipeline.device,
    },

    telemetry: {
      latest: state.telemetry.latest,
      updatedAt: state.telemetry.updatedAt,
      count: state.telemetry.count,
    },

    alerts: {
      latest: state.alerts.latest,
      updatedAt: state.alerts.updatedAt,
      count: state.alerts.count,
    },

    socketio: {
      clients: state.socketio.clients,
    },
  };
}