/**
 * Generates realistic mock sensor readings for UI development / testing.
 * Simulates a full 24-hour IoT cycle:
 *   - Temperature follows a sinusoidal daily curve (cool night → warm afternoon)
 *   - Humidity is inversely correlated with temperature
 *   - Soil moisture dries slowly, then spikes up when the irrigation pump fires
 *   - Reservoir level drops during irrigation events, then is manually refilled
 *   - pH stays near neutral with small drift
 *
 * Remove this file once real DB data is flowing.
 */

export interface MockReading {
  timestamp: string
  soilMoisture: number
  temperature: number
  humidity: number
  reservoirLevel: number
  ph: number
  nitrogen: number
  phosphorus: number
  potassium: number
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

/** Simple seeded pseudo-random so values look consistent on reloads */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function generateMockReadings(
  hoursBack = 24,
  intervalMinutes = 2,
): MockReading[] {
  const rand = seededRandom(42)
  const noise = (amplitude: number) => (rand() - 0.5) * 2 * amplitude

  const totalPoints = Math.floor((hoursBack * 60) / intervalMinutes)
  const now = Date.now()
  const startMs = now - hoursBack * 60 * 60 * 1000

  // Initial state
  let soilMoisture = 68
  let reservoirLevel = 38
  let nitrogen = 210
  let phosphorus = 95
  let potassium = 340

  const readings: MockReading[] = []

  // Irrigation events: soil moisture spikes, reservoir drops
  // Place 3 irrigation pulses across the 24h window
  const irrigationAt = new Set([
    Math.floor(totalPoints * 0.18),
    Math.floor(totalPoints * 0.51),
    Math.floor(totalPoints * 0.82),
  ])
  // Reservoir refill at midpoint
  const refillAt = Math.floor(totalPoints * 0.6)

  for (let i = 0; i < totalPoints; i++) {
    const ts = new Date(startMs + i * intervalMinutes * 60 * 1000)
    // Hour of day 0–24 (fractional)
    const hourOfDay = (ts.getHours() + ts.getMinutes() / 60)

    // ── Temperature: 17 °C at 5 am → 32 °C at 2 pm, sinusoidal ──────────
    const tempBase = 24.5 + 7.5 * Math.sin(((hourOfDay - 5) / 24) * 2 * Math.PI - Math.PI / 2)
    const temperature = clamp(tempBase + noise(1.2), 12, 40)

    // ── Humidity: inversely correlated with temp ──────────────────────────
    const humBase = 82 - (temperature - 17) * 1.4
    const humidity = clamp(humBase + noise(3), 28, 98)

    // ── Soil moisture: slow evaporation + irrigation pulses ──────────────
    soilMoisture -= 0.05 + (temperature - 20) * 0.003  // evaporation
    if (irrigationAt.has(i)) soilMoisture += 18 + rand() * 6  // irrigation burst
    soilMoisture = clamp(soilMoisture + noise(0.4), 18, 95)

    // ── Reservoir level: drops slowly, big drop on irrigation, refill ────
    if (irrigationAt.has(i)) reservoirLevel -= 4 + rand() * 2
    if (i === refillAt) reservoirLevel = 36 + rand() * 4  // manual refill
    reservoirLevel = clamp(reservoirLevel - 0.02 + noise(0.15), 2, 50)

    // ── pH: slow drift around 6.6 ────────────────────────────────────────
    const ph = clamp(6.6 + noise(0.35) + Math.sin(i / 60) * 0.15, 5.2, 8.0)

    // ── NPK: slow depletion + uptake noise ───────────────────────────────
    nitrogen   = clamp(nitrogen   - 0.04 + noise(1.8), 30,  600)
    phosphorus = clamp(phosphorus - 0.02 + noise(1.2), 15,  400)
    potassium  = clamp(potassium  - 0.03 + noise(2.0), 60,  800)

    readings.push({
      timestamp:     ts.toISOString(),
      soilMoisture:  Math.round(soilMoisture  * 10) / 10,
      temperature:   Math.round(temperature   * 10) / 10,
      humidity:      Math.round(humidity      * 10) / 10,
      reservoirLevel: Math.round(reservoirLevel * 10) / 10,
      ph:            Math.round(ph            * 100) / 100,
      nitrogen:      Math.round(nitrogen),
      phosphorus:    Math.round(phosphorus),
      potassium:     Math.round(potassium),
    })
  }

  return readings
}
