# python-ai/modules/restream.py
import time
import threading
import logging
import cv2

from flask import Flask, Response, jsonify

log = logging.getLogger(__name__)

app = Flask(__name__)

_latest_frames = {
    "front": None,
    "rear": None,
}

_lock = threading.Lock()


def update_restream_frame(camera_name, frame):
    if frame is None:
        return

    key = camera_name.lower()

    if key not in _latest_frames:
        return

    with _lock:
        _latest_frames[key] = frame.copy()


def get_latest_frame(camera_name):
    with _lock:
        frame = _latest_frames.get(camera_name)
        return frame.copy() if frame is not None else None


def encode_jpg(frame, quality=75):
    ok, buffer = cv2.imencode(
        ".jpg",
        frame,
        [int(cv2.IMWRITE_JPEG_QUALITY), quality],
    )

    if not ok:
        return None

    return buffer.tobytes()


def placeholder_frame(text):
    frame = 255 * 0
    frame = frame.astype("uint8") if hasattr(frame, "astype") else None


def mjpeg_generator(camera_name):
    while True:
        frame = get_latest_frame(camera_name)

        if frame is None:
            time.sleep(0.08)
            continue

        jpg = encode_jpg(frame, quality=72)

        if jpg is None:
            time.sleep(0.05)
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n"
            b"Content-Length: " + str(len(jpg)).encode() + b"\r\n\r\n" +
            jpg +
            b"\r\n"
        )

        # حوالي 12-15 FPS للداشبورد بدون ضغط قوي
        time.sleep(0.07)


def snapshot_response(camera_name):
    frame = get_latest_frame(camera_name)

    if frame is None:
        return jsonify({
            "success": False,
            "message": f"{camera_name} frame not ready",
        }), 503

    jpg = encode_jpg(frame, quality=80)

    if jpg is None:
        return jsonify({
            "success": False,
            "message": "failed to encode frame",
        }), 500

    return Response(jpg, mimetype="image/jpeg")


@app.route("/front")
def front_stream():
    return Response(
        mjpeg_generator("front"),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@app.route("/rear")
def rear_stream():
    return Response(
        mjpeg_generator("rear"),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@app.route("/front.jpg")
def front_snapshot():
    return snapshot_response("front")


@app.route("/rear.jpg")
def rear_snapshot():
    return snapshot_response("rear")


@app.route("/health")
def restream_health():
    with _lock:
        return jsonify({
            "success": True,
            "front_ready": _latest_frames["front"] is not None,
            "rear_ready": _latest_frames["rear"] is not None,
            "endpoints": {
                "front_stream": "/front",
                "rear_stream": "/rear",
                "front_snapshot": "/front.jpg",
                "rear_snapshot": "/rear.jpg",
            },
        })


def start_restream_server(host="0.0.0.0", port=5050):
    def run():
        log.info(f"[RESTREAM] Dashboard MJPEG server running on http://{host}:{port}")
        app.run(
            host=host,
            port=port,
            threaded=True,
            debug=False,
            use_reloader=False,
        )

    thread = threading.Thread(target=run, daemon=True)
    thread.start()