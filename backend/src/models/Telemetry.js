// src/models/Telemetry.js
import mongoose from 'mongoose';

const TelemetrySchema = new mongoose.Schema(
  {
    train_id: {
      type: String,
      default: 'Train01',
      index: true,
    },

    timestamp: {
      type: Number,
      default: () => Date.now(),
      index: true,
    },

    pulse_count: {
      type: Number,
      default: 0,
    },

    distance_per_pulse_cm: {
      type: Number,
      default: 0,
    },

    track_position_cm: {
      type: Number,
      default: 0,
      index: true,
    },
official_position_cm: {
  type: Number,
  default: 0,
  index: true,
},

rear_wheel_cm: {
  type: Number,
  default: 0,
},

front_wheel_cm: {
  type: Number,
  default: 0,
},

encoder_distance_cm: {
  type: Number,
  default: 0,
},

auto_state: {
  type: String,
  default: 'off',
},

nearest_sleeper: {
  type: String,
  default: null,
  index: true,
},

track_zone: {
  type: String,
  default: 'Unknown',
  index: true,
},

is_on_rail_joint: {
  type: Boolean,
  default: false,
  index: true,
},
    speed_rpm: {
      type: Number,
      default: 0,
    },

    speed_cm_s: {
      type: Number,
      default: 0,
    },

    speed_pct: {
      type: Number,
      default: 0,
    },

    running: {
      type: Boolean,
      default: false,
      index: true,
    },

    auto: {
      type: Boolean,
      default: false,
    },

    direction: {
      type: String,
      default: 'stop',
      index: true,
    },

    wifi_rssi: {
      type: Number,
      default: null,
    },

    source: {
      type: String,
      default: 'esp32-devkit',
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

TelemetrySchema.index({ train_id: 1, createdAt: -1 });

export default mongoose.model('Telemetry', TelemetrySchema);