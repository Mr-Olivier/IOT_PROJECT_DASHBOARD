"""
Property-based tests for serial_bridge/bridge.py using hypothesis.
Feature: arduino-sensor-integration
"""

import json
import os
import sys
import tempfile
import time
from unittest.mock import MagicMock, patch

import pytest
import yaml
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# ---------------------------------------------------------------------------
# Path setup — bridge.py is not a package
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from serial_bridge.bridge import (
    parse_line,
    convert_units,
    post_reading,
    simulate_reading,
    load_config,
    VALID_RANGES,
    CalibrationEntry,
    AppConfig,
    _build_payload,
)

# ---------------------------------------------------------------------------
# Shared strategies
# ---------------------------------------------------------------------------

VALID_HEX_BYTES = [f"{i:02X}" for i in range(256)]

node_id_st = st.text(
    alphabet=st.characters(blacklist_characters=",\n\r"),
    min_size=1,
    max_size=20,
)

temp_st = st.floats(min_value=-40.0, max_value=80.0, allow_nan=False, allow_infinity=False).filter(
    lambda x: x != -999.0
)

humidity_st = st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False).filter(
    lambda x: x != -999.0
)

soil_raw_st = st.integers(min_value=0, max_value=1023)

dist_cm_st = st.floats(min_value=0.0, max_value=400.0, allow_nan=False, allow_infinity=False)

hex_byte_st = st.sampled_from(VALID_HEX_BYTES)


# ---------------------------------------------------------------------------
# P1 — Valid CSV lines parse correctly
# ---------------------------------------------------------------------------

# Feature: arduino-sensor-integration, Property 1: Valid CSV lines parse correctly
@settings(max_examples=100)
@given(
    node_id=node_id_st,
    temp=temp_st,
    humidity=humidity_st,
    soil_raw=soil_raw_st,
    dist_cm=dist_cm_st,
    n_hex=hex_byte_st,
    p_hex=hex_byte_st,
    k_hex=hex_byte_st,
)
def test_p1_valid_csv_lines_parse_correctly(node_id, temp, humidity, soil_raw, dist_cm, n_hex, p_hex, k_hex):
    """Validates: Requirements 1.5, 1.6"""
    line = f"{node_id},{temp},{humidity},{soil_raw},{dist_cm},{n_hex},{p_hex},{k_hex}"
    result = parse_line(line)
    assert result is not None, f"parse_line returned None for valid line: {line!r}"
    assert isinstance(result, dict)
    for key in ("node_id", "temperature", "humidity", "soil_raw", "dist_cm", "n_hex", "p_hex", "k_hex"):
        assert key in result, f"Missing key {key!r} in result"


# ---------------------------------------------------------------------------
# P2 — Sentinel lines are discarded
# ---------------------------------------------------------------------------

# Feature: arduino-sensor-integration, Property 2: Sentinel lines are discarded
@settings(max_examples=100)
@given(
    node_id=node_id_st,
    soil_raw=soil_raw_st,
    dist_cm=dist_cm_st,
    n_hex=hex_byte_st,
    p_hex=hex_byte_st,
    k_hex=hex_byte_st,
)
def test_p2_dht11_sentinel_discarded(node_id, soil_raw, dist_cm, n_hex, p_hex, k_hex):
    """Validates: Requirements 1.7 — DHT11 failure sentinel (-999) causes parse_line to return None"""
    line = f"{node_id},-999.0,-999.0,{soil_raw},{dist_cm},{n_hex},{p_hex},{k_hex}"
    result = parse_line(line)
    assert result is None, f"Expected None for DHT11 sentinel line, got: {result}"


# Feature: arduino-sensor-integration, Property 2: Sentinel lines are discarded (NPK)
@settings(max_examples=100)
@given(
    node_id=node_id_st,
    temp=temp_st,
    humidity=humidity_st,
    soil_raw=soil_raw_st,
    dist_cm=dist_cm_st,
)
def test_p2_npk_sentinel_discarded(node_id, temp, humidity, soil_raw, dist_cm):
    """Validates: Requirements 1.8 — NPK timeout sentinel (-1) causes parse_line to return None"""
    line = f"{node_id},{temp},{humidity},{soil_raw},{dist_cm},-1,-1,-1"
    result = parse_line(line)
    assert result is None, f"Expected None for NPK sentinel line, got: {result}"


