# AquaSense — Smart Irrigation IoT Dashboard

A real-time web dashboard for monitoring soil, water, temperature, humidity, and NPK nutrient levels from physical Arduino sensors. Built with Next.js, Prisma, PostgreSQL, and a Python serial bridge.

---

## What It Does

- Reads live data from 4 sensors connected to an Arduino Uno
- Converts raw sensor values to meaningful units (%, °C, cm, mg/kg)
- Stores all readings in a PostgreSQL database with timestamps
- Displays live data on a web dashboard with real-time updates
- Shows all 7 sensor metrics on a single synchronized multi-line chart
- Fires configurable threshold alerts when values go out of range
- Controls a water pump automatically based on soil moisture

---

## Sensors

| Sensor | Pin | Raw Output | Converted Unit |
|---|---|---|---|
| DHT11 (Temp + Humidity) | D2 | Direct | °C and % |
| Soil Moisture | A0 | ADC 0–1023 | `(1 - raw/1023) × 100` → % |
| HC-SR04 Ultrasonic (Water Level) | TRIG=D5, ECHO=D4 | Pulse duration | `duration × 0.034 / 2` → cm |
| NPK Sensor (RS485/Modbus) | RX=D12, TX=D13 | Hex registers | `int(hex, 16)` → mg/kg |

---

## System Architecture

```
Arduino Uno (sensors)
        │
        │ USB Serial (9600 baud)
        ▼
Python Serial Bridge (serial_bridge/bridge.py)
        │
        │ HTTP POST /api/ingest
        ▼
Next.js API (app/api/ingest/route.ts)
        │
        │ Prisma ORM
        ▼
PostgreSQL Database
        │
        │ SSE /api/stream
        ▼
Browser Dashboard (http://localhost:3000/dashboard)
```

---

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Hardware Bridge**: Python 3 (pyserial, requests, pyyaml)
- **Hardware**: Arduino Uno, DHT11, Soil Moisture Sensor, HC-SR04, NPK RS485 Sensor

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Mr-Olivier/IOT_PROJECT_DASHBOARD.git
cd IOT_PROJECT_DASHBOARD
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/aquasense"
```

### 3. Set up database

```bash
npx prisma migrate dev
npx prisma db seed
```

### 4. Start the dashboard

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`

---

## Connecting the Arduino

### Upload the sketch

Open `arduino/sensor_node.ino` in Arduino IDE and upload to your Arduino Uno.

### Install Python dependencies

```bash
pip install pyserial pyyaml requests
```

### Configure the bridge

Edit `serial_bridge/config.yaml`:

```yaml
serial_port: COM6        # your Arduino port (check Device Manager)
baud_rate: 9600
api_url: http://localhost:3000/api/ingest
api_key: aquasense-demo-key-123
node_id: node-1
simulation: false
```

### Run the bridge

```bash
python serial_bridge/bridge.py
```

The bridge reads serial output from the Arduino, converts units, applies calibration, and POSTs to the dashboard API every 3 seconds.

---

## Simulation Mode (No Hardware Required)

To generate data without a physical Arduino:

```yaml
# serial_bridge/config.yaml
simulation: true
interval_ms: 100
```

```bash
python serial_bridge/bridge.py
```

At 100ms intervals, 100,000 records take ~2.8 hours.

---

## Sensor Calibration

Each sensor supports offset and scale correction in `serial_bridge/config.yaml`:

```yaml
calibration:
  temperature:
    offset: -2    # sensor reads 2°C too high
    scale: 1.0
  soilMoisture:
    offset: 0
    scale: 1.05   # sensor reads 5% low
```

Formula: `calibrated = (raw_value + offset) × scale`

---

## Dashboard Features

- **Live sensor cards** — temperature, humidity, soil moisture, water level, N, P, K
- **Multi-line chart** — all 7 sensors on one synchronized time-series graph
- **Alert system** — configurable min/max thresholds per metric
- **Pump control** — manual on/off and automatic mode based on soil moisture
- **Node detail page** — historical charts with time range selector
- **Settings** — manage nodes and configure alert thresholds

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ingest` | Receive sensor readings from bridge |
| GET | `/api/stream` | SSE stream for real-time updates |
| GET | `/api/nodes` | List all sensor nodes |
| GET | `/api/nodes/[id]/readings` | Get readings with time aggregation |
| GET | `/api/nodes/[id]/latest` | Get most recent reading |
| GET | `/api/alerts` | List active alerts |
| POST | `/api/alerts/[id]/ack` | Dismiss an alert |
| GET/POST | `/api/alerts/thresholds` | Manage alert thresholds |
| GET/POST | `/api/pump` | Pump state management |

---

## Running Tests

```bash
# TypeScript tests
npm test

# Python property-based tests
python -m pytest serial_bridge/tests/test_bridge.py -v
```

---

## Project Structure

```
├── app/                    # Next.js app
│   ├── api/                # API routes
│   ├── dashboard/          # Dashboard page and components
│   ├── nodes/[id]/         # Node detail page
│   └── settings/           # Settings page
├── lib/                    # Business logic
├── prisma/                 # Database schema and migrations
├── arduino/                # Arduino sketch
├── serial_bridge/          # Python serial bridge
│   ├── bridge.py           # Main bridge script
│   ├── config.yaml         # Configuration
│   └── tests/              # Property-based tests
└── __tests__/              # TypeScript tests
```

---

## Assignment Coverage

| Requirement | Status |
|---|---|
| Collect data from 4 sensors | ✅ |
| Convert raw data to meaningful units | ✅ |
| Document conversion formulas | ✅ |
| Unique sensor identifier per reading | ✅ |
| Calibration with reference values | ✅ |
| Map to database with timestamps | ✅ |
| 100,000+ records (simulation mode) | ✅ |
| Multi-line time-series graph | ✅ |
| All sensors on single synchronized chart | ✅ |
| Visualize on web dashboard | ✅ |

---

## License

MIT — University of Rwanda, IoT Project 2026
