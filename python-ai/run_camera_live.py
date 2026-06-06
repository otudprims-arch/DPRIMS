import cv2
import time
from modules.detector import DefectDetector, draw_detections

CAM_URL = "http://10.42.0.102:81/stream"
# لو الكاميرا عندك 101 غيّرها:
# CAM_URL = "http://10.42.0.101:81/stream"

def main():
    print(f"Opening camera: {CAM_URL}")

    cap = cv2.VideoCapture(CAM_URL)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open camera stream: {CAM_URL}")

    detector = DefectDetector()

    last_time = time.time()
    frame_count = 0
    detect_every = 3
    last_detections = []

    while True:
        ok, frame = cap.read()
        if not ok or frame is None:
            print("Frame read failed")
            break

        frame_count += 1

        if frame_count % detect_every == 0:
            last_detections = detector.detect(frame)

        annotated = draw_detections(frame, last_detections)

        now = time.time()
        fps = 1.0 / max(now - last_time, 0.001)
        last_time = now

        cv2.putText(
            annotated,
            f"FPS: {fps:.1f} | Detections: {len(last_detections)}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2,
        )

        cv2.imshow("DPRIMS YOLO Live Camera", annotated)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()