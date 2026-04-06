# Requirements Document

## Introduction

Arduino Sensor Integration extends the AquaSense smart irrigation dashboard to support an Arduino-based sensor node that reads from four physical sensors: a DHT11 temperature/humidity sensor, a soil moisture sensor, an HC-SR04 ultrasonic water-level sensor, and an NPK sensor via RS485/MAX485. A serial bridge process (Python or Node.js) reads the Arduino's serial output at 9600 baud, applies unit conversion and calibration, and forwards the data to the existing Next.js ingest API. The dashboard then displays all four sensor streams on a synchronized multi-line time-series chart alongside the existing sensor cards. The system must accumulate a minimum of 100,000 timestamped records in the database.

---

## Glossary

- **Arduino_Node**: The Arduino microcontroller that reads all four sensors and transmits raw sensor data over a serial connection at 9600 baud.
- **Serial_Bridge**: The host-side process (Python or Node.js script) that reads the Arduino_Node's serial output, applies unit conversion and calibration, and forwards structured JSON payloads to the API_Layer via HTTP POST.
- **DHT11**: The temperature and humidity sensor connected to Arduino digital pin 2. Outputs temperature in °C and relative humidity in %.
- **Soil_Moisture_Sensor**: The analog soil moisture sensor connected to Arduino analog pin A0. Outputs a raw ADC value in the range 0–1023, which the Serial_Bridge converts to a moisture percentage.
- **Ultrasonic_Sensor**: The HC-SR04 ultrasonic distance sensor with trigger on Arduino pin 4 and echo on pin 14. Measures the distance to the water surface in cm, representing the water tank level.
- **NPK_Sensor**: The RS485/MAX485 soil nutrient sensor connected via SoftwareSerial on Arduino pins 12 (RX) and 13 (TX). Returns nitrogen (N), phosphorus (P), and potassium (K) values encoded in hexadecimal.
- **Calibration_Config**: A configuration file or environment variables that store per-sensor offset and scale factors used by the Serial_Bridge to correct for sensor drift.
- **API_Layer**: The existing Next.js API routes, specifically `POST /api/ingest`, that accept sensor reading payloads and persist them to the Data_Store.
- **Data_Store**: The PostgreSQL database accessed via Prisma ORM that persists all sensor readings with timestamps.
- **Dashboard**: The existing Next.js web application that displays sensor data, charts, and node status.
- **AllSensors_Chart**: The multi-line Recharts `LineChart` component that renders all sensor series on a single synchronized time axis.
- **Sensor_Record**: A single timestamped row in the Data_Store containing converted and calibrated values for all four sensors from one Arduino_Node reading cycle.

---

## Requirements

### Requirement 1: Arduino Serial Data Transmission

**User Story:** As a developer, I want the Arduino to continuously read all four sensors and transmit structured data over serial, so that the Serial_Bridge can reliably consume and forward the readings.

#### Acceptance Criteria

1. THE Arduino_Node SHALL read the DHT11 sensor on pin 2 and transmit temperature in °C and humidity in % with each reading cycle.
2. THE Arduino_Node SHALL read the Soil_Moisture_Sensor on analog pin A0 and transmit the raw ADC value (0–1023) with each reading cycle.
3. THE Arduino_Node SHALL read the Ultrasonic_Sensor with trigger on pin 4 and echo on pin 14 and transmit the measured distance in cm with each reading cycle.
4. THE Arduino_Node SHALL read the NPK_Sensor via SoftwareSerial on pins 12 and 13 using the RS485/MAX485 protocol and transmit nitrogen, phosphorus, and potassium values in hexadecimal with each reading cycle.
5. THE Arduino_Node SHALL assign a unique sensor identifier to each reading transmission so that the Serial_Bridge can associate data with the correct node.
6. THE Arduino_Node SHALL transmit all sensor values as a single delimited line over serial at 9600 baud so that the Serial_Bridge can parse each reading atomically.
7. IF the DHT11 sensor returns an invalid reading, THEN THE Arduino_Node SHALL transmit a sentinel value (e.g., -999) for temperature and humidity so that the Serial_Bridge can detect and discard the malformed reading.
8. IF the NPK_Sensor does not respond within 500ms, THEN THE Arduino_Node SHALL transmit a sentinel value for nitrogen, phosphorus, and potassium so that the Serial_Bridge can detect and discard the malformed reading.

---

### Requirement 2: Unit Conversion and Calibration

**User Story:** As a developer, I want raw sensor values converted to meaningful engineering units and corrected for sensor drift, so that the dashboard displays accurate, interpretable data.

#### Acceptance Criteria

