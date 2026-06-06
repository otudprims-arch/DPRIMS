# DPATIMS — Dual-Phase Autonomous Track Inspection & Monitoring System

DPATIMS is a graduation project prototype for intelligent railway track inspection and monitoring.
The system combines embedded hardware, computer vision, artificial intelligence, backend services, database storage, and a real-time web dashboard to detect railway track defects and support maintenance decisions.

The prototype uses front and rear ESP32-CAM units to capture live video streams, an ESP32 DevKit to control the vehicle and send telemetry, a Python AI pipeline to run YOLOv8 detection and SSIM comparison, a Node.js backend to process alerts and commands, MongoDB for persistent storage, and a React dashboard for monitoring, control, analytics, and reports.

---

## Project Goal

The main goal of DPATIMS is to build a low-cost, AI-powered railway inspection prototype capable of:

* Monitoring railway tracks using dual camera vision.
* Detecting rail defects using a trained YOLOv8 model.
* Comparing front and rear frames using SSIM analysis.
* Calculating defect location using encoder-based distance estimation.
* Sending real-time alerts to a backend server.
* Displaying alerts, telemetry, cameras, reports, and analytics on a dashboard.
* Sending control commands to the inspection vehicle from the dashboard.

---

## High-Level Architecture

```text
ESP32-CAM Front ─┐
                 │
ESP32-CAM Rear  ─┼──> Python AI Node
                 │    YOLOv8 + SSIM + GPS + Encoder
ESP32 DevKit    ─┘
                         │
                         ▼
          Backend Server
          Express + Socket.io + MongoDB
                         │
                         ▼
          React Dashboard
          Map + Alerts + Cameras + Control + Analytics
```

---

## System Layers

| Layer           | Technology                                    | Responsibility                                       |
| --------------- | --------------------------------------------- | ---------------------------------------------------- |
| Physical Layer  | ESP32-CAM, ESP32 DevKit, Motors, Encoder, GPS | Camera streaming, motion control, telemetry          |
| AI Layer        | Python, OpenCV, YOLOv8, SSIM                  | Defect detection, image comparison, alert generation |
| Backend Layer   | Node.js, Express, Socket.io, MongoDB          | APIs, WebSockets, storage, control commands          |
| Dashboard Layer | React, Vite, Axios, Hooks                     | Monitoring, alerts, reports, analytics, control UI   |

---

## Repository Structure

```text
dprims-project/
├── backend/        # Express + Socket.io + MongoDB backend
├── frontend/       # React + Vite dashboard
├── python-ai/      # AI pipeline, YOLOv8 inference, SSIM analysis
├── firmware/       # ESP32 DevKit and ESP32-CAM firmware
├── docs/           # Project documentation and phase files
├── .gitignore
└── README.md
```

---

## Backend Structure

```text
backend/
├── alert.json
├── package.json
├── package-lock.json
└── src/
    ├── app.js
    ├── server.js
    ├── ws-state.js
    ├── config/
    ├── controllers/
    ├── models/
    ├── routes/
    ├── services/
    └── sockets/
```

The backend is responsible for:

* Receiving AI alerts from the Python pipeline.
* Managing telemetry and system health.
* Storing alerts, faults, sessions, and events in MongoDB.
* Broadcasting real-time updates to the React dashboard.
* Sending movement commands to the ESP32 DevKit.

---

## Frontend Structure

```text
frontend/
├── public/
├── src/
│   ├── components/
│   ├── config/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```

The dashboard includes:

* Dashboard Home
* Live Cameras
* AI Alerts
* Fault Management
* Train Control
* Track Digital Twin
* Analytics
* Reports
* System Health

---

## Python AI Structure

```text
python-ai/
├── analysis.py
├── config.py
├── requirements.txt
├── models/
│   └── best.pt
└── modules/
    ├── alerts.py
    ├── detector.py
    ├── locator.py
    ├── restream.py
    ├── ssimcheck.py
    ├── stream.py
    ├── telemetry.py
    └── track_geometry.py
```

The Python AI pipeline is responsible for:

* Reading front and rear ESP32-CAM streams.
* Loading the trained YOLOv8 model from `models/best.pt`.
* Detecting defects in real time.
* Running SSIM comparison between front and rear frames.
* Reading telemetry and track position.
* Saving evidence images.
* Sending structured alert payloads to the backend.
* Restreaming processed video feeds to the dashboard.

---

## Firmware Structure

```text
firmware/
├── esp32-devkit/
│   └── esp32-devkit.ino
├── esp32cam-front/
│   └── esp32cam-front.ino
└── esp32cam-rear/
    └── esp32cam-rear.ino
```

Firmware modules:

| Firmware       | Board                | Function                                   |
| -------------- | -------------------- | ------------------------------------------ |
| esp32cam-front | AI Thinker ESP32-CAM | Front MJPEG stream                         |
| esp32cam-rear  | AI Thinker ESP32-CAM | Rear MJPEG stream                          |
| esp32-devkit   | ESP32 Dev Module     | Motors, encoder, GPS, telemetry, WebSocket |

---

## Requirements

Install the following tools before running the project:

| Tool                     | Recommended Version |
| ------------------------ | ------------------- |
| Git                      | 2.45+               |
| Node.js                  | v20.x LTS           |
| npm                      | 10.x                |
| Python                   | 3.10.x              |
| MongoDB Community Server | 7.x or 8.x          |
| Arduino IDE              | 2.x                 |
| Visual Studio Code       | Latest              |

---

## Useful Download Links

