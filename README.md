
```markdown
# DPRIMS — المرجع الشامل لكتاب المشروع

> هذا الملف مرجع كامل لكل ما تحتاجه في كتاب مشروع التخرج.
> كل كود هنا هو النسخة النهائية المعتمدة — انسخه مباشرة.
> لا نستخدم GPS كمرجع للموقع — نستخدم **Encoder + track_position_cm** فقط.

---

## فهرس سريع

```
1. البنية العامة للنظام
2. Phase 1 — إعداد البيئة
3. Phase 2 — منظومة الطاقة والتوصيلات
4. Phase 3 — برمجة ESP32 (3 Sketches)
5. Phase 4 — تدريب نموذج YOLOv8
6. Phase 5 — خط أنابيب الذكاء الاصطناعي (analysis.py)
7. Phase 6 — الخادم والواجهة (Backend + Dashboard)
8. Phase 7 — الدمج والاختبار
9. الأنظمة المتبعة (Lock Rules)
```

---

## 1. البنية العامة للنظام

```
┌─────────────────────────────────────────────────────────────────┐
│                     DPRIMS System Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────────┐     │
│  │ESP32-CAM │   │ESP32-CAM │   │  Python AI Pipeline       │     │
│  │  Front   │   │  Rear    │   │  (analysis.py)           │     │
│  │  .101    │   │  .102    │   │                          │     │
│  └────┬─────┘   └────┬─────┘   │  ┌────────┐  ┌──────────┐   │     │
│       │              │         │  │YOLOv8  │  │  SSIM    │   │     │
│       │              │         │  └───┬────┘  └────┬─────┘   │     │
│       │              │         │      │              │         │     │
│       │         MJPEG Stream        │      └──────┬──────┘         │     │
│       │              │         │             │                │     │
│       │              ▼         │     Alert JSON                │     │
│       │         ┌──────────┐    │             ▼                │     │
│       │         │  Pipeline │────┼──► Node.js Backend          │     │
│       │         └──────────┘    │     │  (Express + Socket.io)     │     │
│       │                        │     │             ▼                │     │
│  ┌────┴─────┐                  │     │       React Dashboard      │     │
│  │ESP32     │                  │     │       (Vite + Leaflet)      │     │
│  │DevKit   │                  │     │                            │     │
│  │  .103    │                  │     │                            │     │
│  │          │                  │     │                            │     │
│  │ Motors   │   GPS (اختياري)  │     │                            │     │
│  │ Encoder  │   ──► lat/lng     │     │                            │     │
│  │ (GPIO34) │                  │     │                            │     │
│  │          │                  │     │                            │     │
│  │ ──► Telemetry ────────────┼─────┘                            │     │
│  │    JSON                   │                                  │     │
│  │    (كل 500ms)             │                                  │     │
│  │                           │                                  │     │
│  │  ◄── Commands ◄──           │                                  │     │
│  │  start/stop/emergency       │                                  │     │
│  │  (من Dashboard)            │                                  │     │
│  └──────────┘                  └──────────────────────────────────┘     │
│                                                                 │
│  ملاحظة: track_position_cm هو المرجع الأساسي للموقع              │
│          GPS يُستخدم كمرجع مكمل فقط (اختياري)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1 — إعداد البيئة

### المسار المعتمد

```
D:\0x\dprims-project\
├── backend/
├── frontend/
├── python-ai/
│   ├── models/best.pt          ← نموذج YOLOv8 من Roboflow
│   ├── modules/
│   ├── events/                  ← صور الأحداث المحفوظة
│   └── venv/
├── firmware/
│   ├── esp32cam-front/
│   ├── esp32cam-rear/
│   └── esp32-devkit/
├── docs/
├── logs/
├── data/db/
└── .gitignore
```

### أوامر التشغيل السريعة

```powershell
# 1. تشغيل MongoDB
mongod --dbpath "D:\0x\dprims-project\data\db"

# 2. تشغيل Backend
cd "D:\0x\dprims-project\backend"
npm start

# 3. تشغيل Frontend
cd "D:\0x\dprims-project\frontend"
npm run dev

# 4. تشغيل Pipeline
cd "D:\0x\dprims-project\python-ai"
.\venv\Scripts\Activate.ps1
python analysis.py
```

### المتطلبات المثبتة

