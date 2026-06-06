# ESP32 DevKit Control Sketch

## Board
- ESP32 Dev Module

## Required Libraries
- WiFi.h
- WebSocketsClient
- ArduinoJson
- TinyGPS++
- HardwareSerial

## Arduino IDE Settings
- Board: ESP32 Dev Module
- Port: choose the correct COM port
- Upload Speed: default stable value
- CPU Frequency: default board value

## Wiring Summary
- ENA -> GPIO 26
- IN1 -> GPIO 27
- IN2 -> GPIO 14
- IN3 -> GPIO 12
- IN4 -> GPIO 13
- ENB -> GPIO 25
- Encoder A -> GPIO 34
- Encoder B -> GPIO 35
- GPS RX2 -> GPIO 16
- GPS TX2 -> GPIO 17

## Runtime Role
- Motor control with PWM
- Encoder pulse counting
- GPS parsing
- WebSocket control
- Telemetry JSON every 500 ms