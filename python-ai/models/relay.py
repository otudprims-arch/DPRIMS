# ============================================================
#  DPRIMS — modules/relay.py
#  MJPEG Relay Server — يبث الصور المحللة للـ Dashboard
#  PORT 8080: /front  → كاميرا الأمام بعد التحليل
#  PORT 8080: /rear   → كاميرا الخلف
#  PORT 8080: /stats  → JSON (FPS, SSIM, detections)
# ============================================================
import threading
import time
import cv2
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import logging

log = logging.getLogger(__name__)

_state = {
    "front": None,
    "rear":  None,
    "lock":  threading.Lock(),
    "stats": {
        "fps": 0.0,
        "ssim": 1.0,
        "detections": 0,
        "last_defect": "--",
        "status": "running"
    }
}


def update_frame(cam: str, frame):
    """استدعيها من analysis.py بعد كل inference"""
    with _state["lock"]:
        _state[cam] = frame.copy() if frame is not None else None


def update_stats(fps: float, ssim: float, detections: int, last_defect: str = "--"):
    _state["stats"].update({
        "fps": round(fps, 1),
        "ssim": round(ssim, 4),
        "detections": detections,
        "last_defect": last_defect,
        "status": "running"
    })


def _encode_frame(frame):
    if frame is None:
        import numpy as np
        frame = np.zeros((480, 640, 3), dtype="uint8")
        cv2.putText(frame, "No Signal", (220, 240),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (80, 80, 80), 2)
    _, jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return jpg.tobytes()


class _MJPEGHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass  # suppress logs

    def do_GET(self):
        if self.path in ("/front", "/rear"):
            cam = "front" if self.path == "/front" else "rear"
            self.send_response(200)
            self.send_header("Content-Type",
                             "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            try:
                while True:
                    with _state["lock"]:
                        jpg = _encode_frame(_state[cam])
                    self.wfile.write(
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n"
                        + jpg + b"\r\n"
                    )
                    time.sleep(0.1)
            except (BrokenPipeError, ConnectionResetError):
                pass

        elif self.path == "/stats":
            data = json.dumps(_state["stats"]).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(data)

        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')

        else:
            self.send_response(404)
            self.end_headers()


def start(host: str = "0.0.0.0", port: int = 8080):
    server = HTTPServer((host, port), _MJPEGHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    log.info(f"✅ [RELAY] MJPEG Server on http://{host}:{port}")
    log.info(f"   front → http://10.42.0.1:{port}/front")
    log.info(f"   rear  → http://10.42.0.1:{port}/rear")
    log.info(f"   stats → http://10.42.0.1:{port}/stats")
    return server