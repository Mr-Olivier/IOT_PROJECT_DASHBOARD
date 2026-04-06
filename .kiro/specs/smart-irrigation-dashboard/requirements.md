# Requirements Document

## Introduction

AquaSense — Smart Irrigation & Soil Monitoring System is a web-based dashboard for monitoring and controlling a smart irrigation setup. The system aggregates real-time and historical data from an ESP32-based sensor node, integrates external weather forecasts, and exposes ML-driven irrigation peak predictions. Farmers can monitor all sensor readings remotely, receive threshold alerts, and control the Smart Pump manually or let the automated logic handle it.

Built with Next.js, Tailwind CSS, Prisma ORM, and PostgreSQL.

### Hardware Stack

The physical layer consists of the following components connected on a breadboard:

- **ESP32 microcontroller** — reads all sensors and sends data to the Next.js API via HTTP POST
- **Soil moisture sensor** — measures volumetric water content in the soil
- **DHT-11** — measures ambient temperature and humidity
- **Ultrasonic sensor (HC-SR04)** — measures water reservoir level by distance
- **pH sensor** — measures soil or water pH level
- **Motor driver** — controls the 5V water pump
- **5V water pump** — the irrigation actuator

The ESP32 sends sensor readings to the Next.js API via HTTP POST. The web app connects to the IoT project through this API.

---

## Glossary

- **Dashboard**: The Next.js web application that farmers use to monitor and control the irrigation network.
- **WSN**: Wireless Sensor Network — the collection of sensor nodes deployed across the field.
- **Sensor_Node**: The ESP32-based physical node that reads and reports soil moisture (soil moisture sensor), temperature and humidity (DHT-11), water reservoir level (HC-SR04 ultrasonic sensor), and pH level (pH sensor).
- **Smart_Pump**: The irrigation actuator that can be triggered manually or automatically based on sensor readings and ML predictions.
- **Weather_Service**: The external weather API integration that provides current conditions and rain forecasts.
- **ML_Service**: The machine learning component (Random Forest or LSTM) that predicts irrigation peaks from historical sensor data.
- **Alert_System**: The subsystem responsible for detecting threshold breaches and delivering notifications to farmers.
- **API_Layer**: The Next.js API routes that mediate between the frontend, database, Weather_Service, and ML_Service.
- **Data_Store**: The PostgreSQL database accessed via Prisma ORM that persists all sensor readings, pump events, and alert history.

---

## Requirements

### Requirement 1: Live Sensor Data Display

**User Story:** As a farmer, I want to see real-time readings from all sensor nodes, so that I can understand the current state of my field at a glance.

#### Acceptance Criteria

1. WHEN a Sensor_Node publishes a new reading, THE Dashboard SHALL display the updated soil moisture, temperature, humidity, water reservoir level, and pH level within 10 seconds.
2. THE Dashboard SHALL display the last-known reading timestamp for each Sensor_Node.
3. WHEN a Sensor_Node has not reported data for more than 5 minutes, THE Dashboard SHALL visually indicate that the node is offline.
4. THE Dashboard SHALL support displaying data from a minimum of 10 concurrent Sensor_Nodes.
5. WHEN the Dashboard first loads, THE API_Layer SHALL return the latest reading for each active Sensor_Node within 3 seconds.

---

### Requirement 2: Historical Trends Visualization

**User Story:** As a farmer, I want to view historical sensor data over time, so that I can identify patterns and make informed irrigation decisions.

#### Acceptance Criteria

1. THE Dashboard SHALL render time-series charts for soil moisture, temperature, humidity, water reservoir level, and pH level for any selected Sensor_Node.
2. WHEN a farmer selects a time range (last 24 hours, 7 days, 30 days, or custom), THE Dashboard SHALL update all charts to reflect only data within that range.
3. THE API_Layer SHALL return historical readings aggregated by hour for ranges exceeding 48 hours, and by minute for ranges of 48 hours or less.
4. WHEN no historical data exists for a selected range, THE Dashboard SHALL display a message indicating no data is available for that period.
5. THE Data_Store SHALL retain sensor readings for a minimum of 12 months before archival.

---

### Requirement 3: Smart Pump Control

**User Story:** As a farmer, I want to manually trigger or stop the Smart Pump and view its automated control logic, so that I have full control over irrigation while benefiting from automation.

#### Acceptance Criteria

1. WHEN a farmer submits a manual pump activation request, THE API_Layer SHALL send the activation command to the Smart_Pump and record the event in the Data_Store within 2 seconds.
2. WHEN a farmer submits a manual pump deactivation request, THE API_Layer SHALL send the deactivation command to the Smart_Pump and record the event in the Data_Store within 2 seconds.
3. WHILE the Smart_Pump is active, THE Dashboard SHALL display the current pump state, the activation source (manual or automated), and the elapsed run time.
4. WHEN soil moisture across all active Sensor_Nodes falls below the configured threshold AND the Weather_Service forecasts no rain within 24 hours, THE Smart_Pump SHALL activate automatically.
5. WHEN the Weather_Service forecasts rain within 24 hours, THE Smart_Pump SHALL remain inactive regardless of soil moisture readings.
6. THE Dashboard SHALL display the automated pump control logic status (enabled or disabled) and allow a farmer to toggle it.
7. IF the Smart_Pump activation command fails, THEN THE API_Layer SHALL return an error response and THE Dashboard SHALL display a descriptive error message to the farmer.

---

### Requirement 4: Weather API Integration Display

**User Story:** As a farmer, I want to see current weather conditions and rain forecasts on the dashboard, so that I can understand how weather affects irrigation decisions.

