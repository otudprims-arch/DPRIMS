import cv2
import logging
from ultralytics import YOLO

from config import (
    MODEL_PATH,
    CONF_THRESHOLD,
    IMAGE_SIZE,
    DEVICE,
    NORMAL_CLASSES,
    SEVERITY_MAP,
    CLASS_COLORS,
    MAX_BOX_AREA_RATIO,
    MIN_BOX_AREA_RATIO,
)

log = logging.getLogger(__name__)


class DefectDetector:
    def __init__(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

        log.info(f"Loading YOLO model: {MODEL_PATH}")

        self.model = YOLO(str(MODEL_PATH))
        self.names = self.model.names

        log.info(f"YOLO loaded on {DEVICE}")
        log.info(f"Classes: {self.names}")

    def detect(self, frame):
        """
        Returns:
        [
            {
                "type": "missing_bolt",
                "confidence": 0.91,
                "severity": "medium",
                "bbox": [x1, y1, x2, y2]
            }
        ]
        """

        if frame is None:
            return []

        frame_h, frame_w = frame.shape[:2]

        results = self.model.predict(
            source=frame,
            imgsz=IMAGE_SIZE,
            conf=CONF_THRESHOLD,
            device=0 if DEVICE == "cuda" else "cpu",
            verbose=False,
        )

        detections = []

        if not results:
            return detections

        result = results[0]
        boxes = result.boxes

        if boxes is None or len(boxes) == 0:
            return detections

        for box in boxes:
            xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
            conf = float(box.conf[0].cpu().item())
            cls_id = int(box.cls[0].cpu().item())

            cls_name = self.names.get(cls_id, str(cls_id))

            # تجاهل الكلاسات الطبيعية
            if cls_name in NORMAL_CLASSES:
                continue

            x1, y1, x2, y2 = xyxy

            # تأمين القيم داخل حدود الصورة
            x1 = max(0, min(x1, frame_w - 1))
            y1 = max(0, min(y1, frame_h - 1))
            x2 = max(0, min(x2, frame_w - 1))
            y2 = max(0, min(y2, frame_h - 1))

            box_w = max(0, x2 - x1)
            box_h = max(0, y2 - y1)

            if box_w == 0 or box_h == 0:
                continue

            box_area_ratio = (box_w * box_h) / float(frame_w * frame_h)

            # تجاهل Box كبير جدًا أو صغير جدًا
            if box_area_ratio > MAX_BOX_AREA_RATIO:
                continue

            if box_area_ratio < MIN_BOX_AREA_RATIO:
                continue

            severity = SEVERITY_MAP.get(cls_name, "low")

            detections.append({
                "type": cls_name,
                "confidence": round(conf, 3),
                "severity": severity,
                "bbox": [x1, y1, x2, y2],
            })

        return detections


def draw_detections(frame, detections):
    annotated = frame.copy()

    for d in detections:
        x1, y1, x2, y2 = d["bbox"]
        label = f"{d['type']} {d['confidence']:.0%}"
        color = CLASS_COLORS.get(d["type"], (255, 255, 255))

        cv2.rectangle(
            annotated,
            (x1, y1),
            (x2, y2),
            color,
            2,
        )

        (tw, th), _ = cv2.getTextSize(
            label,
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            1,
        )

        y_label = max(y1 - 6, th + 8)

        cv2.rectangle(
            annotated,
            (x1, y_label - th - 8),
            (x1 + tw + 8, y_label),
            color,
            -1,
        )

        cv2.putText(
            annotated,
            label,
            (x1 + 4, y_label - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            1,
        )

    return annotated