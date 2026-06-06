// src/models/InspectionSession.js
import mongoose from 'mongoose';

const InspectionSessionSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    train_id: {
      type: String,
      default: 'Train01',
      index: true,
    },

    status: {
      type: String,
      enum: ['running', 'completed', 'cancelled'],
      default: 'running',
      index: true,
    },

    started_at: {
      type: Date,
      default: () => new Date(),
    },

    ended_at: {
      type: Date,
      default: null,
    },

    duration_sec: {
      type: Number,
      default: 0,
    },

    start_position_cm: {
      type: Number,
      default: 0,
    },

    end_position_cm: {
      type: Number,
      default: 0,
    },

    total_distance_cm: {
      type: Number,
      default: 0,
    },

    alerts_count: {
      type: Number,
      default: 0,
    },

    critical_count: {
      type: Number,
      default: 0,
    },

    notes: {
      type: String,
      default: '',
    },

    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

InspectionSessionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('InspectionSession', InspectionSessionSchema);