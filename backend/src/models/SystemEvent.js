// src/models/SystemEvent.js
import mongoose from 'mongoose';

const SystemEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'info',
      index: true,
    },

    source: {
      type: String,
      default: 'backend',
      index: true,
    },

    title: {
      type: String,
      default: '',
    },

    message: {
      type: String,
      default: '',
    },

    entity_type: {
      type: String,
      default: null,
      index: true,
    },

    entity_id: {
      type: String,
      default: null,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    timestamp: {
      type: Number,
      default: () => Date.now(),
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

SystemEventSchema.index({ createdAt: -1 });

export default mongoose.model('SystemEvent', SystemEventSchema);