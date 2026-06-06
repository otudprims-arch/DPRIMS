# analysis.py
import time
import queue
import logging
import colorlog
from typing import Optional, Tuple, Any

from config import (
    FRONT_CAM_URL,
    REAR_CAM_URL,
    ANALYSIS_INTERVAL_MS,
    ALERT_COOLDOWN_SEC,
    DEVICE,
    SEND_ALERTS_WHEN_STOPPED,
    STATIC_ALERT_RESEND_SEC,
)

try:
    from config import SSIM_ALERT_ENABLED
except Exception:
    SSIM_ALERT_ENABLED = False

from modules.stream import CameraStream
from modules.detector import DefectDetector, draw_detections
from modules.ssimcheck import compare_frames
from modules.alerts import AlertSender
from modules.telemetry import TelemetryState
from modules.restream import start_restream_server, update_restream_frame
from modules.track_geometry import enrich_alert_location


# =========================================================
# Logging
# =========================================================
handler = colorlog.StreamHandler()
handler.setFormatter(
    colorlog.ColoredFormatter(
        "%(log_color)s[%(asctime)s] %(levelname)s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
)

logging.basicConfig(level=logging.INFO, handlers=[handler])
log = logging.getLogger("DPRIMS")


# =========================================================
# Helpers
# =========================================================
def get_latest_frame(q: queue.Queue) -> Optional[Tuple[float, Any]]:
    """
    Take only the latest frame from the queue to avoid processing old frames.
    """
    latest = None

    while True:
        try:
            latest = q.get_nowait()
        except queue.Empty:
            break

    return latest


def tag_detections(detections, camera_name: str):
    """
    Add camera name to every detected defect.
    """
    tagged = []

    for d in detections:
        item = dict(d)
        item["camera"] = camera_name
        tagged.append(item)

    return tagged


def safe_update_restream(front_frame=None, rear_frame=None):
    """
    Update dashboard restream frames safely.
    """
    try:
        if front_frame is not None:
            update_restream_frame("front", front_frame)

        if rear_frame is not None:
            update_restream_frame("rear", rear_frame)

    except Exception as err:
        log.warning(f"Restream update skipped: {err}")


def build_ssim_detection(ssim_score):
    """
    Build SSIM-only anomaly when YOLO detects nothing but frame comparison is abnormal.
    """
    return {
        "type": "ssim_anomaly",
        "confidence": round(1.0 - float(ssim_score), 3),
        "severity": "medium",
        "bbox": [0, 0, 0, 0],
        "camera": "dual",
    }


def get_bbox_signature_parts(detection: dict):
    """
    Build stable bbox bucket from YOLO bbox.
    This lets us save different boxes of the same defect type as separate alerts.
    """
    bbox = detection.get("bbox") or [0, 0, 0, 0]

    try:
        x1, y1, x2, y2 = bbox

        bbox_center_x = (float(x1) + float(x2)) / 2.0
        bbox_center_y = (float(y1) + float(y2)) / 2.0

        # bucket كل 40px عشان نفس العيب مع اهتزاز بسيط مايتحسبش alert جديد
        bbox_bucket_x = int(bbox_center_x // 40) * 40
        bbox_bucket_y = int(bbox_center_y // 40) * 40

        return {
            "bbox_center_x": round(bbox_center_x, 2),
            "bbox_center_y": round(bbox_center_y, 2),
            "bbox_bucket_x": bbox_bucket_x,
            "bbox_bucket_y": bbox_bucket_y,
        }

    except Exception:
        return {
            "bbox_center_x": None,
            "bbox_center_y": None,
            "bbox_bucket_x": None,
            "bbox_bucket_y": None,
        }


def attach_detection_identity(payload: dict, detection: dict) -> dict:
    """
    Add bbox identity fields and detection_signature to the payload.
    This helps backend avoid over-merging different detections as duplicates.
    """
    if not isinstance(payload, dict):
        return payload

    camera = payload.get("defect_camera") or detection.get("camera") or "unknown"
    defect_type = payload.get("primary_defect") or detection.get("type") or "unknown"
    zone = payload.get("track_zone") or "Unknown"
    sleeper = payload.get("nearest_sleeper") or "S?"

    bbox_parts = get_bbox_signature_parts(detection)

    payload["bbox_center_x"] = bbox_parts["bbox_center_x"]
    payload["bbox_center_y"] = bbox_parts["bbox_center_y"]
    payload["bbox_bucket_x"] = bbox_parts["bbox_bucket_x"]
    payload["bbox_bucket_y"] = bbox_parts["bbox_bucket_y"]

    bx = payload["bbox_bucket_x"]
    by = payload["bbox_bucket_y"]

    payload["detection_signature"] = (
        f"{camera}:{defect_type}:{zone}:{sleeper}:{bx}:{by}"
    )

    defect = payload.get("defect")
    if isinstance(defect, dict):
        defect["bbox_center_x"] = payload["bbox_center_x"]
        defect["bbox_center_y"] = payload["bbox_center_y"]
        defect["bbox_bucket_x"] = payload["bbox_bucket_x"]
        defect["bbox_bucket_y"] = payload["bbox_bucket_y"]
        defect["detection_signature"] = payload["detection_signature"]
        payload["defect"] = defect

    return payload


def build_stable_alert_key(payload: dict, detection: dict) -> str:
    """
    Python-side cooldown key.
    Same defect box should not be sent every frame.
    Different boxes should be sent as separate alerts.
    """
    camera = detection.get("camera", "unknown")
    defect_type = detection.get("type", "unknown")
    bbox_parts = get_bbox_signature_parts(detection)

    bx = bbox_parts["bbox_bucket_x"]
    by = bbox_parts["bbox_bucket_y"]

    if not isinstance(payload, dict):
        return f"{camera}:{defect_type}:unknown:S?:{bx}:{by}"

    return (
        f"{payload.get('defect_camera', camera)}:"
        f"{payload.get('primary_defect', defect_type)}:"
        f"{payload.get('track_zone', 'Unknown')}:"
        f"{payload.get('nearest_sleeper', 'S?')}:"
        f"{bx}:{by}"
    )


def prepare_alert_payload(
    alerts: AlertSender,
    detection: dict,
    ssim_score,
    telemetry_state: dict,
    annotated_front,
    annotated_rear,
):
    """
    Build final alert payload with:
    - camera source
    - defect type
    - severity
    - confidence
    - geometry enrichment: zone, sleeper, camera position, defect position
    - bbox identity: detection_signature
    """
    payload = alerts.build(
        detection=detection,
        ssim_score=ssim_score,
        telemetry=telemetry_state,
        front_frame=annotated_front,
        rear_frame=annotated_rear,
    )

    if isinstance(payload, dict):
        camera = detection.get("camera", "front")
        defect_type = detection.get("type")
        severity = detection.get("severity")
        confidence = detection.get("confidence")

        payload["camera"] = camera
        payload["defect_camera"] = camera
        payload["primary_defect"] = defect_type
        payload["severity"] = severity
        payload["confidence"] = confidence

        # خلي بيانات التليمتري الأساسية موجودة في alert نفسه
        payload["speed_cm_s"] = telemetry_state.get("speed_cm_s", 0)
        payload["direction"] = telemetry_state.get("direction", "unknown")
        payload["running"] = bool(telemetry_state.get("running", False))

    # حساب zone / sleeper / defect_position
    payload = enrich_alert_location(payload)

    # حساب bbox signature بعد ما المكان والزون والسليبر اتضافوا
    payload = attach_detection_identity(payload, detection)

    return payload


# =========================================================
# Main
# =========================================================
def main():
    log.info("=" * 70)
    log.info(f"DPRIMS Python AI Pipeline - YOLOv8 on {DEVICE}")

    # Dashboard restream server
    start_restream_server(host="0.0.0.0", port=5050)

    log.info(f"FRONT: {FRONT_CAM_URL}")
    log.info(f"REAR : {REAR_CAM_URL}")
    log.info("=" * 70)

    q_front = queue.Queue(maxsize=3)
    q_rear = queue.Queue(maxsize=3)

    front = CameraStream(FRONT_CAM_URL, "FRONT", q_front)
    rear = CameraStream(REAR_CAM_URL, "REAR", q_rear)

    front.start()
    rear.start()

    telemetry = TelemetryState()
    telemetry.start()

    detector = DefectDetector()
    alerts = AlertSender()

    processed_frames = 0
    start_ts = time.time()
    last_wait_log_ts = 0.0

    # Cooldown per stable defect key
    last_sent_by_key = {}

    log.info("Pipeline started. Waiting for BOTH camera frames...")

    try:
        while True:
            time.sleep(ANALYSIS_INTERVAL_MS / 1000)

            front_item = get_latest_frame(q_front)
            rear_item = get_latest_frame(q_rear)

            front_ready = front_item is not None
            rear_ready = rear_item is not None

            if not front_ready or not rear_ready:
                now = time.time()

                if now - last_wait_log_ts >= 3:
                    log.warning(
                        "Waiting for frames | "
                        f"front_ready={front_ready} "
                        f"rear_ready={rear_ready}"
                    )
                    last_wait_log_ts = now

                continue

            _, frame_front = front_item
            _, frame_rear = rear_item

            processed_frames += 1

            # =================================================
            # 1. YOLO on front + rear cameras
            # =================================================
            try:
                front_detections = detector.detect(frame_front)
                rear_detections = detector.detect(frame_rear)

                front_detections = tag_detections(front_detections, "front")
                rear_detections = tag_detections(rear_detections, "rear")

                annotated_front = draw_detections(frame_front, front_detections)
                annotated_rear = draw_detections(frame_rear, rear_detections)

            except Exception as err:
                log.exception(f"YOLO detection failed: {err}")

                front_detections = []
                rear_detections = []

                annotated_front = frame_front
                annotated_rear = frame_rear

            # Update dashboard restream after drawing boxes
            safe_update_restream(
                front_frame=annotated_front,
                rear_frame=annotated_rear,
            )

            # =================================================
            # 2. SSIM comparison between front and rear
            # SSIM alert is disabled unless config allows it.
            # =================================================
            try:
                ssim_score, ssim_status = compare_frames(frame_front, frame_rear)
            except Exception as err:
                log.warning(f"SSIM skipped: {err}")
                ssim_score, ssim_status = 1.0, "pass"

            all_detections = front_detections + rear_detections

            # SSIM-only alert only when enabled and YOLO detects nothing
            if SSIM_ALERT_ENABLED and not all_detections and ssim_status == "alert":
                all_detections.append(build_ssim_detection(ssim_score))

            # =================================================
            # 3. Periodic logs
            # =================================================
            if processed_frames % 10 == 0:
                elapsed = time.time() - start_ts
                fps = processed_frames / elapsed if elapsed > 0 else 0.0

                log.info(
                    f"FPS={fps:.2f} | "
                    f"front_det={len(front_detections)} | "
                    f"rear_det={len(rear_detections)} | "
                    f"total_det={len(all_detections)} | "
                    f"SSIM={ssim_score} {ssim_status} | "
                    f"telemetry={telemetry.state}"
                )

            if not all_detections:
                continue

            train_running = bool(telemetry.state.get("running", False))

            if not train_running and not SEND_ALERTS_WHEN_STOPPED:
                if processed_frames % 10 == 0:
                    log.info(
                        "Detections visible but train is stopped; "
                        "alerts are not sent in stopped mode."
                    )
                continue

            # =================================================
            # 4. Send stable alerts to backend
            # =================================================
            now = time.time()
            sent_count = 0

            for detection in all_detections:
                try:
                    payload = prepare_alert_payload(
                        alerts=alerts,
                        detection=detection,
                        ssim_score=ssim_score,
                        telemetry_state=telemetry.state,
                        annotated_front=annotated_front,
                        annotated_rear=annotated_rear,
                    )

                    stable_key = build_stable_alert_key(payload, detection)

                    last_sent = last_sent_by_key.get(stable_key, 0)
                    cooldown_sec = (
                        STATIC_ALERT_RESEND_SEC
                        if not train_running
                        else ALERT_COOLDOWN_SEC
                    )

                    if now - last_sent < cooldown_sec:
                        continue

                    last_sent_by_key[stable_key] = now

                    sent = alerts.send(payload)

                    if sent:
                        sent_count += 1

                    log.warning(
                        f"ALERT | "
                        f"camera={payload.get('defect_camera')} | "
                        f"type={payload.get('primary_defect')} | "
                        f"sleeper={payload.get('nearest_sleeper')} | "
                        f"zone={payload.get('track_zone')} | "
                        f"pos={payload.get('defect_position_cm')} | "
                        f"bbox_sig={payload.get('detection_signature')} | "
                        f"conf={detection.get('confidence')} | "
                        f"severity={detection.get('severity')} | "
                        f"SSIM={ssim_score} {ssim_status} | "
                        f"sent={sent}"
                    )

                except Exception as err:
                    log.exception(f"Failed to build/send alert: {err}")

            if sent_count:
                log.info(f"Frame alerts sent: {sent_count}/{len(all_detections)}")

    except KeyboardInterrupt:
        log.info("Stopping pipeline by user...")

    finally:
        front.stop()
        rear.stop()

        try:
            telemetry.stop()
        except Exception:
            pass

        elapsed = time.time() - start_ts
        fps = processed_frames / elapsed if elapsed > 0 else 0.0

        log.info("=" * 70)
        log.info(
            f"Pipeline stopped | frames={processed_frames} | "
            f"elapsed={elapsed:.1f}s | avg_fps={fps:.2f}"
        )
        log.info("=" * 70)


if __name__ == "__main__":
    main()