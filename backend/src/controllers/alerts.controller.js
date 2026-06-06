// src/controllers/alerts.controller.js
import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import {
  createAlertFromPayload,
  getAlertStats,
  getAlertTimeline,
} from '../services/alerts.service.js';
import Fault from '../models/Fault.js';
/**
 * Build MongoDB filter for alerts list.
 * Supported query params:
 * - severity=critical|high|medium|low
 * - status=new|acknowledged|under_review|resolved|ignored|false_positive
 * - type=missing_bolt|loose_bolt|broken_rail|damaged_sleeper|rail_joint_damage
 * - zone=Zone A|Zone B|Rail Joint Zone
 * - camera=front|rear|dual
 * - sleeper=S1|S2|...
 * - railJoint=true|false
 * - session_id=session_xxx
 * - train_id=Train01
 * - minPriority=60
 * - maxPriority=90
 * - from=2026-05-24T00:00:00.000Z
 * - to=2026-05-25T00:00:00.000Z
 */
function buildAlertsFilter(query = {}) {
  const filter = {};

  if (query.severity) {
    filter.severity = String(query.severity);
  }

  if (query.status) {
    filter.status = String(query.status);
  }

  if (query.zone) {
    filter.track_zone = String(query.zone);
  }

  if (query.train_id) {
    filter.train_id = String(query.train_id);
  }

  if (query.session_id) {
    filter.session_id = String(query.session_id);
  }

  if (query.sleeper) {
    filter.nearest_sleeper = String(query.sleeper);
  }

  if (query.railJoint === 'true') {
    filter.is_on_rail_joint = true;
  }

  if (query.railJoint === 'false') {
    filter.is_on_rail_joint = false;
  }

  if (query.camera) {
    const camera = String(query.camera);

    // بنفلتر على defect_camera الجديد، ومعاه fallback للـ camera القديم
    filter.$or = [
      { defect_camera: camera },
      { camera },
      { 'defect.camera': camera },
    ];
  }

  if (query.type) {
    const defectType = String(query.type);

    const typeConditions = [
      { primary_defect: defectType },
      { 'defect.type': defectType },
      { 'defect.class_name': defectType },
      { 'defects.type': defectType },
      { 'defects.class_name': defectType },
    ];

    if (filter.$or) {
      filter.$and = [
        { $or: filter.$or },
        { $or: typeConditions },
      ];
      delete filter.$or;
    } else {
      filter.$or = typeConditions;
    }
  }

  const minPriority = Number(query.minPriority);
  const maxPriority = Number(query.maxPriority);

  if (!Number.isNaN(minPriority) || !Number.isNaN(maxPriority)) {
    filter.priority_score = {};

    if (!Number.isNaN(minPriority)) {
      filter.priority_score.$gte = minPriority;
    }

    if (!Number.isNaN(maxPriority)) {
      filter.priority_score.$lte = maxPriority;
    }
  }

  if (query.from || query.to) {
    filter.createdAt = {};

    if (query.from) {
      const fromDate = new Date(query.from);
      if (!Number.isNaN(fromDate.getTime())) {
        filter.createdAt.$gte = fromDate;
      }
    }

    if (query.to) {
      const toDate = new Date(query.to);
      if (!Number.isNaN(toDate.getTime())) {
        filter.createdAt.$lte = toDate;
      }
    }

    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt;
    }
  }

  return filter;
}

function getSort(sortBy = 'createdAt', order = 'desc') {
  const allowedSortFields = new Set([
    'createdAt',
    'updatedAt',
    'timestamp',
    'severity',
    'priority_score',
    'track_position_cm',
    'defect_position_cm',
    'repeat_count',
    'last_seen_at',
  ]);

  const field = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';
  const direction = order === 'asc' ? 1 : -1;

  return { [field]: direction };
}

function getPagination(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit || 50), 1), 200);
  const page = Math.max(Number(query.page || 1), 1);
  const skip = (page - 1) * limit;

  return { limit, page, skip };
}

export async function createAlert(req, res) {
  try {
    const result = await createAlertFromPayload(req.body || {});

    return res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: result.duplicate,
      message: result.duplicate
        ? 'Duplicate alert updated'
        : 'Alert stored successfully',
      data: result.alert,
    });
  } catch (err) {
    console.error('[CREATE ALERT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to store alert',
      error: err.message,
    });
  }
}

export async function getAlerts(req, res) {
  try {
    const { limit, page, skip } = getPagination(req.query);
    const filter = buildAlertsFilter(req.query);
    const sort = getSort(req.query.sortBy, req.query.order);

    const [items, total] = await Promise.all([
      Alert.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      filter,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      data: items,
    });
  } catch (err) {
    console.error('[GET ALERTS ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to fetch alerts',
      error: err.message,
    });
  }
}

export async function getAlertById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert id',
      });
    }

    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    return res.json({
      success: true,
      data: alert,
    });
  } catch (err) {
    console.error('[GET ALERT BY ID ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to fetch alert',
      error: err.message,
    });
  }
}

