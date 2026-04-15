/**
 * seed_historical.js
 * Inserts 100,000 realistic historical sensor readings from
 * 11 Apr 2024 → 14 Apr 2026, matching the actual sensor hardware
 * characteristics observed on node-1.
 *
 * Usage: node prisma/seed_historical.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── Config ──────────────────────────────────────────────────────────────────

const NODE_ID   = 'cmmx6howt0000bi1zgfsisou2'
const START_MS  = new Date('2024-04-11T06:00:00Z').getTime()
const END_MS    = new Date('2026-04-14T17:00:00Z').getTime()
const TARGET    = 100_000
const BATCH     = 500          // inserts per Prisma batch

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

/** Seeded deterministic pseudo-random (mulberry32) */
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s += 0x6D2B79F5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Smooth noise: weighted average of several sine waves */
function smoothNoise(rng, t, period, amplitude) {
  return amplitude * (
    0.5  * Math.sin(2 * Math.PI * t / period + rng() * 2 * Math.PI) +
    0.3  * Math.sin(2 * Math.PI * t / (period * 0.5) + rng() * 2 * Math.PI) +
    0.2  * Math.sin(2 * Math.PI * t / (period * 2)   + rng() * 2 * Math.PI)
  )
}

/** Linear interpolation */
function lerp(a, b, t) { return a + (b - a) * t }

// ─── Sensor model ─────────────────────────────────────────────────────────────

const YEAR_S  = 365.25 * 24 * 3600   // seconds in a year
const DAY_S   = 24 * 3600

/**
 * Generate one realistic sensor reading for elapsed seconds `t`
 * from START (seconds), using deterministic noise seeded by `t`.
 */
