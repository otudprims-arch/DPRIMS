# ESP32-CAM Sketch

## Board
- AI Thinker ESP32-CAM

## Required Libraries
- ESP32 Arduino core
- esp_camera.h (comes with ESP32 core)
- WiFi.h (comes with ESP32 core)

## Arduino IDE Settings
- Board: AI Thinker ESP32-CAM
- Port: choose the correct COM port
- PSRAM: Enabled / default for AI Thinker ESP32-CAM
- Partition Scheme: default or a scheme with enough app space

## Upload Notes
- Use FTDI or ESP32-CAM-MB programmer
- Connect IO0 to GND before upload
- Press RST if upload does not start automatically
- Remove IO0 from GND after upload, then reset board

## Stream URLs
- Front: `http://192.168.1.101/stream`
- Rear: `http://192.168.1.102/stream`