```
Python 3.10.11
Node.js v20.20.2
MongoDB Server 7.0
Git
Arduino IDE 2.3.2
```

---

## 3. Phase 2 — منظومة الطاقة والتوصيلات

### مسار الطاقة

```
Solar Panel 12V/5W
       │
       ▼
PWM Solar Controller
       │
       ▼
BMS 3S + بطاريات 18650 (3S2P = 11.1V)
       │
       ▼
Fuse 5A
       │
       ▼
═══ 12V Bus ════════════════════════
       │
  ┌────┴────┬──────────┐
  │         │          │
  ▼         ▼          ▼
L298N   Buck#1    Buck#2
(12V)   (5V)       (5V)
  │         │          │
  ▼         ▼          ▼
محركين  ESP32-CAM  ESP32 DevKit
(يمين    (أمامي     (تحكم +
 ويسر)    وخلفي)     GPS + Encoder)
```

### توصيلات ESP32 DevKit الحرجة

```
GPIO 26  →  L298N ENA  (PWM سرعة يمين)
GPIO 27  →  L298N IN1  (اتجاه يمين)
GPIO 14  →  L298N ENB  (PWM سرعة يسار)
GPIO 12  →  L298N IN4  (اتجاه يسار)
GPIO 16  →  GPS TX     (UART2 RX)
GPIO 17  →  GPS RX     (UART2 TX)
GPIO 34  →  Encoder DO  (نبضات المسافة)
GPIO 2   →  Built-in LED (مؤشر)
```

### حساب المسافة بالـ Encoder

```python
# القيم الثابتة (غيّرها حسب القياس الفعلي)
WHEEL_DIAMETER_CM = 6.0
ENCODER_PULSES_PER_REV = 20
WHEEL_CIRCUMFERENCE = 3.14159 * 6.0  # = 18.85 cm
DISTANCE_PER_PULSE = 18.85 / 20     # = 0.9425 cm

# في كل تحديث:
track_position_cm = pulse_count * DISTANCE_PER_PULSE

# مع الاتجاه:
# forward → track_position_cm += delta * DISTANCE_PER_PULSE
# backward → track_position_cm -= delta * DISTANCE_PULSE
```

### تحذيرات أمان

```
⚠️ ضبط Buck Converters على 5.00V قبل ربط أي ESP32
⚠️ لا تستخدم GPIO 6-11 (مربوطة بالـ Flash)
⚠️ GPIO 34-39 هي Input-only
⚠️ لا تلحم مباشرة على أطراف البطاريات
⚠️ تأكد Common Ground بين كل الوحدات
⚠️ Fuse 5A لازم يكون على خط البطارية
```

---

## 4. Phase 3 — برمجة ESP32 (3 Sketches)

### Sketch 1: ESP32-CAM Front (كاميرا أمامية)

```cpp
// ESP32-CAM Front — IP: 192.168.1.101
// Board: AI Thinker ESP32-CAM
// وظيفة: بث MJPEG فقط — لا تحكم ولا مستشعرات

#include "esp_camera.h"
#include <WiFi.h>

const char* ssid = "DPRIMS_Network";
const char* password = "dprims2026";
IPAddress local_IP(192, 168, 1, 101);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);

// AI-Thinker Pin Map
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM    22

void startCameraServer(); // مدمجة من app_httpd.cpp

void setup() {
  Serial.begin(115200);

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_VGA;  // 640x480
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 2;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera init failed");
    return;
  }

  WiFi.config(local_IP, gateway, subnet);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  Serial.print("Front Cam IP: ");
  Serial.println(WiFi.localIP());

  startCameraServer();
}

void loop() {
  delay(10000);
}
```

### Sketch 2: ESP32-CAM Rear

> مطابق للـ Front مع تغيير IP فقط إلى `192.168.1.102`

### Sketch 3: ESP32 DevKit (التحكم الرئيسي)

