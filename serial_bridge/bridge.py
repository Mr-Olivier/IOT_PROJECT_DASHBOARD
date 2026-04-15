"""
Serial Bridge — reads sensor data from an Arduino node (or simulates it),
converts raw values to engineering units, applies calibration, and POSTs to the
Next.js ingest API.

Dependencies: pyserial, pyyaml, requests
Usage:
    python serial_bridge/bridge.py                  # live mode (reads from serial port)
    simulation: true in config.yaml                 # simulation mode
"""

import json
import logging
import math
import os
import random
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
import yaml

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

_log_level = logging.DEBUG if os.environ.get("DEBUG") else logging.INFO
logging.basicConfig(
    level=_log_level,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Valid ranges for clamping
# ---------------------------------------------------------------------------

VALID_RANGES = {
    "soilMoisture":   (0.0,   100.0),
    "temperature":    (-40.0,  80.0),
    "humidity":       (0.0,   100.0),
    "reservoirLevel": (0.0,   100.0),
    "nitrogen":       (0.0,  1999.0),
    "phosphorus":     (0.0,  1999.0),
    "potassium":      (0.0,  1999.0),
}

# ---------------------------------------------------------------------------
# Config dataclass
# ---------------------------------------------------------------------------

CONFIG_DIR = Path(__file__).parent
CONFIG_PATH = CONFIG_DIR / "config.yaml"
QUEUE_PATH = CONFIG_DIR / "queue.jsonl"

_CALIBRATION_METRICS = list(VALID_RANGES.keys())


@dataclass
class CalibrationEntry:
    offset: float = 0.0
    scale: float = 1.0


@dataclass
class AppConfig:
    serial_port: str
    baud_rate: int
    api_url: str
    api_key: str
    node_id: str
    interval_ms: int
    simulation: bool
    calibration: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------

def _env_override(key: str, value):
    """Return environment variable override for a config key, cast to the same type as value."""
    env_map = {
        "serial_port": "SERIAL_PORT",
        "baud_rate": "BAUD_RATE",
        "api_url": "API_URL",
        "api_key": "API_KEY",
        "node_id": "NODE_ID",
        "interval_ms": "INTERVAL_MS",
        "simulation": "SIMULATION",
    }
    env_key = env_map.get(key)
    if env_key is None:
        return value
    env_val = os.environ.get(env_key)
    if env_val is None:
        return value
    # Cast to the same type as the default
    if isinstance(value, bool):
        return env_val.lower() in ("1", "true", "yes")
    if isinstance(value, int):
        return int(env_val)
    if isinstance(value, float):
        return float(env_val)
    return env_val


def load_config(path: str = "serial_bridge/config.yaml") -> AppConfig:
    """
    Load configuration from a YAML file and merge environment variable overrides.
    Validates all required fields and raises ValueError with descriptive messages.
    """
    cfg_path = Path(path)
    if not cfg_path.exists():
        raise ValueError(f"Config file not found: {cfg_path}")

    with open(cfg_path, "r") as f:
        raw = yaml.safe_load(f) or {}

    errors = []

    # --- serial_port ---
    serial_port = _env_override("serial_port", raw.get("serial_port"))
    if not serial_port or not isinstance(serial_port, str):
        errors.append("serial_port: must be a non-empty string (e.g. /dev/ttyUSB0 or COM3)")

    # --- baud_rate ---
    baud_rate = _env_override("baud_rate", raw.get("baud_rate"))
    if baud_rate is None:
        errors.append("baud_rate: required, must be a positive integer (e.g. 9600)")
    else:
        try:
            baud_rate = int(baud_rate)
            if baud_rate <= 0:
                errors.append(f"baud_rate: must be a positive integer, got {baud_rate}")
        except (TypeError, ValueError):
            errors.append(f"baud_rate: must be a positive integer, got {baud_rate!r}")

    # --- api_url ---
    api_url = _env_override("api_url", raw.get("api_url"))
    if not api_url or not isinstance(api_url, str):
        errors.append("api_url: must be a non-empty string")
    elif not (api_url.startswith("http://") or api_url.startswith("https://")):
        errors.append(f"api_url: must start with http:// or https://, got {api_url!r}")

    # --- api_key ---
    api_key = _env_override("api_key", raw.get("api_key"))
    if not api_key or not isinstance(api_key, str) or not api_key.strip():
        errors.append("api_key: must be a non-empty string")

    # --- node_id ---
    node_id = _env_override("node_id", raw.get("node_id"))
    if not node_id or not isinstance(node_id, str) or not node_id.strip():
        errors.append("node_id: must be a non-empty string")

    # --- interval_ms ---
    interval_ms = _env_override("interval_ms", raw.get("interval_ms"))
    if interval_ms is None:
        errors.append("interval_ms: required, must be an integer in [100, 60000]")
    else:
        try:
            interval_ms = int(interval_ms)
            if not (100 <= interval_ms <= 60000):
                errors.append(f"interval_ms: must be in range [100, 60000], got {interval_ms}")
        except (TypeError, ValueError):
            errors.append(f"interval_ms: must be an integer, got {interval_ms!r}")

    # --- simulation ---
    simulation_raw = _env_override("simulation", raw.get("simulation"))
    if simulation_raw is None:
        errors.append("simulation: required, must be a boolean (true or false)")
        simulation = False
    elif isinstance(simulation_raw, bool):
        simulation = simulation_raw
    elif isinstance(simulation_raw, str):
        if simulation_raw.lower() in ("true", "1", "yes"):
            simulation = True
        elif simulation_raw.lower() in ("false", "0", "no"):
            simulation = False
        else:
            errors.append(f"simulation: must be a boolean, got {simulation_raw!r}")
            simulation = False
    else:
        errors.append(f"simulation: must be a boolean, got {simulation_raw!r}")
        simulation = False

    if errors:
        raise ValueError("Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors))

    # --- calibration ---
    cal_raw = raw.get("calibration") or {}
    calibration = {}
    for metric in _CALIBRATION_METRICS:
        entry = cal_raw.get(metric) or {}
        calibration[metric] = CalibrationEntry(
            offset=float(entry.get("offset", 0.0)),
            scale=float(entry.get("scale", 1.0)),
        )

    return AppConfig(
        serial_port=serial_port,
        baud_rate=baud_rate,
        api_url=api_url,
        api_key=api_key,
        node_id=node_id,
        interval_ms=interval_ms,
        simulation=simulation,
        calibration=calibration,
    )


# ---------------------------------------------------------------------------
# Startup validation
# ---------------------------------------------------------------------------

def validate_startup(cfg: AppConfig) -> None:
    """
    Validate that the serial port exists (non-simulation) and the API is reachable.
    Raises SystemExit with a descriptive message if either check fails.
    """
    if not cfg.simulation:
        # Check serial port existence
        if sys.platform.startswith("win"):
            # On Windows, try to list COM ports via serial
            try:
                import serial.tools.list_ports
                available = [p.device for p in serial.tools.list_ports.comports()]
                if cfg.serial_port not in available:
                    sys.exit(
                        f"ERROR: Serial port '{cfg.serial_port}' not found. "
                        f"Available ports: {available or ['(none)']}"
                    )
            except ImportError:
                # Fallback: just try to open it
                pass
        else:
            if not os.path.exists(cfg.serial_port):
                sys.exit(
                    f"ERROR: Serial port '{cfg.serial_port}' does not exist. "
                    "Check the device is connected and the path is correct."
                )

    # Check API reachability
    try:
        resp = requests.request("HEAD", cfg.api_url, timeout=5)
        # Any response (even 4xx) means the server is up
    except requests.exceptions.ConnectionError:
        sys.exit(
            f"ERROR: Cannot reach API endpoint '{cfg.api_url}'. "
            "Check the server is running and the URL is correct."
        )
    except requests.exceptions.Timeout:
        sys.exit(
            f"ERROR: API endpoint '{cfg.api_url}' timed out after 5 seconds. "
            "Check network connectivity."
        )
    except requests.exceptions.RequestException as exc:
        # Try GET as fallback
        try:
            requests.get(cfg.api_url, timeout=5)
        except requests.exceptions.RequestException:
            sys.exit(
                f"ERROR: Cannot reach API endpoint '{cfg.api_url}': {exc}"
            )


# ---------------------------------------------------------------------------
# parse_line
# ---------------------------------------------------------------------------

def parse_line(line: str) -> Optional[dict]:
    """
    Handles two Arduino output formats:

    1. DATA: key=value line (preferred):
       DATA:N=17,P=24,K=48,M=509,T=26.40,H=80.00,W=0.00,PUMP=0

    2. Multi-line human-readable block (fallback for older sketches):
       Accumulates labeled lines between the '---' separator markers
       and emits a reading when the closing separator is reached.
    """
    import re

    cleaned = line.strip().encode("ascii", errors="ignore").decode("ascii").strip()

    # --- Format 1: DATA: line ---
    if cleaned.startswith("DATA:"):
        data_part = cleaned[5:]
        pairs: dict = {}
        for item in data_part.split(","):
            if "=" in item:
                key, _, val = item.partition("=")
                pairs[key.strip()] = val.strip()
        try:
            temperature = float(pairs["T"])
            humidity    = float(pairs["H"])
            soil_raw    = int(float(pairs["M"]))
            water_pct   = float(pairs["W"])
            nitrogen    = float(pairs["N"])
            phosphorus  = float(pairs["P"])
            potassium   = float(pairs["K"])
        except (KeyError, ValueError):
            return None
        if math.isnan(temperature) or math.isnan(humidity):
            log.warning("parse_line: DHT11 returned NaN — skipping reading")
            return None
        return {
            "node_id":     cfg_node_id,
            "temperature": temperature,
            "humidity":    humidity,
            "soil_raw":    soil_raw,
            "water_pct":   water_pct,
            "nitrogen":    nitrogen,
            "phosphorus":  phosphorus,
            "potassium":   potassium,
        }

    # --- Format 2: accumulate multi-line block ---

    # Start of block — reset buffer
    if "SENSOR DATA" in cleaned:
        _reading_buffer.clear()
        return None

    # Individual labeled lines — extract numeric value
    patterns = [
        (r"Soil Moisture(?:\s+Value)?:\s*([\d.]+)",  "soil_raw",    int),
        (r"Tank\s+(?:Fullness|%):\s*([\d.]+)",        "water_pct",   float),
        (r"Tank Distance:\s*([\d.]+)",                "dist_cm",     float),
        (r"Temperature:\s*([\d.]+)",                  "temperature", float),
        (r"Humidity:\s*([\d.]+)",                     "humidity",    float),
        (r"Nitrogen:\s*([\d.]+)",                     "nitrogen",    float),
        (r"Phosphorus:\s*([\d.]+)",                   "phosphorus",  float),
        (r"Potassium:\s*([\d.]+)",                    "potassium",   float),
    ]
    for pattern, key, cast in patterns:
        m = re.match(pattern, cleaned, re.IGNORECASE)
        if m:
            try:
                _reading_buffer[key] = cast(m.group(1))
            except ValueError:
                pass
            return None

    # End of block — emit reading if we have the minimum required fields
    if cleaned.startswith("---") and _reading_buffer:
        buf = dict(_reading_buffer)
        _reading_buffer.clear()

        if not all(k in buf for k in ("soil_raw", "temperature", "humidity")):
            return None

        # Derive water_pct from dist_cm if the Fullness line wasn't present
        water_pct = buf.get("water_pct", 0.0)

        temperature = buf["temperature"]
        humidity    = buf["humidity"]
        if math.isnan(temperature) or math.isnan(humidity):
            log.warning("parse_line: DHT11 returned NaN — skipping reading")
            return None

        return {
            "node_id":     cfg_node_id,
            "temperature": temperature,
            "humidity":    humidity,
            "soil_raw":    buf["soil_raw"],
            "water_pct":   water_pct,
            "nitrogen":    buf.get("nitrogen",   0.0),
            "phosphorus":  buf.get("phosphorus", 0.0),
            "potassium":   buf.get("potassium",  0.0),
        }

    return None


# Module-level buffer to accumulate multi-line readings
_reading_buffer: dict = {}
cfg_node_id: str = "arduino-node-1"


# ---------------------------------------------------------------------------
# convert_units
# ---------------------------------------------------------------------------

def _clamp(value: float, lo: float, hi: float, metric: str) -> float:
    if value < lo:
        log.warning("convert_units: %s clamped from %.4f to %.4f (min boundary)", metric, value, lo)
        return lo
    if value > hi:
        log.warning("convert_units: %s clamped from %.4f to %.4f (max boundary)", metric, value, hi)
        return hi
    return value


def convert_units(raw: dict, cal: dict) -> dict:
    """
    Convert raw sensor values to engineering units and apply calibration.
    Calibration formula: calibrated = (value + offset) * scale
    """
    # Soil moisture: invert ADC reading
    soil_pct = (1.0 - raw["soil_raw"] / 1023.0) * 100.0
    soil_pct = max(0.0, min(100.0, soil_pct))

    # NPK values come in as integers directly (mg/kg)
    nitrogen   = float(raw.get("nitrogen", 0) or 0)
    phosphorus = float(raw.get("phosphorus", 0) or 0)
    potassium  = float(raw.get("potassium", 0) or 0)

    # Water percentage is already 0–100 (computed on the Arduino)
    water_pct = float(raw.get("water_pct", 0) or 0)

    pre_cal = {
        "soilMoisture":   soil_pct,
        "temperature":    raw["temperature"],
        "humidity":       raw["humidity"],
        "reservoirLevel": water_pct,
        "nitrogen":       nitrogen,
        "phosphorus":     phosphorus,
        "potassium":      potassium,
    }

    result = {}
    for metric, value in pre_cal.items():
        entry = cal.get(metric, CalibrationEntry())
        calibrated = (value + entry.offset) * entry.scale
        lo, hi = VALID_RANGES[metric]
        result[metric] = _clamp(calibrated, lo, hi, metric)

    return result


# ---------------------------------------------------------------------------
# post_reading
# ---------------------------------------------------------------------------

def post_reading(payload: dict, cfg: AppConfig) -> bool:
    """
    POST payload to cfg.api_url with X-API-Key header.
    Retries up to 3 times with 5s delay on non-2xx.
    Writes to queue.jsonl on total failure.
    Returns True on success, False on total failure.
    """
    headers = {
        "X-API-Key": cfg.api_key,
        "Content-Type": "application/json",
    }
    max_retries = 3
    attempt = 0

    while attempt <= max_retries:
        try:
            resp = requests.post(cfg.api_url, json=payload, headers=headers, timeout=10)
            if 200 <= resp.status_code < 300:
                log.info(
                    "POST success — timestamp=%s node_id=%s status=%d",
                    payload.get("timestamp", "?"),
                    payload.get("nodeId", "?"),
                    resp.status_code,
                )
                return True
            else:
                log.error(
                    "POST failed — attempt=%d/%d status=%d body=%r payload=%s",
                    attempt + 1,
                    max_retries + 1,
                    resp.status_code,
                    resp.text[:200],
                    json.dumps(payload),
                )
        except requests.exceptions.RequestException as exc:
            log.error(
                "POST error — attempt=%d/%d error=%s",
                attempt + 1,
                max_retries + 1,
                exc,
            )

        attempt += 1
        if attempt <= max_retries:
            time.sleep(5)

    # All attempts exhausted — write to queue
    try:
        with open(QUEUE_PATH, "a") as f:
            f.write(json.dumps(payload) + "\n")
        log.warning("Payload queued to %s after %d failed attempts", QUEUE_PATH, max_retries + 1)
    except OSError as exc:
        log.error("Failed to write to queue file %s: %s", QUEUE_PATH, exc)

    return False


# ---------------------------------------------------------------------------
# simulate_reading
# ---------------------------------------------------------------------------

def simulate_reading(node_id: str, t: float) -> dict:
    """
    Generate a synthetic sensor reading for simulation mode.

    t: elapsed seconds since start
    """
    # Temperature: diurnal sine wave ~20-35°C
    temperature = 27.5 + 7.5 * math.sin(2 * math.pi * t / 86400)

    # Humidity: inverse of temperature ~40-80%
    humidity = 60.0 - 20.0 * math.sin(2 * math.pi * t / 86400)

    # Soil moisture: slow decay, resets hourly ~30-80%
    soil_moisture = max(30.0, 80.0 - (t % 3600) / 3600.0 * 50.0)

    # Reservoir level: slow oscillation ~10-50 cm
    reservoir_level = 30.0 + 20.0 * math.sin(2 * math.pi * t / 7200)

    # NPK: deterministic random walk seeded by t
    rng = random.Random(int(t / 60))  # changes every minute
    nitrogen = 50.0 + rng.random() * 450.0      # 50-500 mg/kg
    phosphorus = 20.0 + rng.random() * 180.0    # 20-200 mg/kg
    potassium = 100.0 + rng.random() * 700.0    # 100-800 mg/kg

    return {
        "node_id": node_id,
        "soilMoisture": round(soil_moisture, 2),
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 2),
        "reservoirLevel": round(reservoir_level, 2),
        "nitrogen": round(nitrogen, 2),
        "phosphorus": round(phosphorus, 2),
        "potassium": round(potassium, 2),
    }


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def _build_payload(reading: dict, node_id: str) -> dict:
    """Build the JSON payload for the ingest API from a converted reading."""
    return {
        "nodeId": node_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "soilMoisture": reading["soilMoisture"],
        "temperature": reading["temperature"],
        "humidity": reading["humidity"],
        "reservoirLevel": reading["reservoirLevel"],
        "ph": 7.0,  # Arduino sketch does not include pH; use neutral default
        "nitrogen": reading.get("nitrogen"),
        "phosphorus": reading.get("phosphorus"),
        "potassium": reading.get("potassium"),
    }


def main() -> None:
    global cfg_node_id
    cfg = load_config()
    cfg_node_id = cfg.node_id
    validate_startup(cfg)

    log.info(
        "Serial bridge starting — mode=%s node_id=%s",
        "simulation" if cfg.simulation else "live",
        cfg.node_id,
    )

    record_count = 0
    start_time = time.time()

    if cfg.simulation:
        log.info("Simulation mode active — interval=%dms", cfg.interval_ms)
        try:
            while True:
                t = time.time() - start_time
                reading = simulate_reading(cfg.node_id, t)
                payload = _build_payload(reading, cfg.node_id)
                post_reading(payload, cfg)
                record_count += 1
                log.info("Records sent this session: %d", record_count)
                time.sleep(cfg.interval_ms / 1000.0)
        except KeyboardInterrupt:
            log.info("Simulation stopped by user. Total records sent: %d", record_count)
    else:
        # Live mode — read from serial port
        try:
            import serial as pyserial
        except ImportError:
            sys.exit("ERROR: pyserial is not installed. Run: pip install pyserial")

        log.info("Opening serial port %s at %d baud", cfg.serial_port, cfg.baud_rate)
        try:
            ser = pyserial.Serial(cfg.serial_port, cfg.baud_rate, timeout=5)
        except Exception as exc:
            sys.exit(f"ERROR: Could not open serial port '{cfg.serial_port}': {exc}")

        log.info("Serial port open. Waiting for data...")
        try:
            while True:
                try:
                    raw_line = ser.readline()
                    if not raw_line:
                        continue
                    line = raw_line.decode("utf-8", errors="replace")
                except Exception as exc:
                    log.warning("Serial read error: %s", exc)
                    continue

                log.debug("RX: %r", line.rstrip())
                parsed = parse_line(line)
                if parsed is None:
                    continue

                converted = convert_units(parsed, cfg.calibration)
                payload = _build_payload(converted, cfg.node_id)
                post_reading(payload, cfg)
                record_count += 1
                log.info("Records sent this session: %d", record_count)
        except KeyboardInterrupt:
            log.info("Bridge stopped by user. Total records sent: %d", record_count)
        finally:
            ser.close()
            log.info("Serial port closed.")


if __name__ == "__main__":
    main()
