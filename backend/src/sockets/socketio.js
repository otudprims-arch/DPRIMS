// src/sockets/socketio.js
import { Server } from 'socket.io';
import {
  setIO,
  state,
  getRuntimeState,
  sendToDevkit,
  emitToDashboard,
} from '../ws-state.js';

export function createSocketIOServer(server, env) {
  const io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  setIO(io);

  io.on('connection', (socket) => {
    state.socketio.clients += 1;

    console.log(`🖥️ Dashboard connected: ${socket.id}`);

    socket.emit('system:state', getRuntimeState());

    socket.on('control:command', (payload = {}) => {
      const cmdPayload = {
        cmd: payload.cmd || payload.action,
        value: payload.value ?? null,
        train_id: payload.train_id || 'Train01',
        source: 'dashboard-socketio',
        ts: Date.now(),
      };

      const sent = sendToDevkit(cmdPayload);

      socket.emit('control:ack', {
        ok: sent,
        payload: cmdPayload,
        ts: Date.now(),
      });

      emitToDashboard('control:sent', {
        ok: sent,
        payload: cmdPayload,
        ts: Date.now(),
      });

      console.log('[SOCKET.IO CONTROL]', { sent, cmdPayload });
    });

    socket.on('disconnect', () => {
      state.socketio.clients = Math.max(0, state.socketio.clients - 1);
      console.log(`🖥️ Dashboard disconnected: ${socket.id}`);
    });
  });

  console.log('✅ Socket.io dashboard server ready');

  return io;
}