```cpp
// ESP32 DevKit — IP: 192.168.1.103
// Board: ESP32 Dev Module
// الوظائف: محركات + GPS + Encoder + WebSocket + Telemetry

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// WiFi
const char* SSID = "DPRIMS_Network";
const char* PASS = "dprims2026";
IPAddress local_IP(192, 168, 1, 103);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);

// WebSocket
const char* WS_HOST = "192.168.1.100";
const uint16_t WS_PORT = 3000;
const char* WS_PATH = "/socket.io/?EIO=4&transport=websocket";

// Motor Pins
#define ENA 26   // PWM سرعة يمين
#define IN1 27   // اتجاه يمين
#define IN2 14   // ← غير مستخدم في خطي
#define IN3 12   // ← غير مستخدم في خطي
#define IN4 13   // اتجاه يسار
#define ENB 25   // PWM سرعة يسار

// Encoder
#define ENCODER_PIN 34
volatile unsigned long pulseCount = 0;
const float DIST_PER_PULSE = 0.9425;  // غيّرها حسب القياس الفعلي

// GPS
HardwareSerial GPSSerial(2);  // UART2 على GPIO 16/17
TinyGPSPlus gps;

// State
WebSocketsClient webSocket;
int currentSpeed = 150;
bool isRunning = false;
String direction = "stop";

// Encoder ISR
void IRAM_ATTR onEncoderPulse() {
  pulseCount++;
}

// Motor Control
void setSpeed(int s) {
  currentSpeed = constrain(s, 0, 255);
  analogWrite(ENA, currentSpeed);
  analogWrite(ENB, currentSpeed);
}

void forward() {
  digitalWrite(IN1, HIGH); digitalWrite(IN4, HIGH);
  setSpeed(currentSpeed);
  direction = "forward";
  isRunning = true;
}

void backward() {
  digitalWrite(IN1, LOW); digitalWrite(IN4, LOW);
  setSpeed(currentSpeed);
  direction = "backward";
  isRunning = true;
}

void stopMotors() {
  digitalWrite(IN1, LOW); digitalWrite(IN4, LOW);
  analogWrite(ENA, 0); analogWrite(ENB, 0);
  isRunning = false;
}

void brakeHard() {
  // فرملة طوارئ: كل IN = HIGH لفترة قصيرة
  digitalWrite(IN1, HIGH); digitalWrite(IN4, HIGH);
  delay(100);
  stopMotors();
}

// Telemetry — يُرسل كل 500ms
void sendTelemetry() {
  StaticJsonDocument<256> doc;
  doc["type"] = "telemetry";
  doc["train_id"] = "Train01";
  doc["ts"] = millis();
  doc["pulse_count"] = pulseCount;
  doc["distance_per_pulse_cm"] = DIST_PER_PULSE;
  doc["track_position_cm"] = pulseCount * DIST_PER_PULSE;
  doc["speed_cm_s"] = isRunning ? (currentSpeed / 255.0) * 30.0 : 0;
  doc["speed_pct"] = currentSpeed;
  doc["running"] = isRunning;
  doc["direction"] = direction;

  if (gps.location.isValid()) {
    JsonObject g = doc.createNestedObject("gps");
    g["lat"] = gps.location.lat();
    g["lng"] = gps.location.lng();
    g["hdop"] = gps.hdop.value();
  }

  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
}

// WebSocket Events
void onWebSocketEvent(WStype_t type, uint8_t* payload, size_t len) {
  switch (type) {
    case WStype_CONNECTED:
      webSocket.sendTXT("{\"type\":\"hello\"}");
      break;
    case WStype_TEXT: {
      StaticJsonDocument<128> doc;
      deserializeJson(doc, payload);
      const char* cmd = doc["cmd"];
      if (strcmp(cmd, "start") == 0) forward();
      else if (strcmp(cmd, "stop") == 0) stopMotors();
      else if (strcmp(cmd, "emergency_stop") == 0) brakeHard();
      else if (strcmp(cmd, "speed") == 0) setSpeed(doc["value"]);
      else if (strcmp(cmd, "backward") == 0) backward();
      else if (strcmp(cmd, "resetenc") == 0) { pulseCount = 0; }
      break;
    }
    case WStype_DISCONNECTED:
      stopMotors(); // أمان: وقف فوراً عند الانقطاع
      break;
  }
}

void setup() {
  Serial.begin(115200);

  // Motors
  pinMode(ENA, OUTPUT); pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT); pinMode(IN4, OUTPUT);
  stopMotors();

  // Encoder
  pinMode(ENCODER_PIN, INPUT_PULLUP);
  attachInterrupt(ENCODER_PIN, onEncoderPulse, RISING);

  // GPS
  GPSSerial.begin(9600, SERIAL_8N1, 16, 17);

  // WiFi
  WiFi.config(local_IP, gateway, subnet);
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }

  // WebSocket
  webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(onWebSocketEvent);
  webSocket.setReconnectInterval(2000);
}

unsigned long lastSend = 0;
void loop() {
  webSocket.loop();
  while (GPSSerial.available()) gps.encode(GPSSerial.read());

  if (millis() - lastSend > 500) {
    sendTelemetry();
    lastSend = millis();
  }
}
```