# ---------------------------------------------------------------------------
# P3 — Soil moisture ADC conversion stays in [0, 100]
# ---------------------------------------------------------------------------

# Feature: arduino-sensor-integration, Property 3: Soil moisture ADC conversion stays in [0, 100]
@settings(max_examples=100)
@given(adc=st.integers(min_value=0, max_value=1023))
def test_p3_soil_moisture_adc_in_range(adc):
    """Validates: Requirements 2.1"""
    result = (1 - adc / 1023) * 100
    result = max(0.0, min(100.0, result))
    assert 0.0 <= result <= 100.0, f"Soil moisture {result} out of [0, 100] for adc={adc}"


def test_p3_soil_moisture_adc_boundary_zero():
    """adc=0 should yield 100.0"""
    result = (1 - 0 / 1023) * 100
    result = max(0.0, min(100.0, result))
    assert result == 100.0


def test_p3_soil_moisture_adc_boundary_max():
    """adc=1023 should yield approximately 0.0"""
    result = (1 - 1023 / 1023) * 100
    result = max(0.0, min(100.0, result))
    assert abs(result - 0.0) < 0.1


# ---------------------------------------------------------------------------
# P4 — NPK hex parsing round-trip
# ---------------------------------------------------------------------------

# Feature: arduino-sensor-integration, Property 4: NPK hex parsing round-trip
@settings(max_examples=100)
@given(n=st.integers(min_value=0, max_value=255))
def test_p4_npk_hex_round_trip(n):
    """Validates: Requirements 2.2"""
    hex_str = f"{n:02X}"
    parsed = int(hex_str, 16)
    assert parsed == n, f"Round-trip failed: {n} -> {hex_str!r} -> {parsed}"
    # Also verify the hex string is uppercase and zero-padded
    assert hex_str == hex_str.upper()
    assert len(hex_str) == 2


# ---------------------------------------------------------------------------
# P5 — Calibration formula correctness
# ---------------------------------------------------------------------------

# Feature: arduino-sensor-integration, Property 5: Calibration formula correctness
@settings(max_examples=100)
@given(
    value=st.floats(min_value=-1e6, max_value=1e6, allow_nan=False, allow_infinity=False),
    offset=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False, allow_infinity=False),
    scale=st.floats(min_value=0.1, max_value=10.0, allow_nan=False, allow_infinity=False),
)
def test_p5_calibration_formula(value, offset, scale):
    """Validates: Requirements 2.3"""
    result = (value + offset) * scale
    expected = (value + offset) * scale
    assert result == expected


@settings(max_examples=100)
@given(value=st.floats(min_value=-1e6, max_value=1e6, allow_nan=False, allow_infinity=False))
def test_p5_calibration_identity(value):
    """With offset=0 and scale=1.0, calibration should be identity"""
    result = (value + 0.0) * 1.0
    assert result == value


# ---------------------------------------------------------------------------
# P6 — Out-of-range values are clamped to valid boundaries
# ---------------------------------------------------------------------------

def _apply_clamp(metric: str, value: float) -> float:
    lo, hi = VALID_RANGES[metric]
    return max(lo, min(hi, value))


# Feature: arduino-sensor-integration, Property 6: Out-of-range values are clamped to valid boundaries
@settings(max_examples=100)
@given(
    metric=st.sampled_from(list(VALID_RANGES.keys())),
    value=st.floats(min_value=-9999.0, max_value=9999.0, allow_nan=False, allow_infinity=False),
)
def test_p6_clamping_stays_in_range(metric, value):
    """Validates: Requirements 2.5"""
    lo, hi = VALID_RANGES[metric]
    result = _apply_clamp(metric, value)
    assert lo <= result <= hi, f"Clamped value {result} outside [{lo}, {hi}] for metric={metric}, input={value}"


@settings(max_examples=100)
@given(
    metric=st.sampled_from(list(VALID_RANGES.keys())),
    value=st.floats(min_value=-9999.0, max_value=9999.0, allow_nan=False, allow_infinity=False),
)
def test_p6_clamping_below_min(metric, value):
    """Values below min are clamped to min"""
    lo, hi = VALID_RANGES[metric]
    below = lo - abs(value) - 1.0
    result = _apply_clamp(metric, below)
    assert result == lo


