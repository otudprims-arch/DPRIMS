// src/config/calibration.js

export const TRACK_CALIBRATION = {
  // لازم يطابق ESP32 + Python
  TRACK_LENGTH_CM: 304,

  SLEEPER_COUNT: 15,
  SLEEPER_WIDTH_CM: 7,
  SLEEPER_GAP_CM: 14,

  // العربة
  TRAIN_BODY_LENGTH_CM: 70,

  // المسافة بين العجلتين حسب ESP32 تقريبًا
  FRONT_TO_REAR_AXLE_CM: 35.5,

  // الإنكودر عند الموتور / العجلة الخلفية
  ENCODER_OFFSET_CM: 0,

  // نفس القيم المستخدمة في Python track_geometry.py
  REAR_CAMERA_OFFSET_CM: 8,
  FRONT_CAMERA_OFFSET_CM: 83,

  CAMERA_MATCH_TOLERANCE_CM: 8,

  RAIL_JOINT_START_CM: 141,
  RAIL_JOINT_CENTER_CM: 152,
  RAIL_JOINT_END_CM: 163,
};

export function clampTrackCm(value) {
  const n = Number(value) || 0;
  return Math.max(0, Math.min(TRACK_CALIBRATION.TRACK_LENGTH_CM, n));
}

export function getFrontCameraPosition(encoderPositionCm) {
  return clampTrackCm(
    encoderPositionCm + TRACK_CALIBRATION.FRONT_CAMERA_OFFSET_CM
  );
}

export function getRearCameraPosition(encoderPositionCm) {
  return clampTrackCm(
    encoderPositionCm + TRACK_CALIBRATION.REAR_CAMERA_OFFSET_CM
  );
}

export function getTrainStartPosition(encoderPositionCm) {
  return clampTrackCm(
    encoderPositionCm - TRACK_CALIBRATION.FRONT_TO_REAR_AXLE_CM
  );
}

export function getNearestSleeper(positionCm) {
  const p = clampTrackCm(positionCm);
  const pitch =
    TRACK_CALIBRATION.SLEEPER_WIDTH_CM + TRACK_CALIBRATION.SLEEPER_GAP_CM;

  const index = Math.round(p / pitch) + 1;

  return Math.max(1, Math.min(TRACK_CALIBRATION.SLEEPER_COUNT, index));
}

export function getTrackZone(positionCm) {
  const p = clampTrackCm(positionCm);

  if (
    p >= TRACK_CALIBRATION.RAIL_JOINT_START_CM &&
    p <= TRACK_CALIBRATION.RAIL_JOINT_END_CM
  ) {
    return 'Rail Joint Zone';
  }

  if (p <= 101) return 'Zone A';
  if (p <= 203) return 'Zone B';
  return 'Zone C';
}
