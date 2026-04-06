# Implementation Plan: Arduino Sensor Integration

## Overview

Extend the AquaSense dashboard to ingest NPK sensor data from a physical Arduino node via a Python serial bridge. The implementation proceeds in layers: schema → validation → API → aggregation → UI → alerts → Arduino sketch → Python bridge → tests.

## Tasks

- [x] 1. Extend Prisma schema with NPK fields
  - Add `nitrogen Float?`, `phosphorus Float?`, `potassium Float?` to `SensorReading` model in `prisma/schema.prisma`
  - Create a new migration: `npx prisma migrate dev --name add_npk_fields`
  - Regenerate Prisma client: `npx prisma generate`
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 2. Extend validation and ingest API
  - [x] 2.1 Add NPK ranges to `lib/validation.ts`
    - Add `nitrogen`, `phosphorus`, `potassium` entries to `SENSOR_RANGES` with `{ min: 0, max: 1999 }`
    - Extend `validateSensorPayload` to validate optional NPK fields: skip if absent, return 400 with field-level error if present and out of range
    - _Requirements: 4.3, 4.4_

  - [ ]* 2.2 Write property test for NPK validation (P12)
    - **Property 12: Out-of-range NPK values are rejected with 400**
    - **Validates: Requirements 4.4**
    - Add to `__tests__/api/ingest.test.ts` using fast-check, `numRuns: 100`

  - [x] 2.3 Extend `app/api/ingest/route.ts` to accept and persist NPK fields
    - Extend the payload type to include `nitrogen?: number | null`, `phosphorus?: number | null`, `potassium?: number | null`
    - Pass NPK fields to `prisma.sensorReading.create` (undefined → stored as null)
    - Pass NPK values to `evaluateThresholds` call
    - _Requirements: 4.3, 8.2_

  - [ ]* 2.4 Write property test for NPK round-trip through API (P11)
    - **Property 11: NPK round-trip through the full API stack**
    - **Validates: Requirements 4.2, 4.3, 10.1, 10.2, 10.3**
    - Add to `__tests__/api/ingest.test.ts` using fast-check, `numRuns: 100`

  - [ ]* 2.5 Write property test for timestamp millisecond precision (P15)
    - **Property 15: Timestamp millisecond precision is preserved through persistence**
    - **Validates: Requirements 8.3**
    - Add to `__tests__/api/ingest.test.ts` using fast-check, `numRuns: 100`

  - [ ]* 2.6 Write unit tests for ingest edge cases
    - Test: payload without NPK fields is accepted (Req 4.1)
    - Test: null NPK fields serialized as `null` not omitted in response (Req 10.4)
    - Add to `__tests__/api/ingest.test.ts`

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extend aggregation and readings API
  - [x] 4.1 Extend `lib/aggregation.ts` to include NPK averages
    - Add `AVG(nitrogen) AS nitrogen`, `AVG(phosphorus) AS phosphorus`, `AVG(potassium) AS potassium` to the raw SQL query
    - Extend `AggregatedReading` interface with `nitrogen: number | null`, `phosphorus: number | null`, `potassium: number | null`
    - Map the new columns in the result `.map()` using `row.nitrogen !== null ? Number(row.nitrogen) : null`
    - _Requirements: 10.3_

  - [x] 4.2 Extend `app/api/nodes/[id]/readings/route.ts` to include NPK in response
    - Ensure NPK fields are included in both aggregated and raw reading responses
    - Serialize null NPK fields as `null` (not omitted) — Prisma returns them automatically once schema is migrated
    - _Requirements: 10.3, 10.4_

