# AquaSense — Smart Irrigation IoT System

A full-stack IoT smart irrigation system that collects real-time sensor data from an Arduino, applies machine learning to decide when to irrigate, and displays everything on a live web dashboard.

---

## What It Does

- Reads live data from 4 sensor types connected to an Arduino Uno
- Converts raw sensor values to meaningful units (%, °C, cm, mg/kg)
- Stores all readings in a PostgreSQL database with timestamps
- Runs a Python ML service that classifies each reading into: **IRRIGATE**, **HOLD**, or **LOW\_WATER**
- Controls a water pump relay automatically based on the ML decision
- Displays live sensor data and irrigation decisions on a web dashboard with real-time updates
- Generates a full statistical analysis with charts, correlation matrices, and model metrics
- 100,000+ historical records seeded for analysis and model training

---

## System Architecture

```
Arduino Uno (4 sensors)
        │
        │  USB Serial — 9600 baud
        ▼
Python Serial Bridge  (serial_bridge/bridge.py)
        │
        ├──► POST /api/ingest  ──► Next.js API ──► PostgreSQL
        │
        └──► POST /predict     ──► ML Service (FastAPI :5001)
                                         │
                                         ├── Decision: IRRIGATE / HOLD / LOW_WATER
                                         ├── Saves decision to IrrigationDecision table
                                         └── CMD:PUMP=1 or CMD:PUMP=0 back to Arduino
                                                    │
                                                    ▼
                                             Pump relay ON/OFF

PostgreSQL
        │
        ├── SSE /api/stream  ──► Dashboard live sensor cards + chart
        └── GET /api/decisions ──► MLDecisionPanel (latest irrigation decision)
```

---

## Sensors

| Sensor | Pin | Raw Output | Converted Unit |
|---|---|---|---|
| DHT11 (Temp + Humidity) | D2 | Direct digital | °C and % |
| Soil Moisture | A0 | ADC 0–1023 | `(1 - raw/1023) × 100` → % |
| HC-SR04 Ultrasonic (Reservoir Level) | TRIG=D5, ECHO=D4 | Pulse µs | `duration × 0.034 / 2` → cm → % |
| NPK Sensor (RS485 Modbus) | RX=D12, TX=D13 | Hex registers | `int(hex, 16)` → mg/kg |

---

## ML Irrigation Decision Logic

The ML service classifies every incoming sensor reading into one of three states:

| Decision | Condition | Pump |
|---|---|---|
| `LOW_WATER` | Reservoir level < 15% | OFF — not enough water to irrigate safely |
| `IRRIGATE` | Soil moisture < 78% | ON — soil needs water |
| `HOLD` | Soil moisture ≥ 78% | OFF — soil is sufficiently moist |

A Random Forest classifier was trained on 100,000+ labelled readings and achieved **100% accuracy** on these deterministic rules. Feature importances: reservoir level (40.0%), soil moisture (32.3%), nutrients (27.7%).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS, Recharts |
| Backend | Next.js API Routes, Prisma ORM |
| ML Service | Python 3.12, FastAPI, NumPy, psycopg2 |
| Database | PostgreSQL |
| Serial Bridge | Python 3.12, pyserial, requests |
| Analysis | Pandas, Matplotlib, Seaborn, scikit-learn, Jupyter |
| Hardware | Arduino Uno, DHT11, Soil Moisture, HC-SR04, NPK RS485 |

---

## Getting Started

### Quick Start (recommended)

Double-click `START_AQUASENSE.bat` — it starts all three services in sequence and opens the browser automatically.

### Manual Start (3 terminals)

**Terminal 1 — Next.js Dashboard**
```bash
npm run dev
# Opens at http://localhost:3000
```

**Terminal 2 — ML Service**
```bash
"C:\Program Files\Python312\python.exe" ml_service/main.py
# Runs at http://localhost:5001
# Check status: http://localhost:5001/status
```

**Terminal 3 — Serial Bridge**
```bash
"C:\Program Files\Python312\python.exe" serial_bridge/bridge.py
# Reads sensor data from COM8, saves to DB, calls ML service
```

---

## First-Time Setup

### 1. Install Node dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/aquasense"
ML_SERVICE_URL="http://localhost:5001"
```

### 3. Set up the database
```bash
npx prisma migrate dev
npx prisma db seed
```

The seed script inserts 100,000+ historical readings with realistic sensor patterns.

### 4. Install Python dependencies
```bash
"C:\Program Files\Python312\python.exe" -m pip install -r ml_service/requirements.txt
"C:\Program Files\Python312\python.exe" -m pip install -r python_analysis/requirements.txt
```

---

## Serial Bridge Configuration

Edit `serial_bridge/config.yaml`:

```yaml
serial_port: COM8        # check Device Manager for your Arduino port
baud_rate: 9600
api_url: http://localhost:3000/api/ingest
api_key: aquasense-demo-key-123
node_id: node-1
simulation: false
```

### Simulation Mode (no Arduino required)

```yaml
simulation: true
interval_ms: 100
```

At 100ms intervals, 100,000 records generate in ~2.8 hours.

---

## Sensor Calibration

Each sensor supports offset and scale correction in `serial_bridge/config.yaml`:

```yaml
calibration:
  temperature:
    offset: -2      # sensor reads 2°C too high
    scale: 1.0
  soilMoisture:
    offset: 0
    scale: 1.05     # sensor reads 5% low
