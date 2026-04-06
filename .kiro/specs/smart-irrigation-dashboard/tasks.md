# Implementation Plan: AquaSense — Smart Irrigation & Soil Monitoring System

## Overview

Incremental implementation of the AquaSense Next.js dashboard, starting from project scaffolding and Prisma schema, through API routes, frontend components, and finishing with full integration and wiring. Each task builds on the previous and references specific requirements for traceability.

## Tasks

- [x] 1. Project scaffolding and Prisma schema
  - Initialise a Next.js 14 (App Router) project with TypeScript and Tailwind CSS
  - Install dependencies: `prisma`, `@prisma/client`, `recharts`, `fast-check`, `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `next-test-api-route-handler`
  - Create `prisma/schema.prisma` with all models: `SensorNode`, `SensorReading`, `PumpEvent`, `Alert`, `Threshold`, `WeatherCache`, `MLPrediction`
  - Run `prisma migrate dev --name init` to generate the initial migration
  - Configure Jest (`jest.config.ts`) and `tsconfig.json` paths
  - _Requirements: 8.1, 9.1_

- [ ] 2. Sensor reading ingestion API (`/api/ingest`)
  - [x] 2.1 Implement ingestion validation and persistence
    - Create `lib/validation.ts` with `validateSensorPayload(payload)` — checks required fields and sensor value ranges from the spec table
    - Create `app/api/ingest/route.ts` POST handler: validate API key from `X-API-Key` header against `SensorNode.apiKeyHash`, validate payload, persist `SensorReading`, return 201/400/401/500
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 2.2 Write property test for ingestion validation (P18)
    - **Property 18: Ingestion Validation Rejects Invalid Payloads**
    - **Validates: Requirements 8.3**
    - File: `__tests__/api/ingest.test.ts`

  - [ ]* 2.3 Write property test for API key authentication (P19)
    - **Property 19: API Key Authentication**
    - **Validates: Requirements 8.4, 8.5**
    - File: `__tests__/api/ingest.test.ts`

  - [ ]* 2.4 Write property test for ingestion round-trip (P17)
    - **Property 17: Sensor Reading Ingestion Round-Trip**
    - **Validates: Requirements 8.2, 9.3, 9.4**
    - File: `__tests__/api/ingest.test.ts`

- [ ] 3. Core library functions — nodes, readings, aggregation
  - [x] 3.1 Implement `lib/nodes.ts`
    - `isNodeOffline(lastTimestamp: Date, now: Date): boolean` — returns true iff gap > 5 minutes
    - `getActiveNodes()` and `getNodeById(id)` Prisma queries
    - `registerNode(payload)` — creates `SensorNode` record, returns created node
    - `updateNode(id, patch)` — updates name/zone/status
    - `decommissionNode(id)` — sets `isActive: false`
    - _Requirements: 1.3, 6.1, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 3.2 Write property test for node offline detection (P1)
    - **Property 1: Node Offline Detection**
    - **Validates: Requirements 1.3**
    - File: `__tests__/lib/nodes.test.ts`

  - [ ]* 3.3 Write property test for node registration round-trip (P10)
    - **Property 10: Node Registration and Update Round-Trip**
    - **Validates: Requirements 6.3, 6.5**
    - File: `__tests__/lib/nodes.test.ts`

  - [ ]* 3.4 Write property test for decommissioned node exclusion (P11)
    - **Property 11: Decommissioned Node Exclusion**
    - **Validates: Requirements 6.6**
    - File: `__tests__/lib/nodes.test.ts`

  - [x] 3.5 Implement `lib/readings.ts`
    - `filterReadingsByRange(readings, start, end)` — returns readings with timestamps in `[start, end]`
    - `getLatestReading(nodeId)` Prisma query
    - `getHistoricalReadings(nodeId, start, end)` — applies aggregation granularity
    - _Requirements: 1.1, 1.5, 2.1, 2.2, 2.4_

  - [ ]* 3.6 Write property test for time range filtering (P2)
    - **Property 2: Time Range Filtering Correctness**
    - **Validates: Requirements 2.2**
    - File: `__tests__/lib/readings.test.ts`

  - [x] 3.7 Implement `lib/aggregation.ts`
    - `selectGranularity(durationMs: number): "hour" | "minute"` — returns `"hour"` if duration > 48 h, else `"minute"`
    - `aggregateReadings(nodeId, start, end)` — uses `date_trunc` GROUP BY via Prisma `$queryRaw`
    - _Requirements: 2.3_

  - [ ]* 3.8 Write property test for aggregation granularity selection (P3)
    - **Property 3: Aggregation Granularity Selection**
    - **Validates: Requirements 2.3**
    - File: `__tests__/lib/aggregation.test.ts`

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Pump control library and API
  - [x] 5.1 Implement `lib/pump.ts`
    - `evaluateAutoPump(moistureReadings: number[], rainForecast: boolean, threshold: number): boolean` — returns true iff all readings < threshold AND no rain forecast
    - `getPumpState()` Prisma query for latest `PumpEvent`
    - `recordPumpEvent(payload)` — persists `PumpEvent`
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [ ]* 5.2 Write property test for auto-pump decision logic (P4)
    - **Property 4: Auto-Pump Decision Logic**
    - **Validates: Requirements 3.4, 3.5**
    - File: `__tests__/lib/pump.test.ts`

  - [x] 5.3 Implement pump API routes
    - `app/api/pump/route.ts` GET (current state) and POST (manual on/off command, records event, returns 200 or 502 on ESP32 failure)
    - `app/api/pump/auto/route.ts` PATCH (toggle automated logic flag, persisted in a config table or env-backed store)
    - _Requirements: 3.1, 3.2, 3.6, 3.7_

- [ ] 6. Alerts library and API
  - [x] 6.1 Implement `lib/alerts.ts`
    - `evaluateThresholds(reading, thresholds): Alert[]` — returns alert objects for each metric outside `[minValue, maxValue]`; falls back to global threshold when no node-specific one exists
    - `acknowledgeAlert(id)` — sets `acknowledged: true` and `acknowledgedAt`
    - `getAlertHistory(filters)` Prisma query
    - _Requirements: 7.1, 7.2, 7.4_

  - [ ]* 6.2 Write property test for threshold breach detection (P12)
    - **Property 12: Threshold Breach Detection**
    - **Validates: Requirements 7.1, 7.2**
    - File: `__tests__/lib/alerts.test.ts`

  - [ ]* 6.3 Write property test for alert acknowledgement state transition (P14)
    - **Property 14: Alert Acknowledgement State Transition**
    - **Validates: Requirements 7.4**
    - File: `__tests__/lib/alerts.test.ts`

  - [x] 6.4 Implement `lib/thresholds.ts`
    - `validateThreshold(metric, minValue, maxValue)` — rejects values outside sensor range table; rejects minValue ≥ maxValue
    - `saveThreshold(payload)` and `getThresholds(nodeId?)` Prisma queries
    - _Requirements: 7.5, 7.7_

  - [ ]* 6.5 Write property test for threshold configuration round-trip (P15)
    - **Property 15: Threshold Configuration Round-Trip**
    - **Validates: Requirements 7.5**
    - File: `__tests__/lib/thresholds.test.ts`

  - [ ]* 6.6 Write property test for threshold validation rejects out-of-range values (P16)
    - **Property 16: Threshold Validation Rejects Out-of-Range Values**
    - **Validates: Requirements 7.7**
    - File: `__tests__/lib/thresholds.test.ts`

  - [x] 6.7 Implement alerts API routes
    - `app/api/alerts/route.ts` GET (alert history with pagination)
    - `app/api/alerts/[id]/ack/route.ts` POST (acknowledge)
    - `app/api/alerts/thresholds/route.ts` GET + PUT (read/write thresholds with validation)
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.7_

- [ ] 7. Weather and ML prediction libraries and APIs
  - [x] 7.1 Implement `lib/weather.ts`
    - `isWeatherStale(fetchedAt: Date, now: Date): boolean` — returns true iff gap > 30 minutes
    - `fetchAndCacheWeather()` — calls OpenWeatherMap, persists to `WeatherCache`; on failure returns latest cached row with `isStale: true`; returns 503 if no cache exists
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 7.2 Write property test for weather cache staleness check (P7)
    - **Property 7: Weather Cache Staleness Check**
    - **Validates: Requirements 4.3**
    - File: `__tests__/lib/weather.test.ts`

  - [x] 7.3 Implement `app/api/weather/route.ts` GET
    - Returns current weather + 24h forecast; enforces 30-minute cache; includes `isStale` and `fetchedAt` in response
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.4 Implement `lib/predictions.ts`
    - `savePrediction(payload)` and `getLatestPrediction(horizon)` Prisma queries
    - `fetchAndCachePredictions()` — calls ML service, persists to `MLPrediction`; on failure returns latest with `isStale: true`; returns 503 if no cache
    - _Requirements: 5.2, 5.5, 5.6_

  - [ ]* 7.5 Write property test for ML prediction persistence round-trip (P9)
    - **Property 9: ML Prediction Persistence Round-Trip**
    - **Validates: Requirements 5.6**
    - File: `__tests__/lib/predictions.test.ts`

  - [x] 7.6 Implement `app/api/predictions/route.ts` GET
    - Returns latest 24h and 7d predictions with confidence scores, input features, and `isStale` flag
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

- [x] 8. Node management API routes
  - Implement `app/api/nodes/route.ts` GET (list active nodes) and POST (register node — accepts slug, name, zone, location, sensor config, generates and stores hashed API key)
  - Implement `app/api/nodes/[id]/route.ts` PATCH (update name/zone/status, decommission)
  - Implement `app/api/nodes/[id]/readings/route.ts` GET (historical readings with time range and aggregation)
  - Implement `app/api/nodes/[id]/latest/route.ts` GET (latest reading)
  - _Requirements: 1.5, 6.1, 6.3, 6.4, 6.5, 6.6_

- [x] 9. SSE stream endpoint
  - Implement `app/api/stream/route.ts` — streams `reading`, `alert`, `pump_state`, and `prediction` events by polling DB for records newer than the last event ID
  - On DB query failure, send `event: error` frame and close connection
  - _Requirements: 1.1, 1.2_

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Core frontend components — live sensor data
  - [x] 11.1 Implement `SensorCard.tsx`
    - Displays soil moisture, temperature, humidity, reservoir level, pH, last-seen timestamp, and offline badge when node is offline
    - Consumes SSE stream or falls back to 10-second polling
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 11.2 Write unit tests for `SensorCard`
    - Test offline badge renders when node is stale
    - Test all five metrics render with correct values
    - File: `__tests__/components/SensorCard.test.tsx`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 11.3 Implement `NodeStatusGrid.tsx`
    - Renders a responsive grid of `SensorCard` components for all active nodes
    - Passes node data and offline status down to each card
    - _Requirements: 1.4, 6.1_

- [ ] 12. Historical trends components
  - [x] 12.1 Implement `TimeRangePicker.tsx`
    - Renders 24h / 7d / 30d / custom range selector; emits `onRangeChange(start, end)` callback
    - _Requirements: 2.2_

  - [x] 12.2 Implement `TimeSeriesChart.tsx`
    - Recharts `LineChart` wrapper; accepts `readings` array and `metric` prop; renders "no data" message when array is empty
    - _Requirements: 2.1, 2.4_

  - [ ]* 12.3 Write unit tests for `TimeSeriesChart`
    - Test "no data" message renders on empty array
    - Test chart renders correct number of data points
    - File: `__tests__/components/TimeSeriesChart.test.tsx`
    - _Requirements: 2.1, 2.4_

- [ ] 13. Pump control, weather, and prediction components
  - [x] 13.1 Implement `PumpControlPanel.tsx`
    - Displays current pump state, activation source, elapsed run time, auto-logic toggle, and inline error message on command failure
    - _Requirements: 3.3, 3.6, 3.7_

  - [ ]* 13.2 Write property test for pump panel rendering completeness (P5)
    - **Property 5: Pump Panel Rendering Completeness**
    - **Validates: Requirements 3.3**
    - File: `__tests__/components/PumpControlPanel.test.tsx`

  - [x] 13.3 Implement `WeatherWidget.tsx`
    - Displays temperature, humidity, wind speed, precipitation, 24h rain forecast (probability + amount), last-fetch timestamp, and stale data indicator
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

  - [ ]* 13.4 Write property test for weather widget rendering completeness (P6)
    - **Property 6: Weather Widget Rendering Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.5**
    - File: `__tests__/components/WeatherWidget.test.tsx`

  - [x] 13.5 Implement `PredictionPanel.tsx`
    - Displays 24h and 7d irrigation peak predictions, confidence scores, input features, and staleness indicator
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

  - [ ]* 13.6 Write property test for prediction panel rendering completeness (P8)
    - **Property 8: Prediction Panel Rendering Completeness**
    - **Validates: Requirements 5.1, 5.3, 5.4**
    - File: `__tests__/components/PredictionPanel.test.tsx`

- [ ] 14. Alert components
  - [x] 14.1 Implement `AlertBanner.tsx`
    - Displays active (unacknowledged) alerts; triggers browser push notification for critical breaches when permission granted
    - _Requirements: 7.2, 7.6_

  - [x] 14.2 Implement `AlertHistoryTable.tsx`
    - Paginated table showing alert type, node, breach value, threshold value, timestamp, and acknowledge button
    - _Requirements: 7.3, 7.4_

  - [ ]* 14.3 Write property test for alert history rendering completeness (P13)
    - **Property 13: Alert History Rendering Completeness**
    - **Validates: Requirements 7.3**
    - File: `__tests__/components/AlertHistoryTable.test.tsx`

- [ ] 15. Page layouts and routing
  - [x] 15.1 Implement `app/dashboard/page.tsx`
    - Composes `NodeStatusGrid`, `PumpControlPanel`, `WeatherWidget`, `PredictionPanel`, `AlertBanner`, and `AlertHistoryTable`
    - Fetches initial data server-side; hands off to SSE/polling for live updates
    - _Requirements: 1.1, 1.5, 3.3, 4.1, 5.1_

  - [x] 15.2 Implement `app/nodes/[id]/page.tsx`
    - Per-node detail view with `TimeRangePicker` and five `TimeSeriesChart` instances (one per metric)
    - _Requirements: 2.1, 2.2, 6.2_

  - [x] 15.3 Implement `app/settings/page.tsx`
    - Threshold configuration form (per-node and global) with validation error display; node management table (register, rename, decommission)
    - _Requirements: 6.3, 6.5, 6.6, 7.5, 7.7_

- [x] 16. Ingestion trigger — alert evaluation and ML prediction refresh
  - Extend `app/api/ingest/route.ts` to call `evaluateThresholds` after persisting a reading and create `Alert` records + SSE push for any breaches
  - After persisting, call `fetchAndCachePredictions()` asynchronously (fire-and-forget with error logging) to keep predictions fresh within 60 seconds
  - _Requirements: 5.2, 7.1, 7.2_

- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations per run and must include the comment tag `// Feature: smart-irrigation-dashboard, Property <N>: <title>`
- Unit tests use Jest + React Testing Library
- Checkpoints at tasks 4, 10, and 17 ensure incremental validation before moving to the next phase