- [x] 5. Extend UI components
  - [x] 5.1 Add NPK series to `app/nodes/[id]/components/AllSensorsChart.tsx`
    - Add three entries to `SENSOR_LINES`:
      - `{ key: "nitrogen",   name: "Nitrogen (mg/kg)",   color: "#a3e635" }`
      - `{ key: "phosphorus", name: "Phosphorus (mg/kg)",  color: "#f97316" }`
      - `{ key: "potassium",  name: "Potassium (mg/kg)",   color: "#c084fc" }`
    - Extend the `data` mapping to include `nitrogen`, `phosphorus`, `potassium` from each reading
    - Update the subtitle text to reflect 7 sensors
    - _Requirements: 6.1, 6.2_

  - [ ]* 5.2 Write unit tests for AllSensorsChart
    - Test: `SENSOR_LINES` has exactly 7 entries with distinct colors (Req 6.1, 6.2)
    - Test: empty readings renders no-data message (Req 6.5)
    - Add to `__tests__/components/AllSensorsChart.test.tsx`

  - [x] 5.3 Add NPK metric rows to `app/dashboard/components/SensorCard.tsx`
    - Import `Leaf` from `lucide-react`
    - Add three entries to `METRICS`:
      - `{ key: 'nitrogen',   label: 'Nitrogen',   unit: ' mg/kg', icon: Leaf, color: 'text-lime-500',   bg: 'bg-lime-50' }`
      - `{ key: 'phosphorus', label: 'Phosphorus', unit: ' mg/kg', icon: Leaf, color: 'text-orange-500', bg: 'bg-orange-50' }`
      - `{ key: 'potassium',  label: 'Potassium',  unit: ' mg/kg', icon: Leaf, color: 'text-purple-500', bg: 'bg-purple-50' }`
    - Extend `SensorCardProps` and `LiveReadings` interfaces with `nitrogen?: number | null`, `phosphorus?: number | null`, `potassium?: number | null`
    - Extend SSE handler and polling handler to update NPK fields from live data
    - _Requirements: 7.1, 7.2_

  - [ ]* 5.4 Write property test for SensorCard NPK rendering (P13)
    - **Property 13: SensorCard renders NPK values with units for any non-null input**
    - **Validates: Requirements 7.1**
    - Add to `__tests__/components/SensorCard.test.tsx` using fast-check, `numRuns: 100`

  - [ ]* 5.5 Write unit tests for SensorCard null NPK fallback
    - Test: null NPK props render `—` (Req 7.2)
    - Add to `__tests__/components/SensorCard.test.tsx`

- [x] 6. Extend alerts for NPK metrics
  - [x] 6.1 Extend `lib/alerts.ts` to include NPK in threshold evaluation
    - Add `'nitrogen' | 'phosphorus' | 'potassium'` to the `SensorMetric` union type
    - Add `nitrogen`, `phosphorus`, `potassium` to the `METRICS` array in `evaluateThresholds`
    - Extend `ReadingValues` interface with `nitrogen?: number | null`, `phosphorus?: number | null`, `potassium?: number | null`
    - Skip evaluation for null/undefined NPK values (node has no NPK sensor)
    - _Requirements: 7.3, 7.4_

  - [ ]* 6.2 Write property test for NPK threshold alerts (P14)
    - **Property 14: NPK threshold alerts fire for any breach**
    - **Validates: Requirements 7.3**
    - Add to `__tests__/lib/alerts.test.ts` using fast-check, `numRuns: 100`

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write Arduino sketch
  - Create `arduino/sensor_node.ino`
  - Implement DHT11 read on pin 2 with `-999` sentinel on failure (Req 1.1, 1.7)
  - Implement soil moisture ADC read on pin A0 (Req 1.2)
  - Implement HC-SR04 ultrasonic read with trigger pin 4 / echo pin 14 (Req 1.3)
  - Implement NPK RS485 read via SoftwareSerial on pins 12/13 with 500 ms timeout and `-1` sentinel (Req 1.4, 1.8)
  - Print one CSV line per cycle: `NODE_ID,<temp>,<humidity>,<soilRaw>,<distCm>,<nHex>,<pHex>,<kHex>` at 9600 baud (Req 1.5, 1.6)
  - Define `NODE_ID` as a compile-time constant string (Req 1.5)
  - _Requirements: 1.1–1.8_

