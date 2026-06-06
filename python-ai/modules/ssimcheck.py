import cv2
from skimage.metrics import structural_similarity as ssim

from config import SSIM_PASS_THRESHOLD, SSIM_WARN_THRESHOLD


def compare_frames(front, rear):
    rear_resized = cv2.resize(rear, (front.shape[1], front.shape[0]))
    rear_flipped = cv2.flip(rear_resized, 1)

    g1 = cv2.cvtColor(front, cv2.COLOR_BGR2GRAY)
    g2 = cv2.cvtColor(rear_flipped, cv2.COLOR_BGR2GRAY)

    score, _ = ssim(g1, g2, full=True)

    if score >= SSIM_PASS_THRESHOLD:
        status = "pass"
    elif score >= SSIM_WARN_THRESHOLD:
        status = "warn"
    else:
        status = "alert"

    return round(float(score), 4), status