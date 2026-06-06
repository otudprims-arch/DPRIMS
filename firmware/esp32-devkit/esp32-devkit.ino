// ============================================================
// DPRIMS - ESP32 DevKit TRAIN CONTROL
// Board: ESP32 Dev Module
// Version: v4 - Stable Auto Mode + Sleeper Aware Telemetry
//
// Features:
// 1. Motor control over WebSocket
// 2. Encoder distance calculation
// 3. Stable Auto Mode controlled locally by ESP32
// 4. Live position update in every loop
// 5. Sleeper / Zone / Rail Joint telemetry
// 6. Dashboard-ready JSON telemetry
// ============================================================

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <math.h>

// ============================================================
// WIFI
// ============================================================
const char* SSID = "DPRIMSNetwork";
const char* PASS = "dprims2026";

// ============================================================
// BACKEND WEBSOCKET
// ============================================================
const char* WS_HOST = "10.42.0.211";
const uint16_t WS_PORT = 3000;
const char* WS_PATH = "/devkit";

// ============================================================
// MOTOR PINS
// ============================================================
#define MOTOR_A_PIN 27
#define MOTOR_B_PIN 12

// ============================================================
// ENCODER PINS
// GPIO 34/35 لا يوجد بهم internal pullup
// يفضل Pull-up خارجي 10K على VCC
// ============================================================
#define ENC_A_PIN 34
#define ENC_B_PIN 35

// ============================================================
// STATUS LED
// ============================================================
#define STATUS_LED 2

// ============================================================
// ENCODER CONSTANTS
// ============================================================
#define PPR 11
#define GEAR_RATIO 30
#define PULSES_PER_REV (PPR * GEAR_RATIO)

#define WHEEL_DIAM_MM 60.0f

const float MM_PER_PULSE = (WHEEL_DIAM_MM * 3.14159f) / (float)PULSES_PER_REV;
const float CM_PER_PULSE = MM_PER_PULSE / 10.0f;

// ============================================================
// TRACK GEOMETRY
// ============================================================
const float TRACK_LENGTH_CM = 304.0f;

// المسافة بين العجلتين
const float AXLE_DISTANCE_CM = 35.5f;

// مهم:
// لو الإنكودر فعليًا على عجلة الموتور الأمامية خليها 1
// لو أنت بتعمل reset والعجلة الخلفية عند صفر المسار خليها 0
#define ENCODER_REF_IS_FRONT_WHEEL 0

// حدود الأوتو
const float TRACK_STOP_MARGIN_CM = 5.0f;
const float TRACK_RETURN_MARGIN_CM = 5.0f;

// بعد كل تغيير اتجاه نستنى شوية حتى لا يكرر القرار بسبب الاهتزاز
const uint32_t AUTO_SWITCH_COOLDOWN_MS = 900;

// ============================================================
// RAIL JOINT GEOMETRY
// ============================================================
const float RAIL_JOINT_START_CM = 141.0f;
const float RAIL_JOINT_CENTER_CM = 152.0f;
const float RAIL_JOINT_END_CM = 163.0f;

// ============================================================
// SLEEPERS GEOMETRY
// أول 8 سليبر من قياساتك
// الباقي تقديري مؤقت لحين القياس الحقيقي
// ============================================================
struct SleeperInfo {
  const char* id;
  float startCm;
  float endCm;
};

SleeperInfo SLEEPERS[] = {
  {"S1",   0.0f,   7.0f},
  {"S2",  21.0f,  28.0f},
  {"S3",  42.0f,  47.0f},
  {"S4",  63.0f,  70.0f},
  {"S5",  83.0f,  90.0f},
  {"S6", 104.0f, 112.0f},
  {"S7", 126.0f, 133.0f},
  {"S8", 149.0f, 156.0f},

  {"S9",  170.0f, 177.0f},
  {"S10", 191.0f, 198.0f},
  {"S11", 212.0f, 219.0f},
  {"S12", 233.0f, 240.0f},
  {"S13", 254.0f, 261.0f},
  {"S14", 275.0f, 282.0f},
  {"S15", 296.0f, 303.0f},
};

const int SLEEPER_COUNT = sizeof(SLEEPERS) / sizeof(SLEEPERS[0]);

// ============================================================
// AUTO MODE STATE
// ============================================================
enum AutoState {
  AUTO_OFF,
  AUTO_FORWARD,
  AUTO_RETURN
};

