// src/controllers/sessions.controller.js
import crypto from 'crypto';
import InspectionSession from '../models/InspectionSession.js';
import Alert from '../models/Alert.js';
import Telemetry from '../models/Telemetry.js';
import { logSystemEvent } from '../services/system-events.service.js';

function createSessionId() {
  return `session_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

export async function startSession(req, res) {
  try {
    const running = await InspectionSession.findOne({ status: 'running' });

    if (running) {
      return res.status(200).json({
        success: true,
        message: 'Session already running',
        data: running,
      });
    }

    const latestTelemetry = await Telemetry.findOne().sort({ createdAt: -1 });

    const session = await InspectionSession.create({
      session_id: createSessionId(),
      train_id: req.body?.train_id || 'Train01',
      status: 'running',
      started_at: new Date(),
      start_position_cm: latestTelemetry?.track_position_cm || 0,
      notes: req.body?.notes || '',
    });

    await logSystemEvent({
      type: 'inspection_session_started',
      severity: 'info',
      source: 'backend',
      title: 'Inspection session started',
      message: `Inspection session ${session.session_id} started`,
      entity_type: 'InspectionSession',
      entity_id: session._id.toString(),
    });

    return res.status(201).json({
      success: true,
      data: session,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'failed to start session',
      error: err.message,
    });
  }
}

export async function endSession(req, res) {
  try {
    const session = await InspectionSession.findOne({ status: 'running' }).sort({ createdAt: -1 });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No running session found',
      });
    }

    const latestTelemetry = await Telemetry.findOne().sort({ createdAt: -1 });

    const startedAt = session.started_at;
    const endedAt = new Date();

const alertsFilter = {
  $or: [
    { session_ref: session._id },
    { session_id: session.session_id },
    {
      createdAt: {
        $gte: startedAt,
        $lte: endedAt,
      },
    },
  ],
};

const alertsCount = await Alert.countDocuments(alertsFilter);

const criticalCount = await Alert.countDocuments({
  ...alertsFilter,
  severity: 'critical',
});

    session.status = 'completed';
    session.ended_at = endedAt;
    session.duration_sec = Math.round((endedAt - startedAt) / 1000);
    session.end_position_cm = latestTelemetry?.track_position_cm || session.start_position_cm;
    session.total_distance_cm = Math.max(
      0,
      session.end_position_cm - session.start_position_cm
    );
    session.alerts_count = alertsCount;
    session.critical_count = criticalCount;
    session.summary = {
      alerts_count: alertsCount,
      critical_count: criticalCount,
      completed_at: endedAt,
    };

    await session.save();

    await logSystemEvent({
      type: 'inspection_session_completed',
      severity: 'info',
      source: 'backend',
      title: 'Inspection session completed',
      message: `Inspection session ${session.session_id} completed`,
      entity_type: 'InspectionSession',
      entity_id: session._id.toString(),
      metadata: {
        alertsCount,
        criticalCount,
        durationSec: session.duration_sec,
      },
    });

    return res.json({
      success: true,
      data: session,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'failed to end session',
      error: err.message,
    });
  }
}

export async function getCurrentSession(req, res) {
  try {
    const session = await InspectionSession.findOne({ status: 'running' }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: session,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'failed to fetch current session',
      error: err.message,
    });
  }
}

export async function getSessions(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const sessions = await InspectionSession.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'failed to fetch sessions',
      error: err.message,
    });
  }
}
export async function getSessionSummary(req, res) {
  try {
    const session = await InspectionSession.findOne({
      session_id: req.params.sessionId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const alerts = await Alert.find({
      $or: [
        { session_ref: session._id },
        { session_id: session.session_id },
      ],
    }).sort({ createdAt: -1 });

    const bySeverity = await Alert.aggregate([
      {
        $match: {
          $or: [
            { session_ref: session._id },
            { session_id: session.session_id },
          ],
        },
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
          maxPriority: { $max: '$priority_score' },
        },
      },
    ]);

    const byType = await Alert.aggregate([
      {
        $match: {
          $or: [
            { session_ref: session._id },
            { session_id: session.session_id },
          ],
        },
      },
      {
        $group: {
          _id: '$primary_defect',
          count: { $sum: 1 },
          maxPriority: { $max: '$priority_score' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return res.json({
      success: true,
      data: {
        session,
        alerts,
        stats: {
          total_alerts: alerts.length,
          critical_alerts: alerts.filter((a) => a.severity === 'critical').length,
          bySeverity,
          byType,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'failed to fetch session summary',
      error: err.message,
    });
  }
}