#### Acceptance Criteria

1. THE Dashboard SHALL display current temperature, humidity, wind speed, and precipitation from the Weather_Service for the field location.
2. THE Dashboard SHALL display a 24-hour rain forecast from the Weather_Service, including predicted precipitation probability and amount.
3. WHEN the Weather_Service data is refreshed, THE API_Layer SHALL update weather data at a maximum interval of 30 minutes.
4. IF the Weather_Service is unavailable, THEN THE API_Layer SHALL serve the most recently cached weather data and THE Dashboard SHALL indicate that weather data may be stale.
5. THE Dashboard SHALL display the timestamp of the last successful Weather_Service data fetch.

---

### Requirement 5: ML Model Predictions Display

**User Story:** As a farmer, I want to see ML-generated irrigation peak forecasts, so that I can plan water usage and anticipate high-demand periods.

#### Acceptance Criteria

1. THE Dashboard SHALL display the ML_Service irrigation peak predictions for the next 24 hours and next 7 days.
2. WHEN new sensor readings are ingested, THE ML_Service SHALL generate updated predictions and THE API_Layer SHALL make them available to the Dashboard within 60 seconds.
3. THE Dashboard SHALL display the confidence score or probability associated with each irrigation peak prediction.
4. THE Dashboard SHALL display the input features used by the ML_Service (soil moisture trend, weather forecast, historical usage) alongside each prediction.
5. IF the ML_Service is unavailable, THEN THE Dashboard SHALL display the most recent available prediction with a staleness indicator.
6. THE Data_Store SHALL persist all ML_Service predictions with their generation timestamp for audit and retraining purposes.

---

### Requirement 6: Multi-Node Sensor Network Support

**User Story:** As a farmer, I want to manage and view data from multiple sensor nodes across my field, so that I can monitor different zones independently.

#### Acceptance Criteria

1. THE Dashboard SHALL display a field map or node list view that shows the status of all registered Sensor_Nodes.
2. WHEN a farmer selects a specific Sensor_Node, THE Dashboard SHALL display that node's live readings and historical charts in isolation.
3. THE API_Layer SHALL support registering a new Sensor_Node by accepting a node identifier, physical location label, and sensor type configuration.
4. WHEN a new Sensor_Node is registered, THE Data_Store SHALL create a corresponding record and THE Dashboard SHALL display the new node within 5 seconds of registration.
5. THE Dashboard SHALL allow a farmer to assign a human-readable name and zone label to each Sensor_Node.
6. WHEN a Sensor_Node is decommissioned, THE API_Layer SHALL mark it as inactive in the Data_Store and THE Dashboard SHALL exclude it from live views while retaining its historical data.

---

### Requirement 7: Alerts and Notifications

**User Story:** As a farmer, I want to receive alerts when sensor readings breach configured thresholds, so that I can respond quickly to critical field conditions.

#### Acceptance Criteria

1. THE Alert_System SHALL evaluate each incoming sensor reading against the configured thresholds for soil moisture, temperature, humidity, water reservoir level, and pH level.
2. WHEN a sensor reading breaches a configured threshold, THE Alert_System SHALL create an alert record in the Data_Store and display the alert on the Dashboard within 15 seconds.
3. THE Dashboard SHALL display an alert history log showing alert type, affected Sensor_Node, breach value, threshold value, and timestamp.
4. WHEN an alert is acknowledged by a farmer, THE Alert_System SHALL mark the alert as 
acknowledged in the Data_Store and update the Dashboard display accordingly.
5. THE Dashboard SHALL allow a farmer to configure threshold values for each sensor metric per Sensor_Node or globally across all nodes.
6. WHERE browser notifications are supported and the farmer has granted permission, THE Alert_System SHALL deliver a browser push notification for critical threshold breaches.
7. IF a threshold configuration update is submitted with an invalid value (out of sensor range), THEN THE API_Layer SHALL reject the update and return a descriptive validation error.

---

### Requirement 8: Data Ingestion API

**User Story:** As a system integrator, I want a well-defined API endpoint for sensor nodes to submit readings, so that the WSN can reliably push data into the platform.

#### Acceptance Criteria

1. THE API_Layer SHALL expose a POST endpoint that accepts a Sensor_Node identifier, timestamp, and a payload containing soil moisture, temperature, humidity, water reservoir level, and pH level.
2. WHEN a valid sensor reading payload is received, THE API_Layer SHALL persist the reading to the Data_Store and return a 201 response within 500ms.
3. IF a sensor reading payload is missing required fields or contains out-of-range values, THEN THE API_Layer SHALL return a 400 response with a field-level validation error message.
4. THE API_Layer SHALL authenticate sensor node submissions using an API key associated with each registered Sensor_Node.
5. IF an unrecognized Sensor_Node identifier is submitted, THEN THE API_Layer SHALL return a 401 response.

---

### Requirement 9: Data Serialization and Persistence (Round-Trip)

**User Story:** As a developer, I want sensor data and configuration to serialize and deserialize correctly, so that no data is lost or corrupted between the WSN, API, and database.

#### Acceptance Criteria

1. THE API_Layer SHALL serialize all sensor reading responses as JSON conforming to a defined schema.
2. THE API_Layer SHALL deserialize incoming JSON sensor payloads into validated internal data structures before persistence.
3. FOR ALL valid sensor reading objects containing soil moisture, temperature, humidity, water reservoir level, and pH level, serializing then deserializing SHALL produce an object equivalent to the original (round-trip property).
4. WHEN a sensor reading is retrieved from the Data_Store, THE API_Layer SHALL return values with the same precision as stored.
