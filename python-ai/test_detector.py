import time
import cv2
import logging

from modules.detector import DefectDetector, draw_detections
from config import DEVICE

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("TEST")

IMAGE_PATH = "test_rail.jpg"

def main():
    log.info(f"Device: {DEVICE}")

    detector = DefectDetector()

    frame = cv2.imread(IMAGE_PATH)
    if frame is None:
        raise FileNotFoundError(f"Image not found: {IMAGE_PATH}")

    # warmup
    _ = detector.detect(frame)

    t0 = time.perf_counter()
    detections = detector.detect(frame)
    dt = time.perf_counter() - t0

    log.info(f"Inference time: {dt * 1000:.1f} ms")
    log.info(f"Detections count: {len(detections)}")

    for d in detections:
        log.info(d)

    annotated = draw_detections(frame, detections)
    cv2.imwrite("test_output.jpg", annotated)
    log.info("Saved: test_output.jpg")


if __name__ == "__main__":
    main()