export async function acknowledgeAlert(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert id',
      });
    }

    const alert = await Alert.findByIdAndUpdate(
      id,
      {
        status: 'acknowledged',
        acknowledged: true,
        acknowledged_at: new Date(),
        acknowledged_by: req.body?.by || 'operator',
        notes: req.body?.notes || '',
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    return res.json({
      success: true,
      message: 'Alert acknowledged',
      data: alert,
    });
  } catch (err) {
    console.error('[ACK ALERT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to acknowledge alert',
      error: err.message,
    });
  }
}

export async function resolveAlert(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert id',
      });
    }

    const alert = await Alert.findByIdAndUpdate(
      id,
      {
        status: 'resolved',
        resolved_at: new Date(),
        resolved_by: req.body?.by || 'operator',
        notes: req.body?.notes || '',
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    return res.json({
      success: true,
      message: 'Alert resolved',
      data: alert,
    });
  } catch (err) {
    console.error('[RESOLVE ALERT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to resolve alert',
      error: err.message,
    });
  }
}

export async function markFalsePositive(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert id',
      });
    }

    const alert = await Alert.findByIdAndUpdate(
      id,
      {
        status: 'false_positive',
        false_positive: true,
        resolved_at: new Date(),
        resolved_by: req.body?.by || 'operator',
        notes: req.body?.notes || 'Marked as false positive',
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    return res.json({
      success: true,
      message: 'Alert marked as false positive',
      data: alert,
    });
  } catch (err) {
    console.error('[FALSE POSITIVE ALERT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to mark false positive',
      error: err.message,
    });
  }
}

export async function getStats(req, res) {
  try {
    const stats = await getAlertStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('[GET ALERT STATS ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to fetch stats',
      error: err.message,
    });
  }
}

export async function getTimeline(req, res) {
  try {
    const timeline = await getAlertTimeline();

    return res.json({
      success: true,
      data: timeline,
    });
  } catch (err) {
    console.error('[GET ALERT TIMELINE ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to fetch timeline',
      error: err.message,
    });
  }
}
export async function confirmFaultFromAlert(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert id',
      });
    }

    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    const existingFault = await Fault.findOne({ alert_ref: alert._id });

    if (existingFault) {
      return res.status(200).json({
        success: true,
        message: 'Fault already exists for this alert',
        data: existingFault,
      });
    }

    const faultId = `FAULT-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2, 6)
      .toUpperCase()}`;

    const defect = alert.defect || alert.defects?.[0] || {};

    const fault = await Fault.create({
      fault_id: faultId,

      alert_ref: alert._id,
      alert_event_id: alert.event_id,

      train_id: alert.train_id,
      session_id: alert.session_id || null,
      session_ref: alert.session_ref || null,

      defect_type: alert.primary_defect || defect.type || defect.class_name || 'unknown',
      severity: alert.severity || defect.severity || 'medium',
      priority_score: alert.priority_score || 0,

      status: 'confirmed',

      camera: alert.defect_camera || alert.camera || defect.camera || 'unknown',

      defect_position_cm:
        alert.defect_position_cm ??
        alert.track_position_cm ??
        defect.track_position_cm ??
        0,

      encoder_position_cm: alert.encoder_position_cm ?? 0,

      nearest_sleeper:
        alert.nearest_sleeper ||
        defect.nearest_sleeper ||
        null,

      nearest_sleeper_center_cm: alert.nearest_sleeper_center_cm ?? null,
      rail_joint_distance_cm: alert.rail_joint_distance_cm ?? null,
      is_on_rail_joint: Boolean(alert.is_on_rail_joint),

      track_zone: alert.track_zone || defect.track_zone || 'unknown',

      bbox: defect.bbox || alert.defects?.[0]?.bbox || [],
      confidence: defect.confidence ?? alert.defects?.[0]?.confidence ?? 0,

      recommendation: alert.recommendation || '',

      confirmed_by: req.body?.by || 'operator',

      before_images: {
        front: alert.images?.front || null,
        rear: alert.images?.rear || null,
      },

      repair_notes: req.body?.notes || '',

      history: [
        {
          action: 'confirm_fault',
          by: req.body?.by || 'operator',
          notes: req.body?.notes || 'Confirmed from alert',
          from_status: null,
          to_status: 'confirmed',
          at: new Date(),
        },
      ],
    });

    alert.status = 'under_review';
    alert.acknowledged = true;
    alert.acknowledged_at = new Date();
    alert.acknowledged_by = req.body?.by || 'operator';
    alert.notes = req.body?.notes || alert.notes || 'Confirmed as fault';

    await alert.save();

    return res.status(201).json({
      success: true,
      message: 'Fault confirmed from alert',
      data: fault,
    });
  } catch (err) {
    console.error('[CONFIRM FAULT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to confirm fault',
      error: err.message,
    });
  }
}