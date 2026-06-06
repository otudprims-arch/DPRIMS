import cv2
import time

FRONT_URL = "http://10.42.0.101:81/stream"
REAR_URL  = "http://10.42.0.102:81/stream"

front = cv2.VideoCapture(FRONT_URL)
rear = cv2.VideoCapture(REAR_URL)

print("Front opened:", front.isOpened())
print("Rear opened :", rear.isOpened())

if not front.isOpened():
    raise RuntimeError("Front camera failed")

if not rear.isOpened():
    raise RuntimeError("Rear camera failed")

while True:
    ok_f, frame_f = front.read()
    ok_r, frame_r = rear.read()

    if not ok_f:
        print("Front frame failed")
        break

    if not ok_r:
        print("Rear frame failed")
        break

    frame_f = cv2.resize(frame_f, (640, 480))
    frame_r = cv2.resize(frame_r, (640, 480))

    cv2.imshow("FRONT", frame_f)
    cv2.imshow("REAR", frame_r)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

front.release()
rear.release()
cv2.destroyAllWindows()