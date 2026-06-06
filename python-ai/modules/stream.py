import cv2
import time
import queue
import threading
import logging

log = logging.getLogger(__name__)


class CameraStream:
    def __init__(self, url: str, name: str, q: queue.Queue):
        self.url = url
        self.name = name
        self.q = q
        self.running = False
        self.thread = None

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        return self.thread

    def _loop(self):
        while self.running:
            log.info(f"[{self.name}] connecting: {self.url}")
            cap = cv2.VideoCapture(self.url)

            if not cap.isOpened():
                log.warning(f"[{self.name}] failed to open stream, retrying...")
                time.sleep(2)
                continue

            log.info(f"[{self.name}] stream connected")

            while self.running:
                ok, frame = cap.read()
                if not ok or frame is None:
                    log.warning(f"[{self.name}] frame read failed")
                    break

                if self.q.full():
                    try:
                        self.q.get_nowait()
                    except queue.Empty:
                        pass

                self.q.put((time.time(), frame))

            cap.release()
            time.sleep(1)

    def stop(self):
        self.running = False