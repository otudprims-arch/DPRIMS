# python-ai/modules/track_geometry.py
from dataclasses import dataclass
from typing import Dict, List, Tuple


# =========================================================
# DPRIMS Track Geometry Calibration
# كل الأرقام بالسنتيمتر
# =========================================================

TRACK_TOTAL_CM = 304.0

SECTION_A_START_CM = 0.0
SECTION_A_END_CM = 101.0

SECTION_B_START_CM = 101.0
SECTION_B_END_CM = 203.0

SECTION_C_START_CM = 203.0
SECTION_C_END_CM = 304.0

RAIL_JOINT_CENTER_CM = 152.0
RAIL_JOINT_LENGTH_CM = 22.0
RAIL_JOINT_START_CM = RAIL_JOINT_CENTER_CM - (RAIL_JOINT_LENGTH_CM / 2.0)
RAIL_JOINT_END_CM = RAIL_JOINT_CENTER_CM + (RAIL_JOINT_LENGTH_CM / 2.0)

# بيانات العربية حسب ESP32 تقريبًا
AXLE_DISTANCE_CM = 35.5
CART_BOTTOM_LENGTH_CM = 70.0
CART_TOP_LENGTH_CM = 60.0
WHEEL_DIAMETER_CM = 6.0

# مهم:
# ESP32 عندك official_position_cm غالبًا يمثل rear wheel / encoder position.
# لذلك:
# rear camera offset من نقطة الإنكودر
# front camera offset = rear camera offset + المسافة بين الكاميرتين
REAR_CAMERA_OFFSET_FROM_ENCODER_CM = 8.0
CAMERA_GAP_CM = 75.0
FRONT_CAMERA_OFFSET_FROM_ENCODER_CM = REAR_CAMERA_OFFSET_FROM_ENCODER_CM + CAMERA_GAP_CM

# FOV correction مؤقت:
# هنسيبه 0 حاليًا عشان ما نزوّدش لخبطة المكان.
# بعد ما نعمل calibration حقيقي للكاميرا ممكن نستخدم bbox_y.
USE_BBOX_POSITION_CORRECTION = False
FRONT_VIEW_DEPTH_CM = 35.0
REAR_VIEW_DEPTH_CM = 35.0


SLEEPERS: List[Dict] = [
    {"id": "S1", "start": 0.0, "end": 7.0},
    {"id": "S2", "start": 21.0, "end": 28.0},
    {"id": "S3", "start": 42.0, "end": 47.0},
    {"id": "S4", "start": 63.0, "end": 70.0},
    {"id": "S5", "start": 83.0, "end": 90.0},
    {"id": "S6", "start": 104.0, "end": 112.0},
    {"id": "S7", "start": 126.0, "end": 133.0},
    {"id": "S8", "start": 149.0, "end": 156.0},
    {"id": "S9", "start": 170.0, "end": 177.0},
    {"id": "S10", "start": 191.0, "end": 198.0},
    {"id": "S11", "start": 212.0, "end": 219.0},
    {"id": "S12", "start": 233.0, "end": 240.0},
    {"id": "S13", "start": 254.0, "end": 261.0},
    {"id": "S14", "start": 275.0, "end": 282.0},
    {"id": "S15", "start": 296.0, "end": 303.0},
]


@dataclass
class CameraTrackPosition:
    encoder_cm: float
    rear_camera_cm: float
    front_camera_cm: float
    active_camera_cm: float
    defect_position_cm: float
    active_camera: str
    zone: str
    nearest_sleeper: str
    nearest_sleeper_center_cm: float
    rail_joint_distance_cm: float
    is_on_rail_joint: bool


def clamp(value: float, min_value: float = 0.0, max_value: float = TRACK_TOTAL_CM) -> float:
    try:
        n = float(value)
    except Exception:
        n = 0.0

    return max(min_value, min(n, max_value))


def get_zone(position_cm: float) -> str:
    position_cm = clamp(position_cm)

    if RAIL_JOINT_START_CM <= position_cm <= RAIL_JOINT_END_CM:
        return "Rail Joint Zone"

    if SECTION_A_START_CM <= position_cm <= SECTION_A_END_CM:
        return "Zone A"

    if SECTION_B_START_CM < position_cm <= SECTION_B_END_CM:
        return "Zone B"

    if SECTION_C_START_CM < position_cm <= SECTION_C_END_CM:
        return "Zone C"

    return "Unknown"


def sleeper_center(sleeper: Dict) -> float:
    return (float(sleeper["start"]) + float(sleeper["end"])) / 2.0


def get_nearest_sleeper(position_cm: float) -> Tuple[str, float]:
    position_cm = clamp(position_cm)

    nearest = min(
        SLEEPERS,
        key=lambda s: abs(position_cm - sleeper_center(s))
    )

    return nearest["id"], sleeper_center(nearest)


def distance_to_rail_joint(position_cm: float) -> float:
    position_cm = clamp(position_cm)

    if RAIL_JOINT_START_CM <= position_cm <= RAIL_JOINT_END_CM:
        return 0.0

    if position_cm < RAIL_JOINT_START_CM:
        return round(RAIL_JOINT_START_CM - position_cm, 2)

    return round(position_cm - RAIL_JOINT_END_CM, 2)


