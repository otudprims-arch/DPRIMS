// src/controllers/control.controller.js
import {
  sendToDevkit,
  isDevkitConnected,
  emitToDashboard,
} from '../ws-state.js';

import ControlCommand from '../models/ControlCommand.js';
import { logSystemEvent } from '../services/system-events.service.js';

export async function sendControlCommand(req, res) {
  try {
    const {
      trainId = 'Train01',
      action,
      cmd,
      value,
      direction,
      reason = 'manual_dashboard_command',
    } = req.body || {};

    const command = cmd || action;

    if (!command) {
      return res.status(400).json({
        success: false,
        message: 'cmd or action is required',
      });
    }

    const cmdPayload = {
      cmd: command,
      value: value ?? null,
      direction: direction ?? null,
      train_id: trainId,
      source: 'api-control',
      reason,
      ts: Date.now(),
    };

    const connected = isDevkitConnected();
    const sent = sendToDevkit(cmdPayload);

    const commandLog = await ControlCommand.create({
      train_id: trainId,
      command,
      value: value ?? null,
      direction: direction ?? null,
      source: 'api-control',
      reason,
      devkit_connected: connected,
      ack: sent,
      status: sent ? 'sent' : 'failed',
      sent_at: new Date(),
      raw_payload: cmdPayload,
    });

    await logSystemEvent({
      type: sent ? 'control_command_sent' : 'control_command_failed',
      severity: sent ? 'info' : 'warning',
      source: 'api-control',
      title: sent ? 'Control command sent' : 'Control command failed',
      message: `Command ${command} ${sent ? 'sent to DevKit' : 'failed because DevKit is offline'}`,
      entity_type: 'ControlCommand',
      entity_id: commandLog._id.toString(),
      metadata: {
        command,
        ack: sent,
        devkit_connected: connected,
      },
    });

    const responseData = {
      id: commandLog._id,
      trainId,
      command,
      value: value ?? null,
      direction: direction ?? null,
      devkit_connected: connected,
      ack: sent,
      ts: Date.now(),
    };

    emitToDashboard('control:sent', responseData);

    console.log('[CONTROL -> DEVKIT]', responseData);

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (err) {
    console.error('[CONTROL ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'control error',
      error: err.message,
    });
  }
}

export async function getControlHistory(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const data = await ControlCommand.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'failed to fetch control history',
      error: err.message,
    });
  }
}