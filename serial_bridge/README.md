# Serial Bridge

A standalone Python script that reads sensor data from an Arduino node over serial (or generates synthetic data in simulation mode), converts raw values to engineering units, applies calibration, and forwards readings to the AquaSense ingest API.

---

## Overview

The bridge performs the following steps each cycle:

1. Reads one CSV line from the Arduino over serial (or generates a synthetic line in simulation mode)
2. Parses and validates the line — discards sentinel values (`-999` for DHT11 failures, `-1` for NPK timeouts)
3. Converts raw ADC values and hex NPK bytes to engineering units
4. Applies per-sensor calibration (offset + scale)
5. Clamps values to valid ranges and logs warnings for out-of-range readings
6. POSTs a JSON payload to `POST /api/ingest` with the node's API key
7. Retries up to 3 times on failure; queues failed payloads to `queue.jsonl`

---

## Prerequisites

- Python 3.8 or later
- Install dependencies:

```bash
pip install pyserial pyyaml requests
```

---

## Configuration

All settings are read from `serial_bridge/config.yaml`. Environment variables override file values.

| Parameter | Environment Variable | Valid Range / Type | Example Value | Description |
|---|---|---|---|---|
| `serial_port` | `SERIAL_PORT` | string | `/dev/ttyUSB0` | Serial port the Arduino is connected to. Use `COM3` etc. on Windows. |
| `baud_rate` | `BAUD_RATE` | positive integer | `9600` | Must match the baud rate in the Arduino sketch. |
| `api_url` | `API_URL` | URL starting with `http://` or `https://` | `http://localhost:3000/api/ingest` | Full URL of the ingest endpoint. |
| `api_key` | `API_KEY` | non-empty string | `my-secret-key` | API key sent in the `X-API-Key` header. Must match the server's `API_KEY` env var. |
| `node_id` | `NODE_ID` | non-empty string | `arduino-node-1` | Must match a registered node slug in the database. |
| `interval_ms` | `INTERVAL_MS` | integer, 100–60000 | `2000` | Milliseconds between readings (simulation mode only). In live mode the Arduino controls the interval. |
| `simulation` | `SIMULATION` | `true` or `false` | `false` | Set to `true` to run without a physical Arduino. |
| `calibration.<metric>.offset` | — | float | `0` | Additive correction applied before scaling. |
| `calibration.<metric>.scale` | — | float | `1.0` | Multiplicative correction applied after offset. |

---

## Running in Live Mode

Connect the Arduino, then run:

```bash
python serial_bridge/bridge.py
```

The bridge will:
- Validate that the configured serial port exists
- Verify the API endpoint is reachable
- Begin reading CSV lines from the Arduino and forwarding them to the API

---

## Running in Simulation Mode

Set `simulation: true` in `config.yaml` (or `SIMULATION=true` in the environment), then run:

```bash
python serial_bridge/bridge.py
```

No Arduino is required. The bridge generates synthetic readings that follow realistic patterns:
- Temperature: diurnal sine wave ~20–35°C
- Humidity: inverse of temperature ~40–80%
- Soil moisture: slow decay ~30–80%, resets hourly
- Reservoir level: slow oscillation ~10–50 cm
- NPK: slow random walk within valid ranges

---

## Generating 100,000 Records Quickly

To accumulate records rapidly for testing or assignment submission:

1. Set `simulation: true` in `config.yaml`
2. Set `interval_ms: 100` (minimum interval — 10 readings per second)
3. Run the bridge:

```bash
python serial_bridge/bridge.py
```

At 100 ms intervals, 100,000 records take approximately 2.8 hours. To go faster, open multiple terminal windows and run the bridge simultaneously with different `node_id` values (set via `NODE_ID` environment variable):

```bash
NODE_ID=node-1 python serial_bridge/bridge.py &
NODE_ID=node-2 python serial_bridge/bridge.py &
NODE_ID=node-3 python serial_bridge/bridge.py &
```

The bridge logs the cumulative record count each cycle so you can monitor progress.

---

## Calibration Guide

Each sensor metric supports an `offset` and `scale` factor in `config.yaml`:

```
calibrated_value = (raw_value + offset) * scale
```

**offset** — corrects for a constant bias (additive error):
- If your thermometer consistently reads 2°C too high, set `temperature.offset: -2`
- If your soil sensor reads 5% too low, set `soilMoisture.offset: 5`

**scale** — corrects for a gain error (proportional error):
- If your sensor reads 10% low across the range, set `scale: 1.1`
- If your sensor reads 5% high, set `scale: 0.95`

Example calibration block:

```yaml
calibration:
  temperature:
    offset: -2    # sensor reads 2°C too high
    scale: 1.0
  soilMoisture:
    offset: 0
    scale: 1.05   # sensor reads 5% low
  nitrogen:
    offset: 10    # constant +10 mg/kg bias
    scale: 1.0
```

After calibration, values are clamped to their valid ranges. A warning is logged if clamping occurs.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `ERROR: Serial port '/dev/ttyUSB0' does not exist` | Arduino not connected or wrong port | Check USB connection; run `ls /dev/tty*` (Linux/Mac) or Device Manager (Windows) to find the correct port |
| `ERROR: Cannot reach API endpoint 'http://localhost:3000/api/ingest'` | Next.js server not running | Start the server with `npm run dev` |
| `Configuration errors: - baud_rate: must be a positive integer` | Invalid value in `config.yaml` | Check `config.yaml` for typos; ensure `baud_rate` is a number like `9600` |
| `POST failed — status=401` | Wrong API key | Ensure `api_key` in `config.yaml` matches the `API_KEY` environment variable on the server |
| `POST failed — status=400` | Invalid payload (e.g. out-of-range value after calibration) | Check calibration settings; review the logged payload for unexpected values |
| `POST failed — status=404` | `node_id` not registered in the database | Create the node in the dashboard settings, or check the `node_id` value matches exactly |
| Readings queued to `queue.jsonl` | Repeated POST failures | Restore connectivity, then replay the queue manually by POSTing each line to the API |
| `ModuleNotFoundError: No module named 'serial'` | pyserial not installed | Run `pip install pyserial` |
| `ModuleNotFoundError: No module named 'yaml'` | pyyaml not installed | Run `pip install pyyaml` |
| `ModuleNotFoundError: No module named 'requests'` | requests not installed | Run `pip install requests` |
// bridge README update