// ============================================================
// GLOBAL STATE
// ============================================================
volatile int32_t encoderCount = 0;

int32_t prevEncoderCount = 0;
uint32_t prevMs = 0;

uint32_t lapCount = 0;
uint32_t lastAutoSwitchMs = 0;

uint8_t speedPct = 100;

bool isRunning = false;
bool wsConnected = false;

AutoState autoState = AUTO_OFF;
String motionDirection = "stop";

// Positions
float encoderDistanceCm = 0.0f;
float rearWheelCm = 0.0f;
float frontWheelCm = AXLE_DISTANCE_CM;
float officialPositionCm = 0.0f;

// Speeds
float currentRpm = 0.0f;
float currentCmS = 0.0f;

// WiFi reconnect
uint32_t lastWiFiCheck = 0;
const uint32_t WIFI_CHECK_MS = 5000;

// Telemetry interval
const uint32_t TELEMETRY_MS = 500;

// Debug interval
const uint32_t ENC_DEBUG_MS = 1000;

// WebSocket
WebSocketsClient wsClient;

// ============================================================
// HELPERS
// ============================================================
float clampFloat(float value, float minValue, float maxValue) {
  if (value < minValue) return minValue;
  if (value > maxValue) return maxValue;
  return value;
}

// ============================================================
// SLEEPER / TRACK HELPERS
// ============================================================
float sleeperCenterCm(int index) {
  return (SLEEPERS[index].startCm + SLEEPERS[index].endCm) / 2.0f;
}