function generateReading(tSec) {
  const rng = makeRng(Math.floor(tSec / 600))  // changes every 10 min

  // ── Season factor: 0 = dry season, 1 = rainy season ──────────────────────
  // Rwanda has two rainy seasons: Feb–May and Sep–Nov
  const dayOfYear = (tSec % YEAR_S) / DAY_S   // 0–365
  const season1 = Math.sin(2 * Math.PI * (dayOfYear - 40)  / 365) // peaks ~May
  const season2 = Math.sin(2 * Math.PI * (dayOfYear - 270) / 365) // peaks ~Oct
  const rainFactor = clamp((season1 + season2) * 0.5, -1, 1)      // -1 dry, +1 wet

  // ── Diurnal factor: time of day 0–1 ──────────────────────────────────────
  const tod = (tSec % DAY_S) / DAY_S   // 0 = midnight, 0.5 = noon

  // ── Temperature ──────────────────────────────────────────────────────────
  // Base: 26 °C (matching real readings ~26.4°C)
  // Diurnal: ±2.5°C (cooler at night, warmer midday)
  // Seasonal: ±1.5°C (cooler in rainy season)
  const tempDiurnal  = 2.5  * Math.sin(2 * Math.PI * (tod - 0.25))   // peak at noon
  const tempSeasonal = -1.5 * rainFactor
  const tempNoise    = 0.3  * (rng() - 0.5)
  const temperature  = clamp(26.0 + tempDiurnal + tempSeasonal + tempNoise, 22, 32)

  // ── Humidity ─────────────────────────────────────────────────────────────
  // Base: 78% (matching real readings 78–79%)
  // Diurnal: inverse of temperature (higher at night)
  // Seasonal: higher in rainy season
  const humDiurnal  = -8  * Math.sin(2 * Math.PI * (tod - 0.25))
  const humSeasonal =  8  * rainFactor
  const humNoise    =  2  * (rng() - 0.5)
  const humidity    = clamp(78 + humDiurnal + humSeasonal + humNoise, 55, 95)

  // ── Soil Moisture ─────────────────────────────────────────────────────────
  // Follows irrigation cycles: 6-hour irrigation period moves it ~60-90%,
  // then slow drying over 12–18 hours back toward 20–35%.
  // Rainy season: cycles faster, stays wetter.
  const cycleLen    = DAY_S * (rainFactor > 0 ? 0.6 : 1.2)   // shorter in rainy
  const cyclePos    = (tSec % cycleLen) / cycleLen            // 0→1
  const dryFloor    = rainFactor > 0 ? 35 : 20
  const wetCeil     = rainFactor > 0 ? 92 : 85
  let   soilBase
  if (cyclePos < 0.25) {
    // Irrigation phase: rapid rise
    soilBase = lerp(dryFloor, wetCeil, cyclePos / 0.25)
  } else {
    // Drying phase: slow decline
    soilBase = lerp(wetCeil, dryFloor, (cyclePos - 0.25) / 0.75)
  }
  const soilNoise    = 3 * (rng() - 0.5)
  const soilMoisture = clamp(soilBase + soilNoise, 0, 100)

  // ── Reservoir Level ───────────────────────────────────────────────────────
  // Slow depletion when pump is active (soil dry & tank has water),
  // periodic manual refills every 3–5 days, rainy season gets natural top-ups.
  const refillCycle = DAY_S * (3 + (rng() % 2))   // 3–4 day refill period
  const refillPos   = (tSec % refillCycle) / refillCycle
  let   resBase
  if (refillPos < 0.08) {
    // Refill event: rapid rise to 80–95%
    resBase = lerp(15, 85 + 10 * rng(), refillPos / 0.08)
  } else {
    // Gradual depletion
    const depletionRate = rainFactor > 0 ? 0.4 : 0.7   // slower in rainy season
    resBase = lerp(85, 15, Math.pow((refillPos - 0.08) / 0.92, depletionRate))
  }
  const resNoise       = 4 * (rng() - 0.5)
  const reservoirLevel = clamp(resBase + resNoise, 0, 100)

  // ── Pump logic ────────────────────────────────────────────────────────────
  const pumpOn = soilMoisture < 45 && reservoirLevel > 10

  // ── NPK ───────────────────────────────────────────────────────────────────
  // Three overlapping cycles to produce visible variation at every time scale:
  //   Seasonal (yearly)  — baseline shifts with growing seasons
  //   Weekly             — fertiliser application every ~7 days causes a spike
  //   Daily              — plant uptake removes nutrients through the day,
  //                        irrigation flushes them back at night
  const weekOfYear   = (tSec % (YEAR_S)) / (7 * DAY_S)
  const fertSpike    = Math.max(0, Math.sin(2 * Math.PI * weekOfYear)) * 0.4  // 0–0.4 weekly spike

  const dayPhase     = (tSec % DAY_S) / DAY_S   // 0 = midnight
  const dailyUptake  = -12 * Math.sin(2 * Math.PI * dayPhase)  // depletes midday, recovers at night

  const nSeasonal = 17 + 8  * Math.sin(2 * Math.PI * dayOfYear / 365)
  const pSeasonal = 24 + 10 * Math.sin(2 * Math.PI * dayOfYear / 365)
  const kSeasonal = 48 + 20 * Math.sin(2 * Math.PI * dayOfYear / 365)

  const nBase = nSeasonal + fertSpike * 25 + dailyUptake * 0.6 + 3 * (rng() - 0.5)
  const pBase = pSeasonal + fertSpike * 18 + dailyUptake * 0.4 + 4 * (rng() - 0.5)
  const kBase = kSeasonal + fertSpike * 40 + dailyUptake * 1.0 + 6 * (rng() - 0.5)

  const nitrogen   = clamp(Math.round(nBase  * 10) / 10, 0, 200)
  const phosphorus = clamp(Math.round(pBase  * 10) / 10, 0, 200)
  const potassium  = clamp(Math.round(kBase  * 10) / 10, 0, 500)

  return {
    nodeId:         NODE_ID,
    timestamp:      new Date(START_MS + tSec * 1000),
    soilMoisture:   Math.round(soilMoisture  * 100) / 100,
    temperature:    Math.round(temperature   * 100) / 100,
    humidity:       Math.round(humidity      * 100) / 100,
    reservoirLevel: Math.round(reservoirLevel * 100) / 100,
    ph:             7.0,
    nitrogen,
    phosphorus,
    potassium,
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const totalDuration = (END_MS - START_MS) / 1000   // seconds
  const interval      = totalDuration / TARGET        // seconds between readings

  console.log(`Seeding ${TARGET.toLocaleString()} readings`)
  console.log(`Period : 2024-04-11 → 2026-04-14  (${(totalDuration / DAY_S).toFixed(0)} days)`)
  console.log(`Interval: every ${Math.round(interval / 60)} minutes`)
  console.log(`Batch size: ${BATCH}`)
  console.log('─'.repeat(50))

  let inserted = 0
  let batch    = []

  for (let i = 0; i < TARGET; i++) {
    const tSec = i * interval
    batch.push(generateReading(tSec))

    if (batch.length === BATCH || i === TARGET - 1) {
      await prisma.sensorReading.createMany({ data: batch })
      inserted += batch.length
      batch = []

      // Progress every 10%
      if (inserted % (TARGET / 10) < BATCH) {
        const pct = ((inserted / TARGET) * 100).toFixed(0)
        process.stdout.write(`\r  ${pct}% — ${inserted.toLocaleString()} / ${TARGET.toLocaleString()} inserted`)
      }
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  const total = await prisma.sensorReading.count()
  console.log(`Done. Total records in DB: ${total.toLocaleString()}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