### خطوات رفع الكود على ESP32-CAM

```
1. وصّل IO0 ↔ GND
2. اضغط RST
3. اضغط Upload في Arduino IDE
4. لما تشوف "Connecting..." افصل IO0 عن GND
5. بعد "Done" افصل USB-TTL ووصّل 5V من Buck#1
6. افتح Serial Monitor (115200) وشوف IP
```

---

## 5. Phase 4 — تدريب نموذج YOLOv8

### الفئات الخمس (لازم تطابق بالظبط في Roboflow)

```
class_id  class_name       الوصف
────────  ──────────────  ──────────────────
0         crack            شروخ دقيقة
1         broken_rail       كسر كامل
2         rail_gap          فجوة بين قضيبين
3         missing_bolt      برغي مفقود
4         sleeper_damage    تلف في الفلنكات
```

### تحميل الأوزان من Roboflow

```
Roboflow → Project → Versions → Export
Format: YOLOv3 (أو YOLOv8)
Download: weights/best.pt (~6 MB)
حفظه في: D:\0x\dprims-project\python-ai\models\best.pt
```

### اختبار الموديل

```python
from ultralytics import YOLO

model = YOLO("./models/best.pt")

# شوف أسماء الكلاسات (لازم تطابق)
print(model.names)
# المفروض: {0: 'crack', 1: 'broken_rail', 2: 'rail_gap', ...}

# اختبر على صورة
results = model.predict("test_image.jpg", conf=0.35)
for r in results:
    for box in r.boxes:
        cls_id = int(box.cls[0])
        cls_name = model.names[cls_id]
        conf = float(box.conf[0])
        print(f"class_id={cls_id} | class_name={cls_name} | conf={conf:.3f}")
```

### أرقام الأداء المستهدفة

```
mAP@0.5          ≥ 0.80
Precision         ≥ 0.85
Recall            ≥ 0.75
مدة التدريب       ~3 ساعات (Colab T4)
حجم best.pt       ~6 MB
```

---

## 6. Phase 5 — خط أنابيب الذكاء الاصطناعي

### هيكل المجلد

```
python-ai/
├── analysis.py           ← نقطة الدخول الرئيسية
├── config.py             ← كل الإعدادات في مكان واحد
├── modules/
│   ├── stream.py         ← قراءة بث الكاميرات
│   ├── detector.py       ← تشغيل YOLOv8
│   ├── ssim_check.py     ← مقارنة البنية
│   ├── telemetry.py      ← WebSocket مع DevKit
│   └── alerts.py         ← بناء وإرسال Alert JSON
├── models/
│   └── best.pt           ← من Phase 4
├── events/               ← صور الأحداث
└── requirements.txt
```

### config.py

```python
from pathlib import Path

# الشبكة
FRONT_CAM_URL = "http://192.168.1.101/stream"
REAR_CAM_URL  = "http://192.168.1.102/stream"
DEVKIT_WS_URL = "ws://192.168.1.103/ws"
BACKEND_HTTP_URL = "http://192.168.1.100:5000/api/alerts"

# النموذج
MODEL_PATH = Path("./models/best.pt")
CONF_THRESHOLD = 0.35
IOU_THRESHOLD = 0.45

# الفئات (لازم تطابق Roboflow بالظبط)
CLASS_NAMES = {
    0: "crack",
    1: "broken_rail",
    2: "rail_guess",        # غيّر حسب اسمك في Roboflow
    3: "missing_bolt",
    4: "sleeper_damage",
}

# SSIM العتب
SSIM_ALERT_THRESHOLD = 0.70  # أقل من ده = تنبيه

# التوقيت
ANALYSIS_INTERVAL_MS = 200
ALERT_COOLDOWN_SEC = 3       # منع تكرار نفس التنبيه

# التخزين
EVENTS_DIR = Path("./events")
EVENTS_DIR.mkdir(exist_ok=True)
TRAIN_ID = "Train01"
```

