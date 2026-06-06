# python-ai/modules/telemetry.py
import time
import threading
import logging
import requests

log = logging.getLogger(__name__)

# Backend telemetry endpoint
BACKEND_TELEMETRY_URL = "http://10.42.0.211:3000/api/telemetry/latest"


class TelemetryState:
    """
    Reads latest telemetry from Backend.
    Backend receives telemetry from ESP32 DevKit on /devkit,
    then Python reads it from /api/telemetry/latest.

    This replaces the old dummy TelemetryState.
    """

    def __init__(self):
        self.state = {
            "lat": 0,
            "lng": 0,

            # Main position from ESP32
            "track_position_cm": 0,
            "official_position_cm": 0,
            "encoder_position_cm": 0,

            # Wheel / encoder info
            "rear_wheel_cm": 0,
            "front_wheel_cm": 0,
            "encoder_distance_cm": 0,
            "encoder_count": 0,
            "cm_per_pulse": 0,

            # Speed
            "speed_cm_s": 0,
            "speed_rpm": 0,
            "speed_pct": 0,

            # Motion
            "direction": "stop",
            "running": False,

            # Auto mode
            "auto": False,
            "auto_state": "off",
            "lap_count": 0,

            # Track info from ESP32
            "nearest_sleeper": None,
            "track_zone": "Unknown",
            "is_on_rail_joint": False,
            "rail_joint_distance_cm": None,

            # Connection
            "connected": False,
            "updated_at": None,
        }

        self.running = False
        self.thread = None

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        return self.thread

    def stop(self):
        self.running = False

    def _loop(self):
        while self.running:
            try:
                res = requests.get(BACKEND_TELEMETRY_URL, timeout=1)

                if res.status_code != 200:
                    self.state["connected"] = False
                    time.sleep(0.25)
                    continue

                body = res.json()
                data = body.get("data") or {}

                if not isinstance(data, dict) or not data:
                    self.state["connected"] = False
                    time.sleep(0.25)
                    continue

                track_pos = data.get(
                    "track_position_cm",
                    data.get("official_position_cm", 0)
                )

                official_pos = data.get(
                    "official_position_cm",
                    track_pos
                )

                self.state.update({
                    "lat": data.get("lat", data.get("gps", {}).get("lat", 0)),
                    "lng": data.get("lng", data.get("gps", {}).get("lng", 0)),

                    "track_position_cm": track_pos,
                    "official_position_cm": official_pos,
                    "encoder_position_cm": official_pos,

                    "rear_wheel_cm": data.get("rear_wheel_cm", 0),
                    "front_wheel_cm": data.get("front_wheel_cm", 0),
                    "encoder_distance_cm": data.get("encoder_distance_cm", 0),
                    "encoder_count": data.get("encoder_count", data.get("pulse_count", 0)),
                    "cm_per_pulse": data.get("cm_per_pulse", data.get("distance_per_pulse_cm", 0)),

                    "speed_cm_s": data.get("speed_cm_s", 0),
                    "speed_rpm": data.get("speed_rpm", 0),
                    "speed_pct": data.get("speed_pct", 0),

                    "direction": data.get("direction", "stop"),
                    "running": bool(data.get("running", False)),

                    "auto": bool(data.get("auto", False)),
                    "auto_state": data.get("auto_state", "off"),
                    "lap_count": data.get("lap_count", 0),

                    "nearest_sleeper": data.get("nearest_sleeper"),
                    "track_zone": data.get("track_zone", "Unknown"),
                    "is_on_rail_joint": bool(data.get("is_on_rail_joint", False)),
                    "rail_joint_distance_cm": data.get("rail_joint_distance_cm"),

                    "connected": True,
                    "updated_at": time.time(),
                })

            except Exception as e:
                self.state["connected"] = False
                log.warning(f"[TELEMETRY] failed to fetch latest telemetry: {e}")

            time.sleep(0.25)