int findNearestSleeperIndex(float posCm) {
  int bestIndex = 0;
  float bestDistance = 999999.0f;

  for (int i = 0; i < SLEEPER_COUNT; i++) {
    float center = sleeperCenterCm(i);
    float distance = fabsf(posCm - center);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

const char* getTrackZone(float posCm) {
  if (posCm < 0.0f) return "Out";

  if (posCm <= 101.0f) return "Zone A";
  if (posCm <= 203.0f) return "Zone B";
  if (posCm <= TRACK_LENGTH_CM) return "Zone C";

  return "Out";
}

bool isOnRailJoint(float posCm) {
  return posCm >= RAIL_JOINT_START_CM && posCm <= RAIL_JOINT_END_CM;
}

float distanceToRailJointCm(float posCm) {
  return fabsf(posCm - RAIL_JOINT_CENTER_CM);
}

float getTrackProgressPct(float posCm) {
  if (TRACK_LENGTH_CM <= 0.0f) return 0.0f;
  return clampFloat((posCm / TRACK_LENGTH_CM) * 100.0f, 0.0f, 100.0f);
}

// ============================================================
// ENCODER ISR
// لو الاتجاه معكوس:
// غيّر LOW إلى HIGH في الشرط
// ============================================================
void IRAM_ATTR onEncoderPulse() {
  if (digitalRead(ENC_B_PIN) == LOW) {
    encoderCount++;
  } else {
    encoderCount--;
  }
}

// ============================================================
// MOTOR CONTROL
// ============================================================
void initMotors() {
  pinMode(MOTOR_A_PIN, OUTPUT);
  pinMode(MOTOR_B_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);

  digitalWrite(MOTOR_A_PIN, LOW);
  digitalWrite(MOTOR_B_PIN, LOW);
  digitalWrite(STATUS_LED, LOW);

  Serial.println("[MOTOR] Initialized");
}

void forwardMotion() {
  digitalWrite(MOTOR_A_PIN, HIGH);
  digitalWrite(MOTOR_B_PIN, LOW);

  isRunning = true;
  motionDirection = "forward";

  Serial.println("[MOTOR] Forward");
}

void backwardMotion() {
  digitalWrite(MOTOR_A_PIN, LOW);
  digitalWrite(MOTOR_B_PIN, HIGH);

  isRunning = true;
  motionDirection = "backward";

  Serial.println("[MOTOR] Backward");
}

void stopSoft() {
  digitalWrite(MOTOR_A_PIN, LOW);
  digitalWrite(MOTOR_B_PIN, LOW);

  isRunning = false;
  motionDirection = "stop";

  Serial.println("[MOTOR] Soft stop");
}

void brakeHard() {
  digitalWrite(MOTOR_A_PIN, HIGH);
  digitalWrite(MOTOR_B_PIN, HIGH);

  delay(80);

  stopSoft();

  Serial.println("[MOTOR] EMERGENCY BRAKE");
}

void setSpeedPct(uint8_t pct) {
  speedPct = constrain(pct, 0, 100);

  Serial.printf("[MOTOR] Speed = %u%%\n", speedPct);

  // لو عندك EN pin للـ L293D ممكن نضيف PWM حقيقي.
  // حاليًا القيمة للتليمتري والداشبورد فقط.
}

// ============================================================
// POSITION & SPEED
// ============================================================
void updatePositionsFromEncoder(int32_t currentCount) {
  encoderDistanceCm = (float)currentCount * CM_PER_PULSE;

#if ENCODER_REF_IS_FRONT_WHEEL
  // الإنكودر يمثل موضع العجلة الأمامية
  frontWheelCm = encoderDistanceCm;
  rearWheelCm = frontWheelCm - AXLE_DISTANCE_CM;
#else
  // الإنكودر يمثل موضع العجلة الخلفية
  rearWheelCm = encoderDistanceCm;
  frontWheelCm = rearWheelCm + AXLE_DISTANCE_CM;
#endif

  rearWheelCm = clampFloat(rearWheelCm, 0.0f, TRACK_LENGTH_CM);
  frontWheelCm = clampFloat(frontWheelCm, 0.0f, TRACK_LENGTH_CM);

  // الموقع الرسمي للداشبورد والسليبر
  officialPositionCm = rearWheelCm;
}

float calcSpeedRPM(int32_t deltaPulses, uint32_t deltaMs) {
  if (deltaMs == 0) return 0.0f;

  return ((float)abs(deltaPulses) / (float)PULSES_PER_REV) *
         (60000.0f / (float)deltaMs);
}

float calcSpeedCmS(float rpm) {
  return (rpm / 60.0f) * ((WHEEL_DIAM_MM * 3.14159f) / 10.0f);
}

// ============================================================
// POSITION CORRECTION
// مهم في الأوتو مود علشان الخطأ ما يتراكمش كل لفة
// ============================================================
void setOfficialPositionCm(float pos) {
  pos = clampFloat(pos, 0.0f, TRACK_LENGTH_CM);

#if ENCODER_REF_IS_FRONT_WHEEL
  float encoderPos = pos + AXLE_DISTANCE_CM;
#else
  float encoderPos = pos;
#endif

  int32_t newCount = (int32_t)(encoderPos / CM_PER_PULSE);

  noInterrupts();
  encoderCount = newCount;
  interrupts();

  prevEncoderCount = newCount;
  updatePositionsFromEncoder(newCount);

  Serial.printf(
    "[AUTO CAL] Position corrected | official=%.1f | count=%d | rear=%.1f | front=%.1f\n",
    pos,
    newCount,
    rearWheelCm,
    frontWheelCm
  );
}

// ============================================================
// AUTO MODE
// ESP32 هو اللي يتحكم محليًا في الحركة
// السيرفر فقط يرسل autoon / autooff
// ============================================================
void handleAutoMode() {
  if (autoState == AUTO_OFF) return;

  uint32_t now = millis();

  // حدّث المكان مباشرة من الإنكودر داخل الأوتو
  int32_t snapCount;
  noInterrupts();
  snapCount = encoderCount;
  interrupts();

  updatePositionsFromEncoder(snapCount);

  // منع تبديل الاتجاه بسرعة متكررة بسبب الاهتزاز
  if (now - lastAutoSwitchMs < AUTO_SWITCH_COOLDOWN_MS) {
    return;
  }

  const float autoEndFrontLimit = TRACK_LENGTH_CM - TRACK_STOP_MARGIN_CM;
  const float autoStartFrontLimit = AXLE_DISTANCE_CM + TRACK_RETURN_MARGIN_CM;

  // ==========================================================
  // Forward: لما العجلة الأمامية تقرب من نهاية المسار
  // ==========================================================
  if (autoState == AUTO_FORWARD && frontWheelCm >= autoEndFrontLimit) {
    Serial.printf(
      "[AUTO] END reached | front=%.1f | rear=%.1f | official=%.1f | limit=%.1f\n",
      frontWheelCm,
      rearWheelCm,
      officialPositionCm,
      autoEndFrontLimit
    );

    brakeHard();
    delay(250);

    noInterrupts();
    snapCount = encoderCount;
    interrupts();

    updatePositionsFromEncoder(snapCount);

    backwardMotion();
    autoState = AUTO_RETURN;
    lastAutoSwitchMs = millis();

    Serial.println("[AUTO] Switching to RETURN");
  }

  // ==========================================================
  // Return: لما العجلة الأمامية ترجع قرب بداية المسار
  // ==========================================================
  else if (autoState == AUTO_RETURN && frontWheelCm <= autoStartFrontLimit) {
    Serial.printf(
      "[AUTO] START reached | front=%.1f | rear=%.1f | official=%.1f | limit=%.1f\n",
      frontWheelCm,
      rearWheelCm,
      officialPositionCm,
      autoStartFrontLimit
    );

    brakeHard();
    delay(250);

    // تصحيح الصفر عند بداية المسار حتى لا يتراكم الخطأ
    setOfficialPositionCm(0.0f);

    lapCount++;

    delay(200);

    forwardMotion();
    autoState = AUTO_FORWARD;
    lastAutoSwitchMs = millis();

    Serial.printf("[AUTO] Lap #%u complete — switching to FORWARD\n", lapCount);
  }
}

// ============================================================
// TELEMETRY
// ============================================================
void sendTelemetry() {
  if (!wsConnected) return;

  uint32_t now = millis();

  int32_t snapCount;
  noInterrupts();
  snapCount = encoderCount;
  interrupts();

  int32_t deltaPulses = snapCount - prevEncoderCount;
  uint32_t deltaMs = now - prevMs;

  updatePositionsFromEncoder(snapCount);

  currentRpm = calcSpeedRPM(deltaPulses, deltaMs);
  currentCmS = calcSpeedCmS(currentRpm);

  int sleeperIndex = findNearestSleeperIndex(officialPositionCm);
  float sleeperCenter = sleeperCenterCm(sleeperIndex);
  float distanceToSleeper = fabsf(officialPositionCm - sleeperCenter);

  StaticJsonDocument<1024> doc;

  doc["type"] = "telemetry";
  doc["train_id"] = "Train01";
  doc["ts"] = now;

  // Main position
  doc["track_position_cm"] = officialPositionCm;
  doc["official_position_cm"] = officialPositionCm;

  // Wheel positions
  doc["rear_wheel_cm"] = rearWheelCm;
  doc["front_wheel_cm"] = frontWheelCm;
  doc["encoder_distance_cm"] = encoderDistanceCm;

  // Speed
  doc["speed_rpm"] = currentRpm;
  doc["speed_cm_s"] = currentCmS;
  doc["speed_pct"] = speedPct;

  // Motion
  doc["direction"] = motionDirection;
  doc["running"] = isRunning;

  // Auto
  doc["auto"] = (autoState != AUTO_OFF);
  doc["auto_state"] =
    (autoState == AUTO_FORWARD) ? "forward" :
    (autoState == AUTO_RETURN)  ? "return" :
                                  "off";

  doc["lap_count"] = lapCount;
  doc["last_auto_switch_ms"] = lastAutoSwitchMs;

  // Encoder
  doc["encoder_count"] = snapCount;
  doc["cm_per_pulse"] = CM_PER_PULSE;
  doc["encoder_ref"] = ENCODER_REF_IS_FRONT_WHEEL ? "front_wheel" : "rear_wheel";

  // Track
  doc["track_length_cm"] = TRACK_LENGTH_CM;
  doc["track_progress_pct"] = getTrackProgressPct(officialPositionCm);
  doc["track_zone"] = getTrackZone(officialPositionCm);

  // Sleeper
  doc["nearest_sleeper"] = SLEEPERS[sleeperIndex].id;
  doc["sleeper_start_cm"] = SLEEPERS[sleeperIndex].startCm;
  doc["sleeper_end_cm"] = SLEEPERS[sleeperIndex].endCm;
  doc["sleeper_center_cm"] = sleeperCenter;
  doc["distance_to_sleeper_cm"] = distanceToSleeper;

  // Rail joint
  doc["rail_joint_start_cm"] = RAIL_JOINT_START_CM;
  doc["rail_joint_center_cm"] = RAIL_JOINT_CENTER_CM;
  doc["rail_joint_end_cm"] = RAIL_JOINT_END_CM;
  doc["rail_joint_distance_cm"] = distanceToRailJointCm(officialPositionCm);
  doc["is_on_rail_joint"] = isOnRailJoint(officialPositionCm);

  // WiFi
  doc["connected"] = wsConnected;
  doc["wifi_rssi"] = WiFi.RSSI();

  String out;
  serializeJson(doc, out);
  wsClient.sendTXT(out);

  prevEncoderCount = snapCount;
  prevMs = now;
}

// ============================================================
// COMMAND HANDLER
// ============================================================
void handleCommand(const JsonDocument& doc) {
  if (!doc.containsKey("cmd")) {
    Serial.println("[CMD] Message has no 'cmd' key — ignored");
    return;
  }

  const char* cmd = doc["cmd"] | "";

  if (strlen(cmd) == 0) {
    Serial.println("[CMD] Empty cmd — ignored");
    return;
  }

  Serial.printf("[CMD] Received: %s\n", cmd);

  if (strcmp(cmd, "forward") == 0) {
    autoState = AUTO_OFF;
    forwardMotion();
  }

  else if (strcmp(cmd, "backward") == 0) {
    autoState = AUTO_OFF;
    backwardMotion();
  }

  else if (strcmp(cmd, "stop") == 0) {
    autoState = AUTO_OFF;
    stopSoft();
  }

  else if (strcmp(cmd, "emergency") == 0) {
    autoState = AUTO_OFF;
    brakeHard();
  }

  else if (strcmp(cmd, "speed") == 0) {
    setSpeedPct(doc["value"] | 100);
  }

  else if (strcmp(cmd, "autoon") == 0) {
    lapCount = 0;
    lastAutoSwitchMs = millis();

    autoState = AUTO_FORWARD;
    forwardMotion();

    Serial.println("[AUTO] Started — forward/return loop");
  }

  else if (strcmp(cmd, "autooff") == 0) {
    autoState = AUTO_OFF;
    stopSoft();

    Serial.println("[AUTO] Stopped");
  }

  else if (strcmp(cmd, "resetenc") == 0) {
    noInterrupts();
    encoderCount = 0;
    interrupts();

    prevEncoderCount = 0;
    lapCount = 0;
    autoState = AUTO_OFF;

    updatePositionsFromEncoder(0);

    Serial.println("[ENCODER] Reset to 0");
  }

  else if (strcmp(cmd, "setpos") == 0) {
    float pos = doc["value"] | 0.0f;
    setOfficialPositionCm(pos);

    Serial.printf("[POS] Official position set to %.1f cm\n", pos);
  }

  else {
    Serial.printf("[CMD] Unknown: %s\n", cmd);
  }
}

// ============================================================
// WEBSOCKET EVENTS
// ============================================================
void onWSEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED: {
      wsConnected = true;
      digitalWrite(STATUS_LED, HIGH);

      Serial.println("[WS] Connected to server");

      StaticJsonDocument<512> hello;
      hello["type"] = "hello";
      hello["device"] = "esp32-devkit";
      hello["train_id"] = "Train01";
      hello["firmware"] = "dprims-devkit-v4-stable-auto";
      hello["wheel_diam_mm"] = WHEEL_DIAM_MM;
      hello["axle_dist_cm"] = AXLE_DISTANCE_CM;
      hello["track_length_cm"] = TRACK_LENGTH_CM;
      hello["cm_per_pulse"] = CM_PER_PULSE;
      hello["encoder_ref"] = ENCODER_REF_IS_FRONT_WHEEL ? "front_wheel" : "rear_wheel";
      hello["sleepers_count"] = SLEEPER_COUNT;

      String out;
      serializeJson(hello, out);
      wsClient.sendTXT(out);

      break;
    }

    case WStype_TEXT: {
      StaticJsonDocument<256> doc;
      DeserializationError err = deserializeJson(doc, payload, length);

      if (!err) {
        handleCommand(doc);
      } else {
        Serial.printf("[WS] JSON error: %s\n", err.c_str());
      }

      break;
    }

    case WStype_DISCONNECTED: {
      wsConnected = false;
      digitalWrite(STATUS_LED, LOW);

      Serial.println("[WS] Disconnected — stopping");

      autoState = AUTO_OFF;
      stopSoft();

      break;
    }

    case WStype_ERROR: {
      Serial.println("[WS] Socket error");
      break;
    }

    default:
      break;
  }
}

