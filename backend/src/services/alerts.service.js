// src/services/alerts.service.js
import Alert from '../models/Alert.js';

const SEVERITY_WEIGHT = {
  low: 20,
  medium: 45,
  high: 70,
  critical: 90,
};

const RECOMMENDATIONS = {
  broken_rail: 'Immediate emergency stop and rail replacement required.',
  rail_joint_damage: 'Inspect rail joint immediately and schedule urgent maintenance.',
  missing_bolt: 'Inspect fastening system and replace missing bolt.',
  loose_bolt: 'Tighten or replace bolt assembly.',
  damaged_sleeper: 'Schedule sleeper repair or replacement.',
  ssim_anomaly: 'Review camera anomaly and inspect this track section.',
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeZone(value) {
  if (!value) return 'Unknown';
  return String(value);
}

function getPrimaryDefect(payload = {}) {
  return (
    payload.primary_defect ||
    payload.defect?.type ||
    payload.defect?.class_name ||
    payload.defects?.[0]?.type ||
    payload.defects?.[0]?.class_name ||
    'unknown'
  );
}

function getSeverity(payload = {}) {
  return (
    payload.severity ||
    payload.defect?.severity ||
    payload.defects?.[0]?.severity ||
    'low'
  );
}

function getConfidence(payload = {}) {
  return safeNumber(
    payload.confidence ??
      payload.defect?.confidence ??
      payload.defects?.[0]?.confidence,
    0
  );
}

function getCamera(payload = {}) {
  return (
    payload.defect_camera ||
    payload.defect?.camera ||
    payload.camera ||
    'unknown'
  );
}

function getDetectionSignature(payload = {}) {
  return (
    payload.detection_signature ||
    payload.defect?.detection_signature ||
    payload.raw_payload?.detection_signature ||
    null
  );
}

function getBboxCenterX(payload = {}) {
  return (
    payload.bbox_center_x ??
    payload.defect?.bbox_center_x ??
    payload.raw_payload?.bbox_center_x ??
    null
  );
}

function getBboxCenterY(payload = {}) {
  return (
    payload.bbox_center_y ??
    payload.defect?.bbox_center_y ??
    payload.raw_payload?.bbox_center_y ??
    null
  );
}

function getBboxBucketX(payload = {}) {
  return (
    payload.bbox_bucket_x ??
    payload.defect?.bbox_bucket_x ??
    payload.raw_payload?.bbox_bucket_x ??
    null
  );
}

function getBboxBucketY(payload = {}) {
  return (
    payload.bbox_bucket_y ??
    payload.defect?.bbox_bucket_y ??
    payload.raw_payload?.bbox_bucket_y ??
    null
  );
}

function normalizeDefect(payload = {}) {
  const defect = payload.defect || payload.defects?.[0] || {};

  const type =
    defect.type ||
    defect.class_name ||
    payload.primary_defect ||
    'unknown';

  const camera =
    defect.camera ||
    payload.defect_camera ||
    payload.camera ||
    'unknown';

  const trackPosition = safeNumber(
    defect.track_position_cm ??
      defect.defect_position_cm ??
      payload.defect_position_cm ??
      payload.track_position_cm,
    0
  );

  return {
    type,
    class_name: defect.class_name || type,
    class_id: defect.class_id ?? null,
    confidence: safeNumber(defect.confidence ?? payload.confidence, 0),
    severity: defect.severity || payload.severity || 'low',
    bbox: Array.isArray(defect.bbox) ? defect.bbox : [],
    camera,
    track_position_cm: trackPosition,
    defect_position_cm: trackPosition,
    track_zone: normalizeZone(defect.track_zone || payload.track_zone),
    nearest_sleeper:
      defect.nearest_sleeper ||
      payload.nearest_sleeper ||
      null,

    bbox_center_x:
      defect.bbox_center_x ??
      payload.bbox_center_x ??
      null,

    bbox_center_y:
      defect.bbox_center_y ??
      payload.bbox_center_y ??
      null,

    bbox_bucket_x:
      defect.bbox_bucket_x ??
      payload.bbox_bucket_x ??
      null,

    bbox_bucket_y:
      defect.bbox_bucket_y ??
      payload.bbox_bucket_y ??
      null,

    detection_signature:
      defect.detection_signature ||
      payload.detection_signature ||
      null,
  };
}

function normalizeDefects(payload = {}) {
  const defects = Array.isArray(payload.defects) ? payload.defects : [];

  if (defects.length) {
    return defects.map((d) => ({
      class_id: d.class_id ?? null,
      class_name: d.class_name || d.type || '',
      type: d.type || d.class_name || '',
      confidence: safeNumber(d.confidence, 0),
      severity: d.severity || payload.severity || 'low',
      bbox: Array.isArray(d.bbox) ? d.bbox : [],
      camera: d.camera || payload.defect_camera || payload.camera || 'unknown',
      track_position_cm: safeNumber(
        d.track_position_cm ??
          d.defect_position_cm ??
          payload.defect_position_cm ??
          payload.track_position_cm,
        0
      ),
      defect_position_cm: safeNumber(
        d.defect_position_cm ??
          d.track_position_cm ??
          payload.defect_position_cm ??
          payload.track_position_cm,
        0
      ),
      track_zone: normalizeZone(d.track_zone || payload.track_zone),
      nearest_sleeper: d.nearest_sleeper || payload.nearest_sleeper || null,
      bbox_center_x: d.bbox_center_x ?? payload.bbox_center_x ?? null,
      bbox_center_y: d.bbox_center_y ?? payload.bbox_center_y ?? null,
      bbox_bucket_x: d.bbox_bucket_x ?? payload.bbox_bucket_x ?? null,
      bbox_bucket_y: d.bbox_bucket_y ?? payload.bbox_bucket_y ?? null,
      detection_signature:
        d.detection_signature ||
        payload.detection_signature ||
        null,
    }));
  }

  return [normalizeDefect(payload)];
}

function calculatePriority(payload = {}) {
  const severity = getSeverity(payload);
  const confidence = getConfidence(payload);
  const defectType = getPrimaryDefect(payload);

  let score = SEVERITY_WEIGHT[severity] ?? 20;

  score += Math.round(confidence * 10);

  if (defectType === 'broken_rail') score += 5;
  if (defectType === 'rail_joint_damage') score += 4;
  if (payload.is_on_rail_joint) score += 4;

  return Math.min(score, 100);
}

function normalizeAlertPayload(payload = {}) {
  const primaryDefect = getPrimaryDefect(payload);
  const severity = getSeverity(payload);
  const camera = getCamera(payload);
  const confidence = getConfidence(payload);

  const defect = normalizeDefect(payload);
  const defects = normalizeDefects(payload);

  const encoderPosition = safeNumber(
    payload.encoder_position_cm ??
      payload.raw_payload?.encoder_position_cm,
    0
  );

  const rearCameraPosition = safeNumber(
    payload.rear_camera_position_cm ??
      payload.raw_payload?.rear_camera_position_cm,
    0
  );

  const frontCameraPosition = safeNumber(
    payload.front_camera_position_cm ??
      payload.raw_payload?.front_camera_position_cm,
    0
  );

  const defectPosition = safeNumber(
    payload.defect_position_cm ??
      defect.defect_position_cm ??
      defect.track_position_cm ??
      payload.track_position_cm,
    0
  );

  const nearestSleeper =
    payload.nearest_sleeper ||
    defect.nearest_sleeper ||
    payload.raw_payload?.nearest_sleeper ||
    null;

  const trackZone = normalizeZone(
    payload.track_zone ||
      defect.track_zone ||
      payload.raw_payload?.track_zone
  );

  const detectionSignature = getDetectionSignature(payload);

  const bboxCenterX = getBboxCenterX(payload);
  const bboxCenterY = getBboxCenterY(payload);
  const bboxBucketX = getBboxBucketX(payload);
  const bboxBucketY = getBboxBucketY(payload);

  const eventId =
    payload.event_id ||
    `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  return {
    event_id: eventId,

    type: payload.type || 'rail_defect',
    source: payload.source || 'python-ai',
    model: payload.model || 'yolov8',
    model_version: payload.model_version || 'rail_defect_v3',

    timestamp: payload.timestamp || Date.now(),

    train_id: payload.train_id || 'Train01',
    session_id: payload.session_id || null,
    session_ref: payload.session_ref || null,

    camera,
    defect_camera: camera,

    frame_id: payload.frame_id || null,

    track_position_cm: defectPosition,
    encoder_position_cm: encoderPosition,
    rear_camera_position_cm: rearCameraPosition,
    front_camera_position_cm: frontCameraPosition,
    defect_position_cm: defectPosition,

    nearest_sleeper: nearestSleeper,
    nearest_sleeper_center_cm:
      payload.nearest_sleeper_center_cm ??
      payload.raw_payload?.nearest_sleeper_center_cm ??
      null,

    rail_joint_distance_cm:
      payload.rail_joint_distance_cm ??
      payload.raw_payload?.rail_joint_distance_cm ??
      null,

    is_on_rail_joint: Boolean(
      payload.is_on_rail_joint ??
        payload.raw_payload?.is_on_rail_joint ??
        false
    ),

    track_zone: trackZone,

    speed_cm_s: safeNumber(payload.speed_cm_s, 0),
    direction: payload.direction || 'unknown',

    gps: {
      lat: payload.gps?.lat ?? null,
      lng: payload.gps?.lng ?? null,
      hdop: payload.gps?.hdop ?? null,
    },

    primary_defect: primaryDefect,
    severity,
    confidence,
    priority_score: calculatePriority(payload),

    defect,
    defects,

    bbox_center_x: bboxCenterX,
    bbox_center_y: bboxCenterY,
    bbox_bucket_x: bboxBucketX,
    bbox_bucket_y: bboxBucketY,
    detection_signature: detectionSignature,

    ssim_score: payload.ssim_score ?? null,
    ssim_anomaly_score:
      payload.ssim_anomaly_score ??
      payload.ssim_score ??
      null,

    images: {
      front: payload.images?.front || null,
      rear: payload.images?.rear || null,
    },

    action: payload.action || (severity === 'critical' ? 'stop' : 'warn'),

    auto_action_taken: false,
    auto_action: null,
    auto_action_reason: null,

    status: payload.status || 'new',
    acknowledged: false,
    acknowledged_at: null,
    acknowledged_by: null,
    resolved_at: null,
    resolved_by: null,
    false_positive: false,
    notes: payload.notes || '',

    recommendation:
      payload.recommendation ||
      RECOMMENDATIONS[primaryDefect] ||
      'Inspect this section and validate the detected defect.',

    duplicate_of: null,
    repeat_count: 1,

    raw_payload: payload,

    first_seen_at: new Date(),
    last_seen_at: new Date(),
  };
}

function buildDuplicateFilter(normalized) {
  const base = {
    train_id: normalized.train_id,
    session_id: normalized.session_id || null,
    defect_camera: normalized.defect_camera,
    primary_defect: normalized.primary_defect,
    track_zone: normalized.track_zone,
    status: { $nin: ['resolved', 'false_positive'] },
  };

  if (normalized.detection_signature) {
    return {
      ...base,
      detection_signature: normalized.detection_signature,
    };
  }

  const pos = Number(
    normalized.defect_position_cm ||
      normalized.track_position_cm ||
      0
  );

  return {
    ...base,
    defect_position_cm: {
      $gte: pos - 8,
      $lte: pos + 8,
    },
  };
}

function applyNormalizedToExisting(existing, normalized) {
  existing.repeat_count = (existing.repeat_count || 1) + 1;
  existing.last_seen_at = new Date();

  existing.timestamp = normalized.timestamp;
  existing.priority_score = Math.max(
    existing.priority_score || 0,
    normalized.priority_score || 0
  );

  existing.camera = normalized.camera;
  existing.defect_camera = normalized.defect_camera;

  existing.track_position_cm = normalized.track_position_cm;
  existing.encoder_position_cm = normalized.encoder_position_cm;
  existing.rear_camera_position_cm = normalized.rear_camera_position_cm;
  existing.front_camera_position_cm = normalized.front_camera_position_cm;
  existing.defect_position_cm = normalized.defect_position_cm;

  existing.nearest_sleeper = normalized.nearest_sleeper;
  existing.nearest_sleeper_center_cm = normalized.nearest_sleeper_center_cm;
  existing.rail_joint_distance_cm = normalized.rail_joint_distance_cm;
  existing.is_on_rail_joint = normalized.is_on_rail_joint;
  existing.track_zone = normalized.track_zone;

  existing.primary_defect = normalized.primary_defect;
  existing.severity = normalized.severity;
  existing.confidence = normalized.confidence;

  existing.defect = normalized.defect;
  existing.defects = normalized.defects;

  existing.bbox_center_x = normalized.bbox_center_x;
  existing.bbox_center_y = normalized.bbox_center_y;
  existing.bbox_bucket_x = normalized.bbox_bucket_x;
  existing.bbox_bucket_y = normalized.bbox_bucket_y;
  existing.detection_signature = normalized.detection_signature;

  existing.ssim_score = normalized.ssim_score;
  existing.ssim_anomaly_score = normalized.ssim_anomaly_score;

  existing.images = normalized.images;
  existing.raw_payload = normalized.raw_payload;
}

export async function createAlertFromPayload(payload = {}) {
  const normalized = normalizeAlertPayload(payload);
  const duplicateFilter = buildDuplicateFilter(normalized);

  const existing = await Alert.findOne(duplicateFilter).sort({ createdAt: -1 });

  if (existing) {
    applyNormalizedToExisting(existing, normalized);
    await existing.save();

    return {
      duplicate: true,
      alert: existing,
    };
  }

  const alert = await Alert.create(normalized);

  return {
    duplicate: false,
    alert,
  };
}

export async function getAlertStats() {
  const [
    total,
    open,
    critical,
    bySeverity,
    byType,
    byZone,
    byCamera,
    bySleeper,
    recent,
  ] = await Promise.all([
    Alert.countDocuments({}),
    Alert.countDocuments({
      status: { $nin: ['resolved', 'false_positive'] },
    }),
    Alert.countDocuments({ severity: 'critical' }),

    Alert.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
          avgPriority: { $avg: '$priority_score' },
          maxPriority: { $max: '$priority_score' },
        },
      },
      { $sort: { count: -1 } },
    ]),

    Alert.aggregate([
      {
        $group: {
          _id: '$primary_defect',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$defect.confidence' },
          maxPriority: { $max: '$priority_score' },
        },
      },
      { $sort: { count: -1 } },
    ]),

    Alert.aggregate([
      {
        $group: {
          _id: '$track_zone',
          count: { $sum: 1 },
          criticalCount: {
            $sum: {
              $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0],
            },
          },
          maxPriority: { $max: '$priority_score' },
        },
      },
      { $sort: { count: -1 } },
    ]),

    Alert.aggregate([
      {
        $group: {
          _id: '$defect_camera',
          count: { $sum: 1 },
          criticalCount: {
            $sum: {
              $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]),

    Alert.aggregate([
      {
        $match: {
          nearest_sleeper: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$nearest_sleeper',
          count: { $sum: 1 },
          criticalCount: {
            $sum: {
              $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0],
            },
          },
          maxPriority: { $max: '$priority_score' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),

    Alert.find({}).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  return {
    total,
    open,
    critical,
    bySeverity,
    byType,
    byZone,
    byCamera,
    bySleeper,
    recent,
  };
}

export async function getAlertTimeline() {
  return Alert.aggregate([
    {
      $group: {
        _id: {
          hour: {
            $dateToString: {
              format: '%Y-%m-%d %H:00',
              date: '$createdAt',
            },
          },
        },
        count: { $sum: 1 },
        criticalCount: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { '_id.hour': 1 } },
  ]);
}