| Tool              | Link                                                             |
| ----------------- | ---------------------------------------------------------------- |
| Node.js           | https://nodejs.org/                                              |
| Git               | https://git-scm.com/downloads                                    |
| Python 3.10       | https://www.python.org/downloads/release/python-31011/           |
| MongoDB Community | https://www.mongodb.com/try/download/community                   |
| Arduino IDE       | https://www.arduino.cc/en/software                               |
| VS Code           | https://code.visualstudio.com/                                   |
| CP2102 Driver     | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| CH340 Driver      | https://www.wch.cn/downloads/CH341SER_EXE.html                   |

---

## Installation and Setup

### 1. Clone the Repository

```powershell
git clone https://github.com/otudprims-arch/DPRIMS.git
cd DPRIMS
```

---

### 2. Backend Setup

```powershell
cd backend
npm install
npm run dev
```

Expected output:

```text
MongoDB connected
DPRIMS Backend running
HTTP API: http://localhost:3000
DevKit WS: ws://0.0.0.0:3000/devkit
Python Ingest: ws://0.0.0.0:3000/ingest
```

Backend URL:

```text
http://localhost:3000
```

System health endpoint:

```text
http://localhost:3000/api/system/health
```

---

### 3. Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Dashboard URL:

```text
http://localhost:5173
```

---

### 4. Python AI Setup

```powershell
cd python-ai
python -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python .\analysis.py
```

The Python pipeline loads the trained YOLOv8 model from:

```text
python-ai/models/best.pt
```

---

### 5. MongoDB Setup

If MongoDB is installed as a Windows service, start it normally.

If you need to run MongoDB manually:

```powershell
mkdir D:\dprims\data\db
& "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath D:\dprims\data\db
```

Default MongoDB URI:

```text
mongodb://127.0.0.1:27017/dprims
```

---

## Python Requirements

The Python dependencies are listed in:

```text
python-ai/requirements.txt
```

Install them using:

```powershell
cd python-ai
.\venv\Scripts\activate
python -m pip install -r requirements.txt
```

Main Python libraries:

| Library          | Purpose                  |
| ---------------- | ------------------------ |
| ultralytics      | YOLOv8 inference         |
| opencv-python    | Camera stream processing |
| numpy            | Numerical operations     |
| scikit-image     | SSIM comparison          |
| requests         | HTTP communication       |
| websocket-client | WebSocket communication  |
| flask            | MJPEG restream server    |
| colorlog         | Colored logging          |

---

## Runtime Ports

| Service                |  Port |
| ---------------------- | ----: |
| Backend API            |  3000 |
| Frontend Dashboard     |  5173 |
| Python Restream Server |  5050 |
| MongoDB                | 27017 |

---

## Startup Order

Recommended startup order:

1. Start MongoDB.
2. Start the backend server.
3. Start the frontend dashboard.
4. Power the ESP32-CAM and ESP32 DevKit units.
5. Start the Python AI pipeline.
6. Open the dashboard in the browser.

---

## Quick Run Commands

### Terminal 1 — Backend

```powershell
cd backend
npm run dev
```

### Terminal 2 — Frontend

```powershell
cd frontend
npm run dev
```

### Terminal 3 — Python AI

```powershell
cd python-ai
.\venv\Scripts\activate
python .\analysis.py
```

---

## Local Network Configuration

Example local network configuration:

| Device          | Example IP                | Function                     |
| --------------- | ------------------------- | ---------------------------- |
| Laptop / Server | 10.42.0.47 or 10.42.0.211 | Backend, AI, Dashboard       |
| ESP32-CAM Front | 10.42.0.101               | Front stream                 |
| ESP32-CAM Rear  | 10.42.0.102               | Rear stream                  |
| ESP32 DevKit    | Dynamic / Static IP       | Motion control and telemetry |

Camera stream examples:

```text
http://10.42.0.101:81/stream
http://10.42.0.102:81/stream
```

Python restream examples:

```text
http://localhost:5050/front
http://localhost:5050/rear
```

---

## Detailed Documentation

The full project plan and implementation phases are available   :

link:

```text
https://otudprims-arch.github.io/plan/
```

---

## Git Ignore Notes

The repository does not include generated or runtime folders such as:

```text
node_modules/
venv/
dist/
events/
logs/
data/db/
__pycache__/
.env
```

To run the project on a new machine, install dependencies again using:

```powershell
npm install
python -m pip install -r requirements.txt
```

---

## Authors

### Amar Mohamed — 0xmaro

Role: AI Pipeline, System Integration, Backend/Dashboard Support, Documentation

Links:

* LinkedIn: https://linkedin.com/in/amar-mohamed-0xmaro
* Facebook: https://facebook.com/0xmaro
* X: https://x.com/0_xmaro
* Instagram: https://instagram.com/its_0xmaro
* GitHub: https://github.com/0xmaro
* YouTube: https://www.youtube.com/@0xmaro
* Email: [its.0xmaro@gmail.com](mailto:its.0xmaro@gmail.com)

### Ahmed Abdel Latif

Role: Embedded Systems, Hardware Integration, Motion Control, Testing Support

Links:

* LinkedIn: https://www.linkedin.com/in/ahmed-abdel-latif-a893992b1

---

## Project Status

The project currently includes:

* Backend source code.
* Frontend dashboard source code.
* Python AI pipeline.
* YOLOv8 trained model weights.
* ESP32 firmware.
* Documentation phase files.
* Final system integration updates.

---

## License

This project was developed as a graduation project for educational and research purposes.