- [x] 9. Write Python serial bridge
  - [x] 9.1 Create `serial_bridge/config.yaml` with all configuration fields
    - Include: `serial_port`, `baud_rate`, `api_url`, `api_key`, `node_id`, `interval_ms`, `simulation`, and `calibration` block for all 7 metrics
    - _Requirements: 9.1, 9.3, 2.4_

  - [x] 9.2 Create `serial_bridge/bridge.py` — config loader and startup validation
    - Implement config loader that reads `config.yaml` and merges environment variable overrides
    - Raise descriptive errors identifying each missing or invalid field (Req 9.2)
    - On startup: validate serial port exists and API endpoint is reachable; exit with descriptive error if either fails (Req 3.6)
    - _Requirements: 3.6, 9.1, 9.2_

  - [x] 9.3 Implement `parse_line`, `convert_units`, and `post_reading` in `serial_bridge/bridge.py`
    - `parse_line(line)`: tokenize CSV, return `None` for sentinel values (`-999` temp/humidity, `-1` NPK) or wrong token count (Req 1.7, 1.8)
    - `convert_units(raw, cal)`: soil `(1 - adc/1023)*100` clamped to [0,100]; NPK `int(hex, 16)`; apply `(value + offset) * scale`; clamp to valid range with warning log (Req 2.1–2.5)
    - `post_reading(payload, cfg)`: POST with `X-API-Key` header; retry up to 3× with 5 s delay; write to `queue.jsonl` on total failure; log success with timestamp and node ID (Req 3.1–3.5)
    - _Requirements: 1.7, 1.8, 2.1–2.5, 3.1–3.5_

  - [x] 9.4 Implement `simulate_reading` and main read loop in `serial_bridge/bridge.py`
    - `simulate_reading(node_id, t)`: diurnal temperature sine wave ~20–35°C, inverse humidity ~40–80%, slow soil decay ~30–80%, reservoir oscillation ~10–50 cm, NPK slow random walk within [0, 1999] (Req 5.3, 5.4)
    - Main loop: read from serial or call `simulate_reading` based on config flag; log cumulative record count (Req 5.1, 5.5)
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

  - [x] 9.5 Create `serial_bridge/README.md`
    - Document each configuration parameter, its valid range, and an example value
    - Include setup instructions, dependency installation (`pip install pyserial pyyaml requests`), and simulation mode usage
    - _Requirements: 9.3, 9.4_

- [x] 10. Write Python property-based tests
  - [x] 10.1 Create `serial_bridge/tests/__init__.py` and `serial_bridge/tests/test_bridge.py`
    - Set up hypothesis test file with `@settings(max_examples=100)` on all property tests

  - [x]* 10.2 Write property test P1 — Valid CSV lines parse correctly
    - **Property 1: Valid CSV lines parse correctly**
    - **Validates: Requirements 1.5, 1.6**

  - [x]* 10.3 Write property test P2 — Sentinel lines are discarded
    - **Property 2: Sentinel lines are discarded**
    - **Validates: Requirements 1.7, 1.8**

  - [x]* 10.4 Write property test P3 — Soil moisture ADC conversion stays in [0, 100]
    - **Property 3: Soil moisture ADC conversion stays in [0, 100]**
    - **Validates: Requirements 2.1**

  - [x]* 10.5 Write property test P4 — NPK hex parsing round-trip
    - **Property 4: NPK hex parsing round-trip**
    - **Validates: Requirements 2.2**

  - [x]* 10.6 Write property test P5 — Calibration formula correctness
    - **Property 5: Calibration formula correctness**
    - **Validates: Requirements 2.3**

  - [x]* 10.7 Write property test P6 — Out-of-range values are clamped to valid boundaries
    - **Property 6: Out-of-range values are clamped to valid boundaries**
    - **Validates: Requirements 2.5**

  - [x]* 10.8 Write property test P7 — Constructed payload contains all required fields
    - **Property 7: Constructed payload contains all required fields with correct types**
    - **Validates: Requirements 3.1, 8.2**

  - [x]* 10.9 Write property test P8 — Retry logic attempts exactly 3 times on non-2xx
    - **Property 8: Retry logic attempts exactly 3 times on non-2xx responses**
    - **Validates: Requirements 3.3**

  - [x]* 10.10 Write property test P9 — Failed payloads are written to the queue file
    - **Property 9: Failed payloads are written to the queue file**
    - **Validates: Requirements 3.4**

  - [x]* 10.11 Write property test P10 — Simulation readings are within valid ranges and vary over time
    - **Property 10: Simulation readings are within valid ranges and vary over time**
    - **Validates: Requirements 5.3, 5.4**

  - [x]* 10.12 Write property test P16 — Config loader raises descriptive errors
    - **Property 16: Config loader raises descriptive errors for missing or invalid fields**
    - **Validates: Requirements 9.2**

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `hypothesis` (Python) and `fast-check` (TypeScript) with `max_examples`/`numRuns: 100`
- The Prisma migration in task 1 must be run before any API or test tasks that touch NPK fields
- `lib/thresholds.ts` requires no changes — it derives valid metrics from `SENSOR_RANGES` automatically once task 2.1 is complete
