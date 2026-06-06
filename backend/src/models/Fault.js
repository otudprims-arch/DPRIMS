// src/models/Fault.js
import mongoose from 'mongoose';

const FaultSchema = new mongoose.Schema(
  {
    fault_id: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },

    alert_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      required: true,
      index: true,
    },

    alert_event_id: {
      type: String,
      default: null,
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

    defect_type: {
      type: String,
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },

    priority_score: {
      type: Number,
      default: 0,
      index: true,
    },

    status: {
      type: String,
      enum: [
        'confirmed',
        'assigned',
        'in_progress',
        'repaired',
        'verified',
        'closed',
        'rejected',
      ],
      default: 'confirmed',
      index: true,
    },

    camera: {
      type: String,
      enum: ['front', 'rear', 'dual', 'unknown'],
      default: 'unknown',
      index: true,
    },

    defect_position_cm: {
      type: Number,
      default: 0,
      index: true,
    },

    encoder_position_cm: {
      type: Number,
      default: 0,
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
      default: 'unknown',
      index: true,
    },

    bbox: {
      type: [Number],
      default: [],
    },

    confidence: {
      type: Number,
      default: 0,
    },

    recommendation: {
      type: String,
      default: '',
    },

    assigned_to: {
      type: String,
      default: null,
      index: true,
    },

    confirmed_by: {
      type: String,
      default: 'operator',
    },

    confirmed_at: {
      type: Date,
      default: () => new Date(),
      index: true,
    },

    assigned_at: {
      type: Date,
      default: null,
    },

    repair_started_at: {
      type: Date,
      default: null,
    },

    repaired_at: {
      type: Date,
      default: null,
    },

    verified_at: {
      type: Date,
      default: null,
    },

    closed_at: {
      type: Date,
      default: null,
    },

    repair_notes: {
      type: String,
      default: '',
    },

    verification_notes: {
      type: String,
      default: '',
    },

    before_images: {
      front: { type: String, default: null },
      rear: { type: String, default: null },
    },

    after_images: {
      front: { type: String, default: null },
      rear: { type: String, default: null },
    },

    history: [
      {
        action: { type: String, required: true },
        by: { type: String, default: 'operator' },
        at: { type: Date, default: () => new Date() },
        notes: { type: String, default: '' },
        from_status: { type: String, default: null },
        to_status: { type: String, default: null },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

FaultSchema.index({ status: 1, severity: 1, createdAt: -1 });
FaultSchema.index({ defect_type: 1, nearest_sleeper: 1, status: 1 });
FaultSchema.index({ track_zone: 1, priority_score: -1 });
FaultSchema.index({ camera: 1, createdAt: -1 });

export default mongoose.model('Fault', FaultSchema);