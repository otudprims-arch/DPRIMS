// DPRIMS - ESP32-CAM Front (Standalone MJPEG Stream)
// Board: AI Thinker ESP32-CAM
// IP: 192.168.1.101 (http://192.168.1.101/stream)

#include "esp_camera.h"
#include <WiFi.h>

// ===== WiFi Config =====
const char* SSID = "DPRIMSNetwork";
const char* PASS = "dprims2026";

IPAddress LOCAL_IP(192, 168, 1, 101);
IPAddress GATEWAY(192, 168, 1, 1);
IPAddress SUBNET(255, 255, 255, 0);

// ===== AI Thinker Pinout =====
#define PWDN_GPIO_NUM      32
#define RESET_GPIO_NUM     -1
#define XCLK_GPIO_NUM       0
#define SIOD_GPIO_NUM      26
#define SIOC_GPIO_NUM      27

#define Y9_GPIO_NUM        35
#define Y8_GPIO_NUM        34
#define Y7_GPIO_NUM        39
#define Y6_GPIO_NUM        36
#define Y5_GPIO_NUM        21
#define Y4_GPIO_NUM        19
#define Y3_GPIO_NUM        18
#define Y2_GPIO_NUM         5

#define VSYNC_GPIO_NUM     25
#define HREF_GPIO_NUM      23
#define PCLK_GPIO_NUM      22

// ===== Simple HTTP MJPEG Server =====
WiFiServer server(80);

const char* BOUNDARY = "frameboundary";

// Send HTTP headers for MJPEG stream
void sendStreamHeader(WiFiClient& client) {
  client.println(
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: multipart/x-mixed-replace; boundary=frameboundary\r\n"
    "Connection: close\r\n"
    "\r\n"
  );
}

// Send single JPEG frame
bool sendFrame(WiFiClient& client) {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[CAM] Camera capture failed");
    return false;
  }

  client.printf(
    "--%s\r\n"
    "Content-Type: image/jpeg\r\n"
    "Content-Length: %d\r\n"
    "\r\n",
    BOUNDARY,
    fb->len
  );

  size_t toSend = fb->len;
  uint8_t* buf = fb->buf;
  while (toSend > 0) {
    size_t chunk = toSend;
    if (chunk > 1024) chunk = 1024;
    if (client.write(buf, chunk) != chunk) {
      esp_camera_fb_return(fb);
      return false;
    }
    buf += chunk;
    toSend -= chunk;
  }

  client.print("\r\n");

  esp_camera_fb_return(fb);
  return true;
}

void handleClient(WiFiClient& client) {
  // انتظر طلب HTTP بسيط
  String req = client.readStringUntil('\r');
  client.readStringUntil('\n'); // skip '\n'

  // نحتاج فقط GET /stream
  if (!req.startsWith("GET /stream")) {
    // رد بسيط لغير /stream
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: text/html");
    client.println("Connection: close\r\n");
    client.println("<html><body>");
    client.println("<h1>DPRIMS Front CAM</h1>");
    client.println("<p>Use <a href=\"/stream\">/stream</a> for MJPEG.</p>");
    client.println("</body></html>");
    delay(10);
    return;
  }

  sendStreamHeader(client);

  Serial.println("[HTTP] Client connected to /stream");

  // حلقة بث مستمرة حتى يغلق العميل الاتصال
  while (client.connected()) {
    if (!sendFrame(client)) {
      break;
    }
    // لتقليل الـFPS شوية
    delay(50);
  }

  Serial.println("[HTTP] Client disconnected");
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(false);
  delay(1000);

  // ==== Camera Config ====
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;

  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;

  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;

  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_VGA;     // 640x480
  config.jpeg_quality = 12;               // 0-63 (أقل = جودة أعلى)
  config.fb_count     = 2;
  config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location  = CAMERA_FB_IN_PSRAM;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("[CAM] Camera init FAILED, check wiring and board setting");
    while (true) {
      delay(1000);
    }
  }

  // ==== WiFi Connect ====
  WiFi.mode(WIFI_STA);
  WiFi.config(LOCAL_IP, GATEWAY, SUBNET);
  WiFi.begin(SSID, PASS);

  Serial.print("[WiFi] Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();

  Serial.print("[WiFi] Connected, IP: ");
  Serial.println(WiFi.localIP());

  server.begin();
  Serial.println("[HTTP] Server started");
  Serial.println("Front CAM stream: http://192.168.1.101/stream");
}

void loop() {
  WiFiClient client = server.available();
  if (!client) {
    delay(10);
    return;
  }

  // انتظر شوية لقراءة أول سطر من الطلب
  uint32_t tStart = millis();
  while (!client.available() && (millis() - tStart) < 2000) {
    delay(1);
  }

  if (client.available()) {
    handleClient(client);
  }

  client.stop();
}