> **ملاحظة مهمة:** `CLASS_NAMES` لازم تطابق أسماء الكلاسات في Roboflow بالظبط.
> لو في Roboflow الاسم `Broken Rail` (كابيتال) لازم يكون هنا `broken_rail` (سمول).

### modules/detector.py

```python
from ultralytics import YOLO
from config import MODEL_PATH, CONF_THRESHOLD, IOU_THRESHOLD, CLASS_NAMES

class DefectDetector:
    def __init__(self):
        self.model = YOLO(str(MODEL_PATH))

    def detect(self, frame):
        """
        يُرجع مصفوفة من الكشوفات.
        كل كشف فيه: class_id + class_name + confidence + bbox
        """
        results = self.model.predict(
            frame,
            conf=CONF_THRESHOLD,
            iou=IOU_THRESHOLD,
            verbose=False,
        )

        defects = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = CLASS_NAMES.get(cls_id, "unknown")
                conf = float(box.conf[0])
                xyxy = box.xyxy[0].tolist()

                defects.append({
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": round(conf, 3),
                    "bbox": [int(v) for v in xyxy],
                })

        return defects
```

### modules/ssim_check.py

```python
import cv2
from skimage.metrics import structural_similarity as ssim
from config import SSIM_ALERT_THRESHOLD

def compare_frames(front, rear):
    """
    تقارن بين الأمامي والخلفي.
    الخلفي بيتقلب أفقياً (كاميرا خلفية شايفة عكس الاتجاه).
    ترجع: (score, status)
    """
    rear_resized = cv2.resize(rear, (front.shape[1], front.shape[0]))
    rear_flipped = cv2.flip(rear_resized, 1)

    g1 = cv2.cvtColor(front, cv2.COLOR_BGR2GRAY)
    g2 = cv2.cvtColor(rear_flipped, cv2.COLOR_BGR2GRAY)

    score, _ = ssim(g1, g2, full=True)

    status = "alert" if score < SSIM_ALERT_THRESHOLD else "pass"
    return round(score, 4), status
```

### modules/telemetry.py

```python
import websocket
import json
import threading
import logging

log = logging.getLogger(__name__)

class TelemetryClient:
    """
    يتصل بـ ESP32 DevKit ويقرأ Telemetry كل 500ms.
    يحفظ آخر state في self.state.
    """
    def __init__(self):
        self.state = {
            "track_position_cm": 0,
            "speed_cm_s": 0,
            "running": False,
            "direction": "stop",
            "gps": {"lat": None, "lng": None},
        }

    def _on_message(self, ws, message):
        try:
            data = json.loads(message)
            # تحديث الـ state
            self.state["track_position_cm"] = data.get("track_position_cm", 0)
            self.state["speed_cm_s"] = data.get("speed_cm_s", 0)
            self.state["running"] = data.get("running", False)
            self.state["direction"] = data.get("direction", "stop")
            if data.get("gps"):
                self.state["gps"] = data["gps"]
        except Exception as e:
            log.warning(f"فشل فك الرسالة: {e}")

    def _on_open(self, ws):
        log.info("✅ اتصال DevKit مفتوح")

    def _on_close(self, ws, *args):
        log.warning("❌ انقطع اتصال DevKit")
        self.state["running"] = False

    def start(self):
        ws = websocket.WebSocketApp(
            "ws://192.168.1.103/ws",
            on_open=self._on_open,
            on_message=self.__message,
            on_close=self._on_close,
        )
        t = threading.Thread(target=ws.run_forever, daemon=True)
        t.start()
        return ws
```

### modules/alerts.py