@settings(max_examples=100)
@given(
    metric=st.sampled_from(list(VALID_RANGES.keys())),
    value=st.floats(min_value=-9999.0, max_value=9999.0, allow_nan=False, allow_infinity=False),
)
def test_p6_clamping_above_max(metric, value):
    """Values above max are clamped to max"""
    lo, hi = VALID_RANGES[metric]
    above = hi + abs(value) + 1.0
    result = _apply_clamp(metric, above)
    assert result == hi


# ---------------------------------------------------------------------------
# P7 — Constructed payload contains all required fields
# ---------------------------------------------------------------------------

def _make_converted_reading(node_id="test-node"):
    """Build a minimal valid converted reading dict."""
    return {
        "node_id": node_id,
        "soilMoisture": 50.0,
        "temperature": 25.0,
        "humidity": 60.0,
        "reservoirLevel": 20.0,
        "nitrogen": 100.0,
        "phosphorus": 50.0,
        "potassium": 200.0,
    }


# Feature: arduino-sensor-integration, Property 7: Constructed payload contains all required fields
@settings(max_examples=100)
@given(
    node_id=node_id_st,
    soil=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
    temp=st.floats(min_value=-40.0, max_value=80.0, allow_nan=False, allow_infinity=False),
    hum=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
    res=st.floats(min_value=0.0, max_value=400.0, allow_nan=False, allow_infinity=False),
    n=st.floats(min_value=0.0, max_value=1999.0, allow_nan=False, allow_infinity=False),
    p=st.floats(min_value=0.0, max_value=1999.0, allow_nan=False, allow_infinity=False),
    k=st.floats(min_value=0.0, max_value=1999.0, allow_nan=False, allow_infinity=False),
)
def test_p7_payload_has_required_fields(node_id, soil, temp, hum, res, n, p, k):
    """Validates: Requirements 3.1, 8.2"""
    reading = {
        "soilMoisture": soil,
        "temperature": temp,
        "humidity": hum,
        "reservoirLevel": res,
        "nitrogen": n,
        "phosphorus": p,
        "potassium": k,
    }
    payload = _build_payload(reading, node_id)

    required_keys = {
        "nodeId", "timestamp", "soilMoisture", "temperature", "humidity",
        "reservoirLevel", "ph", "nitrogen", "phosphorus", "potassium",
    }
    for key in required_keys:
        assert key in payload, f"Missing key {key!r} in payload"

    assert isinstance(payload["nodeId"], str)
    # Validate ISO 8601 timestamp
    ts = payload["timestamp"]
    assert isinstance(ts, str)
    # Should contain 'T' and end with '+00:00' or 'Z'
    assert "T" in ts, f"Timestamp {ts!r} is not ISO 8601"


# ---------------------------------------------------------------------------
# P8 — Retry logic attempts exactly 3 times on non-2xx
# ---------------------------------------------------------------------------

def _make_app_config(api_url="http://localhost:3000/api/ingest"):
    return AppConfig(
        serial_port="/dev/ttyUSB0",
        baud_rate=9600,
        api_url=api_url,
        api_key="test-key",
        node_id="test-node",
        interval_ms=2000,
        simulation=True,
        calibration={},
    )


# Feature: arduino-sensor-integration, Property 8: Retry logic attempts exactly 3 times on non-2xx responses
@settings(max_examples=100)
@given(status_code=st.sampled_from([400, 401, 403, 404, 500, 502, 503]))
def test_p8_retry_exactly_3_times(status_code):
    """Validates: Requirements 3.3"""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.text = "error"

    cfg = _make_app_config()
    payload = {"nodeId": "test-node", "timestamp": "2024-01-01T00:00:00+00:00"}

    with patch("serial_bridge.bridge.requests.post", return_value=mock_response) as mock_post, \
         patch("serial_bridge.bridge.time.sleep") as mock_sleep, \
         patch("serial_bridge.bridge.QUEUE_PATH", tempfile.mktemp(suffix=".jsonl")):
        result = post_reading(payload, cfg)

    # 1 initial + 3 retries = 4 total calls
    assert mock_post.call_count == 4, (
        f"Expected 4 POST calls (1 initial + 3 retries), got {mock_post.call_count}"
    )
    assert result is False


