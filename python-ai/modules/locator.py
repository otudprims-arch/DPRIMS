"""
DPRIMS — Defect Locator
يحسب الموقع الحقيقي للعيب على السكة
بناءً على track_position_cm من الـ Encoder + bbox من النموذج
"""
from config import (
    FRONT_FOV_START_CM, FRONT_FOV_CM, FRONT_CM_PER_PX,
    REAR_FOV_START_CM,  REAR_FOV_CM,  REAR_CM_PER_PX,
    RESOLUTION,
)


def locate_defect(
    detection:   dict,
    track_pos_cm: float,
    camera:      str,       # "front" أو "rear"
) -> dict:
    """
    يحسب موقع العيب الحقيقي على السكة

    المنطق:
    ─────────────────────────────────────────────
    الـ Encoder يقيس موقع المحور (نقطة الصفر على العربية)
    الكاميرا الأمامية تبدأ تشوف من FRONT_FOV_START_CM أمام المحور
    
    موقع العيب على السكة =
        track_pos_cm (موقع المحور)
      + FOV_START_CM (بداية ما تراه الكاميرا)
      + (مركز الـ bbox × cm_per_pixel)
    ─────────────────────────────────────────────
    """
    x1, y1, x2, y2 = detection["bbox"]

    # مركز الـ bbox بالـ pixel
    bbox_cx_px = (x1 + x2) / 2
    bbox_cy_px = (y1 + y2) / 2

    if camera == "front":
        fov_start    = FRONT_FOV_START_CM
        cm_per_px    = FRONT_CM_PER_PX
        fov_cm       = FRONT_FOV_CM
    else:
        fov_start    = REAR_FOV_START_CM
        cm_per_px    = REAR_CM_PER_PX
        fov_cm       = REAR_FOV_CM

    # المسافة من بداية FOV لمركز الـ bbox
    dist_in_fov_cm = bbox_cx_px * cm_per_px   # على طول السكة

    # الموقع الحقيقي على السكة (على طول)
    along_track_cm = track_pos_cm + fov_start + dist_in_fov_cm

    # الانحراف الجانبي (يمين +  /  يسار -)
    pixel_center   = RESOLUTION / 2
    lateral_px     = bbox_cx_px - pixel_center
    lateral_cm     = lateral_px * cm_per_px

    # حجم العيب بالـ cm
    width_cm  = (x2 - x1) * cm_per_px
    height_cm = (y2 - y1) * cm_per_px

    return {
        "along_track_cm":  round(along_track_cm, 1),  # موقعه على السكة
        "lateral_cm":      round(lateral_cm, 1),       # انحراف يمين/يسار
        "width_cm":        round(width_cm, 1),          # عرض العيب
        "height_cm":       round(height_cm, 1),         # طول العيب
        "camera":          camera,
        "track_pos_at_detection": round(track_pos_cm, 1),
    }


def should_confirm_with_rear(
    front_defect_pos_cm: float,
    track_pos_cm:        float,
) -> bool:
    """
    هل الكاميرا الخلفية يجب إنها تشوف نفس العيب دلوقتي؟
    
    الخلفية تشوف نفس مكان الأمامية بعد 79cm
    يعني لو الأمامية شافت عيب عند X،
    لما track_pos يوصل لـ (X - REAR_FOV_START_CM)
    الخلفية تكون قدام نفس المكان بالظبط
    """
    from config import REAR_FOV_START_CM
    expected_track_pos = front_defect_pos_cm - REAR_FOV_START_CM
    tolerance = 5.0   # ±5cm مقبول
    return abs(track_pos_cm - expected_track_pos) <= tolerance
