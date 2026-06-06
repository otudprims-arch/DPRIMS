// src/models/Alert.js
import mongoose from 'mongoose';

const BBoxSchema = {
  type: [Number],
  default: [],
  validate: {
    validator: (arr) => Array.isArray(arr) && (arr.length === 0 || arr.length === 4),
    message: 'bbox must be [x1, y1, x2, y2]',
  },
};

const DefectSchema = new mongoose.Schema(
  {
    class_id: { type: Number, default: null },

    class_name: {
      type: String,
      default: 'unknown',
      index: true,
    },

    type: {
      type: String,
      default: 'unknown',
      index: true,
    },

    confidence: {
      type: Number,
      default: 0,
    },

    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true,
    },

    bbox: BBoxSchema,

    camera: {
      type: String,
      enum: ['front', 'rear', 'dual', 'unknown'],
      default: 'unknown',
    },

    track_position_cm: {
      type: Number,
      default: 0,
    },

    defect_position_cm: {
      type: Number,
      default: 0,
    },

    track_zone: {
      type: String,
      default: 'Unknown',
    },

    nearest_sleeper: {
      type: String,
      default: null,
    },

    bbox_center_x: {
      type: Number,
      default: null,
    },

    bbox_center_y: {
      type: Number,
      default: null,
    },

    bbox_bucket_x: {
      type: Number,
      default: null,
    },

    bbox_bucket_y: {
      type: Number,
      default: null,
    },

    detection_signature: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const AlertSchema = new mongoose.Schema(
  {
    event_id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    type: {
      type: String,
      default: 'rail_defect',
      index: true,
    },

    source: {
      type: String,
      default: 'python-ai',
      index: true,
    },

    model: {
      type: String,
      default: 'yolov8',
    },

    model_version: {
      type: String,
      default: 'rail_defect_v3',
    },

    timestamp: {
      type: Number,
      default: () => Date.now(),
      index: true,
    },

    train_id: {
      type: String,
      default: 'Train01',
      index: true,
    },

    session_id: {
      type: String,
      default: null,
      index: true,
    },

    session_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InspectionSession',
      default: null,
      index: true,
    },

    camera: {
      type: String,
      enum: ['front', 'rear', 'dual', 'unknown'],
      default: 'unknown',
      index: true,
    },

    defect_camera: {
      type: String,
      enum: ['front', 'rear', 'dual', 'unknown'],
      default: 'unknown',
      index: true,
    },

    frame_id: {
      type: String,
      default: null,
    },

    track_position_cm: {
      type: Number,
      default: 0,
      index: true,
    },

    encoder_position_cm: {
      type: Number,
      default: 0,
      index: true,
    },

    rear_camera_position_cm: {
      type: Number,
      default: 0,
    },

    front_camera_position_cm: {
      type: Number,
      default: 0,
    },

    defect_position_cm: {
      type: Number,
      default: 0,
      index: true,
    },

    nearest_sleeper: {
      type: String,
      default: null,
      index: true,
    },

    nearest_sleeper_center_cm: {
      type: Number,
      default: null,
    },

    rail_joint_distance_cm: {
      type: Number,
      default: null,
    },

    is_on_rail_joint: {
      type: Boolean,
      default: false,
      index: true,
    },

    track_zone: {
      type: String,
      default: 'Unknown',
      index: true,
    },

    speed_cm_s: {
      type: Number,
      default: 0,
    },

    direction: {
      type: String,
      default: 'unknown',
    },

    gps: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      hdop: { type: Number, default: null },
    },

    primary_defect: {
      type: String,
      default: 'unknown',
      index: true,
    },

    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true,
    },

    confidence: {
      type: Number,
      default: 0,
    },

    priority_score: {
      type: Number,
      default: 0,
      index: true,
    },

    defect: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    defects: {
      type: [DefectSchema],
      default: [],
    },

    bbox_center_x: {
      type: Number,
      default: null,
    },

    bbox_center_y: {
      type: Number,
      default: null,
    },

    bbox_bucket_x: {
      type: Number,
      default: null,
      index: true,
    },

    bbox_bucket_y: {
      type: Number,
      default: null,
      index: true,
    },

    detection_signature: {
      type: String,
      default: null,
      index: true,
    },

    ssim_score: {
      type: Number,
      default: null,
    },

    ssim_anomaly_score: {
      type: Number,
      default: null,
    },

    images: {
      front: { type: String, default: null },
      rear: { type: String, default: null },
    },

    action: {
      type: String,
      enum: ['none', 'warn', 'stop', 'emergency'],
      default: 'warn',
    },

    auto_action_taken: {
      type: Boolean,
      default: false,
    },

    auto_action: {
      type: String,
      default: null,
    },

    auto_action_reason: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ['new', 'acknowledged', 'under_review', 'resolved', 'ignored', 'false_positive'],
      default: 'new',
      index: true,
    },

    acknowledged: {
      type: Boolean,
      default: false,
    },

    acknowledged_at: {
      type: Date,
      default: null,
    },

    acknowledged_by: {
      type: String,
      default: null,
    },

    resolved_at: {
      type: Date,
      default: null,
    },

    resolved_by: {
      type: String,
      default: null,
    },

    false_positive: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      default: '',
    },

    recommendation: {
      type: String,
      default: '',
    },

    duplicate_of: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      default: null,
      index: true,
    },

    repeat_count: {
      type: Number,
      default: 1,
    },

    first_seen_at: {
      type: Date,
      default: () => new Date(),
    },

    last_seen_at: {
      type: Date,
      default: () => new Date(),
    },

    raw_payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AlertSchema.index({ primary_defect: 1, track_position_cm: 1, createdAt: -1 });
AlertSchema.index({ severity: 1, status: 1, createdAt: -1 });
AlertSchema.index({ track_zone: 1, severity: 1 });
AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ session_id: 1, createdAt: -1 });
AlertSchema.index({ defect_camera: 1, primary_defect: 1, nearest_sleeper: 1 });
AlertSchema.index({ defect_position_cm: 1, primary_defect: 1 });
AlertSchema.index({ nearest_sleeper: 1, severity: 1 });
AlertSchema.index({ is_on_rail_joint: 1, severity: 1 });

AlertSchema.index({
  train_id: 1,
  defect_camera: 1,
  primary_defect: 1,
  track_zone: 1,
  detection_signature: 1,
});

AlertSchema.index({
  train_id: 1,
  defect_camera: 1,
  primary_defect: 1,
  defect_position_cm: 1,
});

export default mongoose.model('Alert', AlertSchema);