1. WHEN the Serial_Bridge receives a raw Soil_Moisture_Sensor ADC value, THE Serial_Bridge SHALL convert it to a moisture percentage using the formula: `moisture_pct = (1 - (raw_adc / 1023)) * 100`, clamped to the range [0, 100].
2. WHEN the Serial_Bridge receives NPK hexadecimal values, THE Serial_Bridge SHALL parse each hex byte into a decimal integer representing mg/kg (ppm) for nitrogen, phosphorus, and potassium respectively.
3. THE Serial_Bridge SHALL apply a configurable offset and scale factor from the Calibration_Config to each converted sensor value using the formula: `calibrated = (raw_converted + offset) * scale`, where offset and scale default to 0 and 1.0 respectively.
4. THE Serial_Bridge SHALL document the conversion formula, reference values, and calibration parameters for each sensor in a human-readable configuration file.
5. WHEN a calibrated sensor value falls outside the valid range for its metric after calibration, THE Serial_Bridge SHALL clamp the value to the nearest boundary and log a warning identifying the sensor, the pre-clamp value, and the applied boundary.
6. THE Serial_Bridge SHALL expose the Calibration_Config as an editable file so that operators can adjust offset and scale factors without modifying source code.

---

### Requirement 3: Serial Bridge Data Forwarding

**User Story:** As a developer, I want the Serial_Bridge to reliably forward converted sensor data to the dashboard API, so that all readings are persisted with accurate timestamps.

#### Acceptance Criteria

1. WHEN the Serial_Bridge successfully converts a reading from the Arduino_Node, THE Serial_Bridge SHALL construct a JSON payload containing the node identifier, an ISO 8601 UTC timestamp generated at the moment of serial receipt, and the calibrated values for soil moisture (%), temperature (°C), humidity (%), reservoir level (cm), nitrogen (mg/kg), phosphorus (mg/kg), and potassium (mg/kg).
2. THE Serial_Bridge SHALL send the JSON payload to `POST /api/ingest` with the node's API key in the `X-API-Key` header within 2 seconds of receiving the serial line.
3. IF the `POST /api/ingest` request returns a non-2xx response, THEN THE Serial_Bridge SHALL log the error including the HTTP status code, the response body, and the original payload, and SHALL retry the request up to 3 times with a 5-second delay between attempts.
4. IF all retry attempts fail, THEN THE Serial_Bridge SHALL write the failed payload to a local file-based queue so that it can be replayed when connectivity is restored.
5. THE Serial_Bridge SHALL log each successfully forwarded reading with its timestamp and node identifier so that operators can verify data flow.
6. WHEN the Serial_Bridge starts, THE Serial_Bridge SHALL validate that the configured serial port exists and that the API endpoint is reachable before entering the main read loop, and SHALL exit with a descriptive error message if either check fails.

---

### Requirement 4: Database Schema Extension for NPK Data

**User Story:** As a developer, I want the database schema to store NPK nutrient values alongside the existing sensor fields, so that all Arduino sensor data is persisted in a single Sensor_Record.

#### Acceptance Criteria

1. THE Data_Store SHALL store nitrogen, phosphorus, and potassium values as nullable floating-point fields on the SensorReading model so that nodes without NPK sensors remain compatible.
2. WHEN a Sensor_Record is written with NPK values, THE Data_Store SHALL persist nitrogen in the range [0, 1999] mg/kg, phosphorus in the range [0, 1999] mg/kg, and potassium in the range [0, 1999] mg/kg.
3. THE API_Layer SHALL accept nitrogen, phosphorus, and potassium as optional fields in the `POST /api/ingest` payload and persist them when present.
4. IF nitrogen, phosphorus, or potassium values are present in the ingest payload and fall outside [0, 1999] mg/kg, THEN THE API_Layer SHALL return a 400 response with a field-level validation error for each out-of-range field.
5. THE Data_Store SHALL index the SensorReading table on (nodeId, timestamp) so that time-range queries for the AllSensors_Chart remain performant as the record count grows beyond 100,000 rows.

---

### Requirement 5: Data Volume — 100,000 Record Generation

**User Story:** As a student, I want to accumulate at least 100,000 sensor records in the database, so that I can satisfy the assignment requirement for a sufficiently large dataset.

#### Acceptance Criteria

1. THE Serial_Bridge SHALL support a configurable transmission interval so that operators can reduce the interval to increase data ingestion rate for bulk record generation.
2. THE Data_Store SHALL contain a minimum of 100,000 Sensor_Records from the Arduino_Node before the assignment submission deadline.
3. THE Serial_Bridge SHALL support a simulation mode in which it generates synthetic sensor readings that vary within realistic ranges, bypassing the physical serial port, so that records can be generated rapidly without requiring continuous physical sensor operation.
4. WHEN simulation mode is active, THE Serial_Bridge SHALL vary synthetic values to reflect realistic environmental changes (e.g., soil moisture decreasing over time, temperature following a diurnal pattern) so that the generated dataset is suitable for time-series visualization.
5. THE Serial_Bridge SHALL log the cumulative record count forwarded in the current session so that operators can monitor progress toward the 100,000-record target.

---

### Requirement 6: Multi-Line Time-Series Chart

**User Story:** As a farmer, I want to view all four Arduino sensor streams on a single synchronized multi-line chart, so that I can observe correlations between temperature, humidity, soil moisture, water level, and NPK values over time.