// ============================================================
// WIFI
// ============================================================
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);

  Serial.print("[WiFi] Connecting");

  uint32_t attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    delay(300);
    Serial.print(".");
    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED, HIGH);

    Serial.printf(
      "[WiFi] Connected! IP: %s | RSSI: %d dBm\n",
      WiFi.localIP().toString().c_str(),
      WiFi.RSSI()
    );
  } else {
    digitalWrite(STATUS_LED, LOW);
    Serial.printf("[WiFi] FAILED | status=%d\n", WiFi.status());
  }
}

void checkWiFi() {
  uint32_t now = millis();

  if (now - lastWiFiCheck < WIFI_CHECK_MS) return;

  lastWiFiCheck = now;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Lost — reconnecting...");

    autoState = AUTO_OFF;
    stopSoft();

    WiFi.disconnect();
    delay(500);

    WiFi.begin(SSID, PASS);

    uint32_t attempts = 0;

    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
      delay(500);
      Serial.print(".");
      attempts++;
    }

    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf(
        "[WiFi] Reconnected! IP: %s\n",
        WiFi.localIP().toString().c_str()
      );
    } else {
      Serial.println("[WiFi] Reconnect failed — will retry");
    }
  }
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  initMotors();

  pinMode(ENC_A_PIN, INPUT);
  pinMode(ENC_B_PIN, INPUT);

  attachInterrupt(digitalPinToInterrupt(ENC_A_PIN), onEncoderPulse, RISING);

  noInterrupts();
  encoderCount = 0;
  interrupts();

  prevEncoderCount = 0;
  prevMs = millis();

  updatePositionsFromEncoder(0);

  Serial.println("================================================");
  Serial.println("[DPRIMS] ESP32 DevKit Firmware v4 - Stable Auto");
  Serial.println("================================================");

  Serial.printf(
    "[ENCODER] PPR=%d | Gear=%d | PulsesPerRev=%d\n",
    PPR,
    GEAR_RATIO,
    PULSES_PER_REV
  );

  Serial.printf(
    "[ENCODER] %.4f mm/pulse | %.4f cm/pulse\n",
    MM_PER_PULSE,
    CM_PER_PULSE
  );

  Serial.printf(
    "[TRACK] Length=%.1f cm | Axle=%.1f cm | Sleepers=%d\n",
    TRACK_LENGTH_CM,
    AXLE_DISTANCE_CM,
    SLEEPER_COUNT
  );

  Serial.printf(
    "[RAIL JOINT] Start=%.1f | Center=%.1f | End=%.1f\n",
    RAIL_JOINT_START_CM,
    RAIL_JOINT_CENTER_CM,
    RAIL_JOINT_END_CM
  );

  Serial.printf(
    "[ENC REF] %s\n",
    ENCODER_REF_IS_FRONT_WHEEL ? "front_wheel" : "rear_wheel"
  );

  Serial.println("================================================");

  connectWiFi();

  wsClient.begin(WS_HOST, WS_PORT, WS_PATH);
  wsClient.onEvent(onWSEvent);
  wsClient.setReconnectInterval(2000);

  Serial.println("[DPRIMS] DevKit Ready ✓");
}