```python
import json
import time
import uuid
import logging
import cv2
import requests
from pathlib import Path
from config import (
    BACKEND_HTTP_URL, EVENTS_DIR, TRAIN_ID
)

log = logging.getLogger(__name__)

class AlertSender:
    """
    يبني Alert JSON بالشكل المعتمد في dashboard-api-spec.md
    ويرسله للـ Backend عبر HTTP POST.
    """
    def build(self, defects, ssim_score, telemetry, camera, frame):
        # تحديد نوع التنبيه
        if defects:
            alert_type = "rail_defect"
        else:
            alert_type = "ssim_anomaly"

        payload = {
            "type": alert_type,
            "timestamp": int(time.time() * 1000),
            "train_id": TRAIN_ID,
            "camera": camera,
            "track_position_cm": telemetry.get("track_position_cm", 0),
            "speed_cm_s": telemetry.get("speed_cm_s", 0),
            "direction": telemetry.get("direction", "stop"),
            "gps": telemetry.get("gps", {"lat": None, "lng": None}),
            "defects": defects,
            "ssim_anomaly_score": round(ssim_score, 4),
        }

        # حفظ الصورة (اختياري)
        if frame is not None:
            event_id = str(uuid.uuid4())[:8]
            path = EVENTS_DIR / f"{event_id}_{camera}.jpg"
            cv2.imwrite(str(path), frame)

        return payload

    def send(self, payload):
        """إرسال Alert للـ Backend عبر HTTP POST"""
        try:
            resp = requests.post(
                BACKEND_HTTP_URL,
                json=payload,
                timeout=3,
            )
            if resp.status_code in (200, 201):
                log.info(f"✅ تنبيه مُرسل بنجاح — HTTP {resp.status_code}")
            else:
                log.error(f"فشل الإرسال — HTTP {resp.status_code}")
        except requests.exceptions.RequestException as e:
            log.error(f"Backend غير متاح: {e}")
```

### analysis.py (الملف الرئيسي)

```python
#!/usr/bin/env python3
"""
DPRIMS — Main AI Pipeline
"""
import queue
import time
import logging
import colorlog

from config import (
    FRONT_CAM_URL, REAR_CAM_URL,
    ANALYSIS_INTERVAL_MS, ALERT_COOLDOWN_SEC,
)
from modules.stream import CameraStream
from modules.detector import DefectDetector
from modules.ssim_check import compare_frames
from modules.telemetry import TelemetryClient
from modules.alerts import AlertSender

# إعداد اللوج الملون
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    "%(log_color)s[%(asctime)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
))
logging.basicConfig(level=logging.INFO, handlers=[handler])
log = logging.getLogger("DPRIMS")

def main():
    log.info("🚆 DPRIMS AI Pipeline — بدء التشغيل")

    # 1. Queues للكاميرات
    q_front = queue.Queue(maxsize=5)
    q_rear = queue.Queue(maxsize=5)

    # 2. تشغيل قراءة الكاميرات في Threads
    cam_f = CameraStream(FRONT_CAM_URL, "FRONT", q_front)
    cam_f.start()

    cam_r = CameraStream(REAR_CAM_URL, "REAR", q_rear)
    cam_r.start()

    # 3. تشغيل قراءة Telemetry من DevKit
    tele = TelemetryClient()
    tele.start()

    # 4. تشغيل النموذج
    detector = DefectDetector()

    # 5. إعداد إرسال التنبيهات
    alerts = AlertSender()

    last_alert_time = 0

    # 6. الحلقة الرئيسية
    try:
        while True:
            time.sleep(ANALYSIS_INTERVAL_MS / 1000)

            # التحقق من وجود فريمات
            if q_front.empty() or q_rear.empty():
                continue

            ts_f, frame_f = q_front.get()
            ts_r, frame_r = q_rear.get()

            # تشغيل YOLOv8 على الأمامي
            defects = detector.detect(frame_f)

            # مقارنة SSIM
            ssim_score, ssim_status = compare_frames(frame_f, frame_r)

            # هل في تنبيه؟
            should_alert = bool(defects) or (ssim_status == "alert")

            if should_alert:
                now = time.time()
                if now - last_alert_time < ALERT_COOLDOWN_SEC:
                    continue
                last_alert_time = now

                # بناء Alert JSON
                payload = alerts.build(
                    defects=defects,
                    ssim_score=ssim_score,
                    telemetry=tele.state,
                    camera="front",
                    frame=frame_f,
                )

                # إرسال للـ Backend
                alerts.send(payload)

                log.warning(
                    f"⚠️ تنبيه: "
                    f"{'YOLO' if defects else 'SSIM'} | "
                    f"Score: {ssim_score} | "
                    f"Pos: {tele.state.get('track_position_cm', 0):.1f}cm"
                )

    except KeyboardInterrupt:
        log.info("⏹️ إيقاف يدوي")
    finally:
        cam_f.stop()
        cam_r.stop()

if __name__ == "__main__":
    main()
```

### نموذج Alert JSON الناتج

