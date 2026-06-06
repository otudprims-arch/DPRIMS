import cv2
from modules.detector import DefectDetector, draw_detections

CAM_URL = "http://10.42.0.102:81/stream"

cap = cv2.VideoCapture(CAM_URL)
print("Camera opened:", cap.isOpened())

ok, frame = cap.read()
if not ok:
    raise RuntimeError("Failed to read frame from camera")

detector = DefectDetector()
detections = detector.detect(frame)

print("Detections:", detections)

out = draw_detections(frame, detections)
cv2.imwrite("camera_test_output.jpg", out)

cap.release()
print("Saved camera_test_output.jpg")