// ============================================================
// LOOP
// ============================================================
void loop() {
  static uint32_t lastTelem = 0;
  static uint32_t lastEncDbg = 0;

  wsClient.loop();
  checkWiFi();

  uint32_t now = millis();

  // أهم تعديل:
  // تحديث الموقع لحظيًا من الإنكودر في كل loop
  // الأوتو مود لا يعتمد على sendTelemetry
  int32_t snapCount;
  noInterrupts();
  snapCount = encoderCount;
  interrupts();

  updatePositionsFromEncoder(snapCount);

  // قرار الأوتو مود محلي داخل ESP32
  handleAutoMode();

  if (isRunning && now - lastEncDbg >= ENC_DEBUG_MS) {
    lastEncDbg = now;

    Serial.printf(
      "[ENC DBG] count=%d | official=%.1fcm | rear=%.1f | front=%.1f | sleeper=%s | zone=%s | auto=%d | dir=%s\n",
      snapCount,
      officialPositionCm,
      rearWheelCm,
      frontWheelCm,
      SLEEPERS[findNearestSleeperIndex(officialPositionCm)].id,
      getTrackZone(officialPositionCm),
      autoState,
      motionDirection.c_str()
    );
  }

  // التليمتري للداشبورد فقط
  if (now - lastTelem >= TELEMETRY_MS) {
    sendTelemetry();
    lastTelem = now;
  }
}.