```json
{
  "type": "rail_defect",
  "timestamp": 1710000000000,
  "train_id": "Train01",
  "camera": "front",
  "track_position_cm": 94.25,
  "speed_cm_s": 18.4,
  "direction": "forward",
  "gps": {
    "lat": 30.123456,
    "lng": 31.123456
  },
  "defects": [
    {
      "class_id": 0,
      "class_name": "crack",
      "confidence": 0.87,
      "bbox": [145, 220, 340, 410]
    }
  ],
  "ssim_anomaly_score": 0.61
}
```

---

## 7. Phase 6 — الخادم والواجهة

### الـ Backend (Node.js)

```
backend/
├── src/
│   ├── app.js              ← التطبيق الرئيسي
│   ├── server.js            ← نقطة البدء
│   ├── config/db.js         ← اتصال MongoDB
│   ├── models/Alert.js       ← Schema للتنبيهات
│   ├── routes/
│   │   ├── alerts.routes.js    ← POST/GET alerts
│   │   ├── telemetry.routes.js ← POST/GET telemetry
│   │   └── control.routes.js  ← POST control commands
│   └── sockets/
│       └── dashboard.socket.js ← Socket.io events
├── .env                    ← PORT, MONGO_URI
└── package.json
```

### الـ REST API

```
GET  /api/health              → {"ok": true}
POST /api/alerts             → {"ok": true, "alert_id": "..."}
GET  /api/alerts              → [{alert}, ...]
GET  /api/alerts/:id           → {alert}
POST /api/telemetry          → {"ok": true}
GET  /api/telemetry/latest     → {latest_telemetry}
POST /api/control            → {"ok": true, "queued": true}
```

### Socket.io Events

```
Server → Client:
  dashboard:init        → أول بيانات عند الاتصال
  telemetry:update    → تحديث التلميتري الحي
  alert:new           → تنبيه جديد
  system:status       → حالة الخدمات
  control:ack          = تأكيد استلام الأمر

Client → Server:
  control:command      → أمر تحكم {action: "start"}
  dashboard:ping       → فحص الاتصال
```

### الـ Dashboard (React)

```
frontend/src/
├── components/
│   ├── TopBar.jsx
│   ├── StatusCards.jsx
│   ├── CameraPanel.jsx        ← img src="http://192.168.1.101/stream"
│   ├── MapPanel.jsx         ← Leaflet (لو GPS متوفر)
│   ├── AlertsTable.jsx       ← جدول التنبيهات الحية
│   └── ControlPanel.jsx      ← أزرار Start/Stop/Emergency
├── hooks/
│   └── useSocket.js         ← الاتصال بـ Socket.io
├── services/
│   ├── api.js              ← REST calls
│   └── socket.js           ← Socket client
└── pages/
    └── Dashboard.jsx
```

---

## 8. Phase 7 — الدمج والاختبار

### ترتيب التشغيل النهائي

```
1. mongod --dbpath ./data/db
2. cd backend && npm start
3. cd python-ai && venv\Scripts\Activate.ps1 && python analysis.py
4. cd frontend && npm run dev
5. شغّل القطار على السكة
6. اختبر السيناريوهات
```

### السيناريوهات الاختبار

```
# 1. Boot-up
كل الخدمات تعمل بدون أخطاء

# 2. Cameras Live
الكاميرتان ظاهرتين في Dashboard بدون lag

# 3. Healthy Track
لا تنبيهات على سكة سليمة · SSIM ≥ 0.85

# 4. Crack Detection
صورة مطبوعة لقضيب مشروخ → تنبيه "crack"

# 5. Broken Rail
قضيب مكسور → تنبيه "broken_rail" (critical)

# 6. SSIM Anomaly
تغطية الكاميرا بالإصبع → تنبيه "ssim_anomaly"

# 7. Remote Control
ضغط "طوارئ" في Dashboard → القطار يقف < 500ms

# 8. Power Failure
فصل USB → البطارية الشمسية تستمر > 30 ثانية
```

### شنطة الطوارئ (يوم العرض)

```
□ ESP32 احتياطي × 2 (مبرمج مسبقاً)
□ ESP32-CAM احتياطي × 1
□ Jumper wires + Breadboard إضافي
□ Multimeter
□ Power Bank 20,000mAh
□ USB cables × 3
□ Router صغير + كابل LAN
□ Hotspot موبايل مشحون
□ لابتوب أساسي + لابتوب بديل
□ USB Flash (كود + فيديو + عرض)
□ طقم أدوات صغير
□ لاصق كهربائي
□ مصباح LED محمول
□ أوراق طباعة المخططات + عرض ورقي
```