#### Acceptance Criteria

1. THE AllSensors_Chart SHALL render a separate line series for each of the following metrics on a single shared time axis: soil moisture (%), temperature (°C), humidity (%), reservoir level (cm), nitrogen (mg/kg), phosphorus (mg/kg), and potassium (mg/kg).
2. THE AllSensors_Chart SHALL assign a distinct color to each sensor series and display a legend mapping each color to its sensor name and unit.
3. WHEN a farmer selects a time range, THE AllSensors_Chart SHALL update all series simultaneously so that all sensor lines remain synchronized to the same time window.
4. THE AllSensors_Chart SHALL display a tooltip on hover that shows the timestamp and the value with unit for every visible series at that point in time.
5. WHEN no data exists for a selected time range, THE AllSensors_Chart SHALL display a message indicating no data is available for that period.
6. THE AllSensors_Chart SHALL allow a farmer to toggle individual sensor series on and off via the legend so that the chart remains readable when all seven series are displayed.
7. THE Dashboard SHALL display the AllSensors_Chart on the node detail page for any node that has Arduino sensor data.

---

### Requirement 7: Dashboard Display of NPK Sensor Data

**User Story:** As a farmer, I want to see nitrogen, phosphorus, and potassium readings on the dashboard sensor cards and node detail pages, so that I can monitor soil nutrient levels alongside other environmental metrics.

#### Acceptance Criteria

1. THE Dashboard SHALL display nitrogen, phosphorus, and potassium values with their units (mg/kg) on the sensor card for any node that reports NPK data.
2. WHEN a node has not reported NPK data, THE Dashboard SHALL display a dash (—) for nitrogen, phosphorus, and potassium fields rather than an error.
3. THE Alert_System SHALL evaluate nitrogen, phosphorus, and potassium readings against configurable thresholds and create alert records when a value breaches its configured range.
4. THE Dashboard SHALL allow a farmer to configure minimum and maximum threshold values for nitrogen, phosphorus, and potassium per node or globally.

---

### Requirement 8: Sensor Identification and Traceability

**User Story:** As a developer, I want each sensor reading to carry a unique node identifier and a precise timestamp, so that data from multiple nodes can be distinguished and correlated in the database.

#### Acceptance Criteria

1. THE Arduino_Node SHALL embed a unique, human-readable node identifier string in every serial transmission so that the Serial_Bridge can route readings to the correct node record in the Data_Store.
2. THE Serial_Bridge SHALL attach an ISO 8601 UTC timestamp to each forwarded payload at the moment the serial line is received, not at the moment of HTTP transmission, so that network latency does not distort the recorded measurement time.
3. THE Data_Store SHALL store the timestamp with millisecond precision for each Sensor_Record so that high-frequency readings can be distinguished.
4. FOR ALL Sensor_Records written by the Serial_Bridge, the nodeId field SHALL match a registered SensorNode slug in the Data_Store so that orphaned records are not created.

---

### Requirement 9: Serial Bridge Configuration and Operability

**User Story:** As a developer, I want the Serial_Bridge to be configurable via a single file or environment variables, so that it can be adapted to different hardware setups without code changes.

#### Acceptance Criteria

1. THE Serial_Bridge SHALL read its configuration (serial port path, baud rate, API endpoint URL, API key, node identifier, transmission interval, simulation mode flag, and Calibration_Config values) from a single configuration file or environment variables.
2. WHEN the Serial_Bridge configuration file is absent or contains invalid values, THE Serial_Bridge SHALL exit with a descriptive error message identifying each missing or invalid field.
3. THE Serial_Bridge SHALL provide a README or inline documentation that describes each configuration parameter, its valid range, and an example value.
4. THE Serial_Bridge SHALL be executable as a standalone script on Windows, macOS, and Linux without requiring modification to the source code.

---

### Requirement 10: Data Serialization Round-Trip for Extended Schema

**User Story:** As a developer, I want NPK values to serialize and deserialize correctly through the full stack, so that no nutrient data is lost or corrupted between the Serial_Bridge, API, and database.

#### Acceptance Criteria

1. THE API_Layer SHALL accept nitrogen, phosphorus, and potassium as numeric fields in the ingest JSON payload and persist them to the Data_Store without loss of precision beyond PostgreSQL's `double precision` type.
2. FOR ALL valid Sensor_Records containing nitrogen, phosphorus, and potassium values, serializing the record to JSON and deserializing it SHALL produce an object equivalent to the original (round-trip property).
3. WHEN a Sensor_Record is retrieved from the Data_Store via `GET /api/nodes/[id]/readings`, THE API_Layer SHALL include nitrogen, phosphorus, and potassium fields in the response JSON with the same values as stored.
4. THE API_Layer SHALL serialize null NPK fields as `null` in the JSON response rather than omitting the fields, so that clients can distinguish between a node that does not report NPK data and a node that reported zero values.
