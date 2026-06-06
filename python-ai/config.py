from pathlib import Path
import torch

BASE_DIR = Path(__file__).resolve().parent

# =========================================================
# Cameras
# =========================================================
FRONT_CAM_URL = "http://10.42.0.101:81/stream"
REAR_CAM_URL = "http://10.42.0.102:81/stream"

# =========================================================
# Backend
# ملاحظة: لو Backend /ingest لسه بيرجع 400، هنصلحه في مرحلة Backend
# لكن نخلي الإعدادات جاهزة من الآن
# =========================================================
BACKEND_WS_URL = "ws://10.42.0.211:3000/ingest"
BACKEND_HTTP_URL = "http://10.42.0.211:3000/api/alerts"
BACKEND_ENABLED = True
# =========================================================
# YOLOv8 Model
# =========================================================
MODEL_PATH = BASE_DIR / "models" / "best.pt"

# ابدأ بـ 0.60 عشان نقلل false detections من الكاميرا
# لو الكشف ضعيف انزلها 0.50
CONF_THRESHOLD = 0.60

IMAGE_SIZE = 640

# =========================================================
# Classes
# هذه هي الكلاسات الفعلية التي ظهرت من YOLO model.names
# =========================================================
CLASS_NAMES = {
    0: "Sleeper",
    1: "broken_rail",
    2: "damaged_sleeper",
    3: "loose_bolt",
    4: "missing_bolt",
    5: "rail_joint",
    6: "rail_joint_damage",
}

# كائنات طبيعية لا نريد إصدار Alert عليها
NORMAL_CLASSES = {
    "Sleeper",
    "rail_joint",
}

# العيوب الحقيقية التي نرسل عليها Alert
DEFECT_CLASSES = {
    "broken_rail",
    "damaged_sleeper",
    "loose_bolt",
    "missing_bolt",
    "rail_joint_damage",
}

# =========================================================
# Severity
# =========================================================
SEVERITY_MAP = {
    "Sleeper": "low",
    "broken_rail": "critical",
    "damaged_sleeper": "medium",
    "loose_bolt": "medium",
    "missing_bolt": "medium",
    "rail_joint": "low",
    "rail_joint_damage": "high",
}

# =========================================================
# Colors for drawing boxes - BGR
# =========================================================
CLASS_COLORS = {
    "Sleeper": (160, 160, 160),
    "broken_rail": (0, 0, 255),
    "damaged_sleeper": (0, 165, 255),
    "loose_bolt": (255, 0, 255),
    "missing_bolt": (255, 0, 0),
    "rail_joint": (0, 255, 255),
    "rail_joint_damage": (0, 140, 255),
    "ssim_anomaly": (0, 0, 255),
}

# =========================================================
# Detection Filters
# =========================================================
# تجاهل أي box كبير جدًا لأنه غالبًا false detection
MAX_BOX_AREA_RATIO = 0.65

# تجاهل أي box صغير جدًا
MIN_BOX_AREA_RATIO = 0.0005

# =========================================================
# SSIM
# =========================================================
SSIM_PASS_THRESHOLD = 0.85
SSIM_WARN_THRESHOLD = 0.70
SSIM_ALERT_ENABLED = False

# =========================================================
# Timing
# =========================================================
ANALYSIS_INTERVAL_MS = 250
ALERT_COOLDOWN_SEC = 8

# =========================================================
# Storage
# =========================================================
EVENTS_DIR = BASE_DIR / "events"
CAPTURES_DIR = BASE_DIR / "captures"

EVENTS_DIR.mkdir(exist_ok=True)
CAPTURES_DIR.mkdir(exist_ok=True)

# =========================================================
# Train
# =========================================================
TRAIN_ID = "Train01"

# =========================================================
# Device
# =========================================================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

SEND_ALERTS_WHEN_STOPPED = True
STATIC_ALERT_RESEND_SEC = 60