---

## 9. الأنظمة المقفلة (Lock Rules)

### لا تغيّر هذه الأسماء بدون اتفاق:

```
❌ track_position_cm  (اسم الحقل الأساسي للموقع)
❌ defects           (مصفوفة الكشوفات — مش كائن واحد)
❌ class_name        (اسم الفئة داخل كل كشف)
❌ class_id          (رقم الفئة)
❌ camera           ("front" أو "rear")
❌ direction        ("forward" أو "backward" أو "stop")
❌ ssim_anomaly_score (اسم الحقل — مش ssim_score)
❌ Socket events:    telemetry:update, alert:new, control:command
❌ REST routes:      /api/alerts, /api/telemetry, /api/control
❌ CONF_THRESHOLD = 0.35
❌ IOU_THRESHOLD = 0.45
❌ ALERT_COOLDOWN_SEC = 3
```

---

## 10. الأسئلة الشائعة والإجابات

### س: لماذا YOLOv8 وليس YOLOv5؟
**ج:** أحدث (+3% mAP)، مكتبته Ultralytics موحدة وأسهل، ودعم رسمي أفضل.

### س: لماذا SSIM وليس MSE؟
**ج:** SSIM يحاكي الإدراك البشري للاختلاف البني — MSE يقيس فرق البكسل فقط.

### س: لماذا لا تستخدمون Cloud؟
**ج:** Latency عالي، تكلفة مستمرة، واعتماد على الإنترنت. محلي أسرع وأرخص.

### س: النموذج على القطار ولا اللابتوب؟
**ج:** حالياً اللابتوب. لكن مع Jetson Nano ($149) يقدر يعمل على القطار نفسه.

### س: ما حجم الـ dataset؟
**ج:** 1,200 صورة أصلية × 3 augmentation ≈ 3,600 صورة.

### س: كم التكلفة؟
**ج:** $87 للعتاد + $0 للبرامج.

### س: لو الكاميرا الأمامية فشلت؟
**ج:** الخلفية تستمر. SSIM يتحول لمقارنة مع صور تاريخية.

### س: لماذا track_position_cm مش GPS؟
**ج:** المشروع يتحرك على مسار خطي معروف. المسافة الخطية أدق من GPS لمسافات قصيرة.

### س: كيف تمنعون False Alarms؟
**ج:** Cooldown 3 ثواني + conf ≥ 0.35 + تأكيد مزدوج (YOLO + SSIM).

### س: هل ممكن نجرّب المشروع بأنفسنا؟
**ج:** نعم — كل شيء على GitHub مع README كامل + فيديو تشغيل.

---

## 11. خلاصة: ما يُكتب في الكتاب

### الصفحة 1-2: المقدمة + المشكلة
### الصفحة 3-4: البنية العامة + هيكل المشروع
### الصفحة 5-8: Phase 1-2 (بيئة + عتاد)
### الصفحة 9-12: Phase 3-4 (ESP32 + AI Training)
### الصفحة 13-16: Phase 5-6 (Pipeline + Dashboard)
### الصفحة 17-18: Phase 7 (دمج) + الخلاصة

### لا تنسخ من هنا:
- لا تضف معلومات مشكوك فيها (مثلاً "النظام بيستخدم GPS كمرجع أساسي")
- لا تغيّر أسماء الفئات أو الـ API بدون توثيق
- لا تضف عناوين الأشخاص الحقيقية في الكود
- لا تضف أسئلة سبق وقعت فيها فعلاً (اكتب "ملاحظة: مش قيدس ..." لو لسه متأكد)
- لا تنسخ من الإنترنت بدون ذكر المصدر
```

---

## 12. المصادر

```
مكتبة Ultralytics YOLOv8:        https://docs.ultralytics.com
مكتبة OpenCV:                https://docs.opencv.org
مكتبة scikit-image:           https://scikit-image.org
مكتبة Socket.io:            https://socket.io/docs
مكتبة Leaflet:              https://leafletjs.com
مشروع Roboflow:              https://roboflow.com
مكتبة Express:              https://expressjs.com
مكتبة React:                https://react.dev
```
```