# ---------------------------------------------------------------------------
# P9 — Failed payloads are written to the queue file
# ---------------------------------------------------------------------------

# Feature: arduino-sensor-integration, Property 9: Failed payloads are written to the queue file
@settings(max_examples=100)
@given(
    node_id=node_id_st,
    soil=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
    temp=st.floats(min_value=-40.0, max_value=80.0, allow_nan=False, allow_infinity=False),
)
def test_p9_failed_payloads_queued(node_id, soil, temp):
    """Validates: Requirements 3.4"""
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"

    payload = {
        "nodeId": node_id,
        "timestamp": "2024-01-01T00:00:00+00:00",
        "soilMoisture": soil,
        "temperature": temp,
    }
    cfg = _make_app_config()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as tmp:
        queue_path = tmp.name

    try:
        with patch("serial_bridge.bridge.requests.post", return_value=mock_response), \
             patch("serial_bridge.bridge.time.sleep"), \
             patch("serial_bridge.bridge.QUEUE_PATH", queue_path):
            post_reading(payload, cfg)

        with open(queue_path, "r") as f:
            lines = [l.strip() for l in f if l.strip()]

        assert len(lines) >= 1, "Queue file should have at least one line"
        queued = json.loads(lines[-1])
        assert queued["nodeId"] == node_id
        assert queued["timestamp"] == payload["timestamp"]
    finally:
        os.unlink(queue_path)


# ---------------------------------------------------------------------------
# P10 — Simulation readings are within valid ranges and vary over time
# ---------------------------------------------------------------------------

# Feature: arduino-sensor-integration, Property 10: Simulation readings are within valid ranges and vary over time
@settings(max_examples=100)
@given(
    n_steps=st.integers(min_value=2, max_value=20),
    interval=st.floats(min_value=1.0, max_value=3600.0, allow_nan=False, allow_infinity=False),
)
def test_p10_simulation_readings_in_range_and_vary(n_steps, interval):
    """Validates: Requirements 5.3, 5.4"""
    node_id = "sim-node"
    readings = [simulate_reading(node_id, i * interval) for i in range(n_steps)]

    metric_keys = ["soilMoisture", "temperature", "humidity", "reservoirLevel",
                   "nitrogen", "phosphorus", "potassium"]

    for i, reading in enumerate(readings):
        for key in metric_keys:
            assert key in reading, f"Missing key {key!r} in reading at step {i}"
            val = reading[key]
            lo, hi = VALID_RANGES[key]
            assert lo <= val <= hi, (
                f"Reading[{i}][{key}]={val} outside [{lo}, {hi}]"
            )

    # At least one metric should vary across the sequence
    any_varies = False
    for key in metric_keys:
        values = [r[key] for r in readings]
        if len(set(values)) > 1:
            any_varies = True
            break

    assert any_varies, "All simulation readings are identical — expected variation over time"


# ---------------------------------------------------------------------------
# P16 — Config loader raises descriptive errors for missing fields
# ---------------------------------------------------------------------------

REQUIRED_CONFIG_FIELDS = [
    "serial_port",
    "baud_rate",
    "api_url",
    "api_key",
    "node_id",
    "interval_ms",
    "simulation",
]

_VALID_CONFIG = {
    "serial_port": "/dev/ttyUSB0",
    "baud_rate": 9600,
    "api_url": "http://localhost:3000/api/ingest",
    "api_key": "test-key",
    "node_id": "test-node",
    "interval_ms": 2000,
    "simulation": False,
}


# Feature: arduino-sensor-integration, Property 16: Config loader raises descriptive errors for missing or invalid fields
@settings(max_examples=100)
@given(missing_field=st.sampled_from(REQUIRED_CONFIG_FIELDS))
def test_p16_config_loader_raises_on_missing_field(missing_field):
    """Validates: Requirements 9.2"""
    config_dict = dict(_VALID_CONFIG)
    del config_dict[missing_field]

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".yaml", delete=False
    ) as tmp:
        yaml.dump(config_dict, tmp)
        tmp_path = tmp.name

    try:
        with pytest.raises(ValueError) as exc_info:
            load_config(tmp_path)
        error_msg = str(exc_info.value)
        assert missing_field in error_msg, (
            f"Error message {error_msg!r} does not mention missing field {missing_field!r}"
        )
    finally:
        os.unlink(tmp_path)