def is_on_rail_joint(position_cm: float) -> bool:
    position_cm = clamp(position_cm)
    return RAIL_JOINT_START_CM <= position_cm <= RAIL_JOINT_END_CM


def get_bbox_depth_offset_cm(defect: dict, camera: str) -> float:
    """
    Optional future correction.
    حاليًا مقفول لأن زاوية الكاميرات واتجاه السكة في الصورة محتاجين calibration.
    """
    if not USE_BBOX_POSITION_CORRECTION:
        return 0.0

    bbox = defect.get("bbox") or []

    if not isinstance(bbox, list) or len(bbox) != 4:
        return 0.0

    try:
        x1, y1, x2, y2 = bbox
        cy = (float(y1) + float(y2)) / 2.0

        # نفترض ارتفاع الصورة 640/480 تقريبًا. بعدين نعملها dynamic.
        image_h = 480.0
        ratio = max(0.0, min(cy / image_h, 1.0))

        depth_cm = FRONT_VIEW_DEPTH_CM if camera == "front" else REAR_VIEW_DEPTH_CM

        # مؤقتًا: منتصف الصورة تقريبًا = منتصف عمق الرؤية
        return (ratio - 0.5) * depth_cm

    except Exception:
        return 0.0


def get_camera_track_position(
    encoder_position_cm: float,
    defect_camera: str = "front",
    defect: dict | None = None,
) -> CameraTrackPosition:
    encoder_cm = clamp(encoder_position_cm)

    rear_camera_cm = clamp(encoder_cm + REAR_CAMERA_OFFSET_FROM_ENCODER_CM)
    front_camera_cm = clamp(encoder_cm + FRONT_CAMERA_OFFSET_FROM_ENCODER_CM)

    camera = (defect_camera or "front").lower()

    if camera == "rear":
        active_camera_cm = rear_camera_cm
        active_camera = "rear"
    elif camera == "dual":
        active_camera_cm = encoder_cm
        active_camera = "dual"
    else:
        active_camera_cm = front_camera_cm
        active_camera = "front"

    bbox_offset = get_bbox_depth_offset_cm(defect or {}, active_camera)
    defect_position_cm = clamp(active_camera_cm + bbox_offset)

    nearest_id, nearest_center = get_nearest_sleeper(defect_position_cm)

    return CameraTrackPosition(
        encoder_cm=round(encoder_cm, 2),
        rear_camera_cm=round(rear_camera_cm, 2),
        front_camera_cm=round(front_camera_cm, 2),
        active_camera_cm=round(active_camera_cm, 2),
        defect_position_cm=round(defect_position_cm, 2),
        active_camera=active_camera,
        zone=get_zone(defect_position_cm),
        nearest_sleeper=nearest_id,
        nearest_sleeper_center_cm=round(nearest_center, 2),
        rail_joint_distance_cm=distance_to_rail_joint(defect_position_cm),
        is_on_rail_joint=is_on_rail_joint(defect_position_cm),
    )


def enrich_alert_location(payload: dict) -> dict:
    """
    تضيف بيانات مكان العطل للـ payload قبل إرساله للباك إند.

    مهم:
    - encoder_position_cm = مكان القطر/الإنكودر
    - defect_position_cm = مكان العيب المحسوب حسب الكاميرا
    - track_position_cm نخليه = defect_position_cm عشان الفرونت يعرض العيب مباشرة
    """
    if payload is None:
        return payload

    telemetry_pos = (
        payload.get("official_position_cm")
        or payload.get("encoder_position_cm")
        or payload.get("track_position_cm")
        or 0
    )

    defect = payload.get("defect") or {}

    defect_camera = (
        payload.get("defect_camera")
        or defect.get("camera")
        or payload.get("camera")
        or "front"
    )

    geo = get_camera_track_position(
        encoder_position_cm=telemetry_pos,
        defect_camera=defect_camera,
        defect=defect,
    )

    payload["encoder_position_cm"] = geo.encoder_cm

    payload["rear_camera_position_cm"] = geo.rear_camera_cm
    payload["front_camera_position_cm"] = geo.front_camera_cm

    payload["camera"] = geo.active_camera
    payload["defect_camera"] = geo.active_camera

    payload["defect_position_cm"] = geo.defect_position_cm
    payload["track_position_cm"] = geo.defect_position_cm

    payload["track_zone"] = geo.zone
    payload["nearest_sleeper"] = geo.nearest_sleeper
    payload["nearest_sleeper_center_cm"] = geo.nearest_sleeper_center_cm
    payload["rail_joint_distance_cm"] = geo.rail_joint_distance_cm
    payload["is_on_rail_joint"] = geo.is_on_rail_joint

    if isinstance(defect, dict):
        defect["camera"] = geo.active_camera
        defect["track_position_cm"] = geo.defect_position_cm
        defect["defect_position_cm"] = geo.defect_position_cm
        defect["track_zone"] = geo.zone
        defect["nearest_sleeper"] = geo.nearest_sleeper
        defect["nearest_sleeper_center_cm"] = geo.nearest_sleeper_center_cm
        defect["rail_joint_distance_cm"] = geo.rail_joint_distance_cm
        defect["is_on_rail_joint"] = geo.is_on_rail_joint
        payload["defect"] = defect

    return payload