# python-ai/modules/alerts.py
import json
import time
import uuid
import cv2
import logging
import websocket

from config import BACKEND_WS_URL, EVENTS_DIR, TRAIN_ID, BACKEND_ENABLED

log = logging.getLogger(__name__)


class AlertSender:
    def __init__(self):
        self.ws = None
        self.last_connect_attempt = 0
        self.connect_retry_sec = 10

        if BACKEND_ENABLED:
            self.connect()
        else:
            log.warning("[BACKEND] disabled from config. Alerts will be saved locally only.")

    def connect(self):
        if not BACKEND_ENABLED:
            return False

        now = time.time()

        if now - self.last_connect_attempt < self.connect_retry_sec:
            return False

        self.last_connect_attempt = now

        try:
            self.ws = websocket.create_connection(BACKEND_WS_URL, timeout=1)
            log.info(f"[BACKEND] connected: {BACKEND_WS_URL}")
            return True

        except Exception as e:
            log.warning(f"[BACKEND] connection failed: {e}")
            self.ws = None
            return False

    def save_image(self, frame, event_id, tag):
        path = EVENTS_DIR / f"{event_id}_{tag}.jpg"

        try:
            cv2.imwrite(str(path), frame)
            return str(path)
        except Exception as e:
            log.warning(f"[EVENT IMAGE] failed to save {tag}: {e}")
            return None

    def save_payload(self, payload):
        path = EVENTS_DIR / f"{payload['event_id']}.json"

        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        return str(path)

    def build(self, detection, ssim_score, telemetry, front_frame, rear_frame):
        """
        Build base alert payload.
        analysis.py will enrich it with geometry and detection_signature.
        """

        event_id = str(uuid.uuid4())[:8]

        front_path = self.save_image(front_frame, event_id, "front")
        rear_path = self.save_image(rear_frame, event_id, "rear")

        track_position = telemetry.get(
            "track_position_cm",
            telemetry.get("official_position_cm", telemetry.get("distance_cm", 0))
        )

        payload = {
            "event_id": event_id,
            "type": "rail_defect",
            "source": "python-ai",

            "train_id": TRAIN_ID,
            "timestamp": int(time.time() * 1000),

            "model": "yolov8",
            "model_version": "rail_defect_v3",

            "gps": {
                "lat": telemetry.get("lat", 0),
                "lng": telemetry.get("lng", 0),
            },

            # Encoder / telemetry position
            "track_position_cm": track_position,
            "official_position_cm": telemetry.get("official_position_cm", track_position),
            "encoder_position_cm": telemetry.get("encoder_position_cm", track_position),

            # Motion
            "speed_cm_s": telemetry.get("speed_cm_s", 0),
            "speed_rpm": telemetry.get("speed_rpm", 0),
            "speed_pct": telemetry.get("speed_pct", 0),
            "direction": telemetry.get("direction", "unknown"),
            "running": bool(telemetry.get("running", False)),

            # Track context from ESP32 if available
            "nearest_sleeper": telemetry.get("nearest_sleeper"),
            "track_zone": telemetry.get("track_zone", "Unknown"),
            "is_on_rail_joint": bool(telemetry.get("is_on_rail_joint", False)),
            "rail_joint_distance_cm": telemetry.get("rail_joint_distance_cm"),

            # Detection
            "camera": detection.get("camera", "unknown"),
            "defect_camera": detection.get("camera", "unknown"),
            "primary_defect": detection.get("type", "unknown"),
            "severity": detection.get("severity", "low"),
            "confidence": detection.get("confidence", 0),
            "defect": detection,

            "ssim_score": ssim_score,
            "ssim_anomaly_score": ssim_score,

            "images": {
                "front": front_path,
                "rear": rear_path,
            },

            "action": "stop" if detection.get("severity") == "critical" else "warn",
        }

        self.save_payload(payload)

        return payload

    def send(self, payload):
        if not BACKEND_ENABLED:
            log.info(f"[BACKEND] skipped. Alert saved locally: {payload['event_id']}")
            return False

        if self.ws is None:
            self.connect()

        if self.ws is None:
            log.warning("[BACKEND] offline. Alert saved locally only.")
            return False

        try:
            self.ws.send(json.dumps(payload))
            log.info(f"[BACKEND] alert sent: {payload['event_id']}")
            return True

        except Exception as e:
            log.error(f"[BACKEND] send failed: {e}")
            self.ws = None
            return False