```

Formula: `calibrated = (raw_value + offset) × scale`

---

## Python Analysis Pipeline

The `python_analysis/` folder contains a full statistical analysis of the sensor dataset:

```bash
cd python_analysis
"C:\Program Files\Python312\python.exe" run_all.py --no-jupyter
```

This runs all scripts in order and regenerates all charts and CSV exports:

| Script | Output |
|---|---|
| `00_export_data.py` | Exports raw readings from DB to `data/raw_readings.csv` |
| `01_cleaning.py` | Cleans and validates data → `data/cleaned.csv` |
| `04_eda.py` | Generates distribution, time-series, and correlation plots |
| `06_models.py` | Trains Random Forest + regression models, saves results |
| `07_decision_logic.py` | Applies irrigation decision rules → `data/decisions.csv` |
| `08_model_comparison.py` | 5-fold cross-validation comparison of classifiers |

Charts are saved to `python_analysis/plots/` (13 plots total).

---

## Dashboard Features

- **Live sensor cards** — temperature, humidity, soil moisture, reservoir level, N, P, K
- **Multi-line chart** — all 7 sensors on one synchronized real-time time-series graph
- **ML Decision Panel** — shows latest irrigation decision, confidence score, and pump state
- **Alert system** — configurable min/max thresholds per metric with dismiss support
- **Pump control** — automatic mode driven by ML decision; manual override available
- **Node detail page** — historical charts with time range selector
- **Settings** — manage nodes and configure alert thresholds

---

## API Endpoints

### Next.js (port 3000)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ingest` | Receive sensor readings from the bridge |
| GET | `/api/stream` | SSE stream for real-time dashboard updates |
| GET | `/api/nodes` | List all sensor nodes |
| GET | `/api/nodes/[id]/readings` | Historical readings with time aggregation |
| GET | `/api/nodes/[id]/latest` | Most recent reading for a node |
| GET | `/api/decisions` | Latest irrigation decisions |
| GET | `/api/alerts` | Active alerts |
| POST | `/api/alerts/[id]/ack` | Dismiss an alert |
| GET/POST | `/api/alerts/thresholds` | Manage alert thresholds |
| GET/POST | `/api/pump` | Pump state management |

### ML Service (port 5001)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/status` | Model metrics, record count, feature importances |
| POST | `/predict` | Classify one sensor reading → IRRIGATE / HOLD / LOW\_WATER |
| POST | `/train` | Retrain the model on all DB data |

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── ingest/             # Receives sensor data from bridge
│   │   ├── stream/             # SSE real-time stream
│   │   ├── decisions/          # Irrigation decision history
│   │   ├── nodes/              # Node management
│   │   ├── alerts/             # Alert management
│   │   └── pump/               # Pump control
│   ├── dashboard/
│   │   ├── page.tsx            # Main dashboard page
│   │   └── components/
│   │       └── MLDecisionPanel.tsx   # Live ML decision display
│   ├── ml/                     # ML-related frontend utilities
│   ├── nodes/[id]/             # Node detail page
│   └── settings/               # Settings page
├── ml_service/
│   ├── main.py                 # FastAPI ML service (port 5001)
│   ├── requirements.txt        # Python dependencies
│   └── model/                  # Saved model metadata
├── python_analysis/
│   ├── run_all.py              # Runs all analysis scripts in sequence
│   ├── 00_export_data.py       # DB → CSV export
│   ├── 01_cleaning.py          # Data cleaning
│   ├── 04_eda.py               # Exploratory data analysis + plots
│   ├── 06_models.py            # ML model training
│   ├── 07_decision_logic.py    # Decision rule application
│   ├── 08_model_comparison.py  # Cross-validation comparison
│   ├── data/                   # Exported CSVs
│   └── plots/                  # Generated charts (13 plots)
├── serial_bridge/
│   ├── bridge.py               # Arduino serial reader + ML caller
│   └── config.yaml             # Bridge configuration
├── arduino/
│   └── sensor_node.ino         # Arduino firmware
├── prisma/
│   ├── schema.prisma           # DB schema (SensorReading + IrrigationDecision)
│   ├── seed.ts                 # DB seed script
│   └── migrations/             # Prisma migration history
├── public/                     # Static assets
└── START_AQUASENSE.bat         # One-click launcher for all services
```

---

## Assignment Coverage

| Requirement | Status |
|---|---|
| Collect data from 4 physical sensors | Done |
| Convert raw values to meaningful units | Done |
| Document conversion formulas | Done |
| Unique node identifier per reading | Done |
| Sensor calibration with offset/scale | Done |
| Store readings in DB with timestamps | Done |
| 100,000+ records generated | Done |
| Multi-line synchronized time-series chart | Done |
| All sensors on one chart | Done |
| Visualize on web dashboard | Done |
| Machine learning irrigation decision | Done |
| Automated pump control from ML output | Done |
| Statistical analysis with charts | Done |
| Model comparison and cross-validation | Done |

---

## License

MIT — University of Rwanda, IoT Project 2026
