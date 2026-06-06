// src/models/ControlCommand.js
import mongoose from 'mongoose';

const ControlCommandSchema = new mongoose.Schema(
  {
    train_id: {
      type: String,
      default: 'Train01',
      index: true,
    },

    command: {
      type: String,
      required: true,
      index: true,
    },

    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    direction: {
      type: String,
      default: null,
    },

    source: {
      type: String,
      default: 'api-control',
      index: true,
    },

    reason: {
      type: String,
      default: 'manual_dashboard_command',
    },

    devkit_connected: {
      type: Boolean,
      default: false,
    },

    ack: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ['sent', 'failed', 'queued'],
      default: 'failed',
      index: true,
    },

    sent_at: {
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

ControlCommandSchema.index({ train_id: 1, createdAt: -1 });

export default mongoose.model('ControlCommand', ControlCommandSchema);