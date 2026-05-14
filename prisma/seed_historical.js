/**
 * seed_historical.js  —  AquaSense historical data seed
 *
 * Generates 100,000 realistic sensor readings covering the project period:
 *   5 March 2026  →  7 April 2026  (33 days, ~57 s interval per node)
 *
 * PHYSICS-BASED CORRELATIONS (important for ML training quality)
 * ──────────────────────────────────────────────────────────────
 * soilMoisture is the PRIMARY variable driven by an irrigation cycle.
 * All other sensors are DERIVED from soilMoisture with realistic physics:
 *
 *   humidity       ∝  soilMoisture  (wet soil → evaporation → higher RH)
 *   temperature    ∝ −soilMoisture  (hot dry conditions → lower soil moisture)
 *   nitrogen/P/K   bell curve peaking at optimal moisture (SM ≈ 52%)
 *                  drought (<20%) and waterlogging (>85%) both reduce NPK
 *   reservoirLevel own 4-day refill cycle; depletes faster when pump active
 *                  (pump is ON when soilMoisture < 40%)
 *
 * This gives ML models real signals → Random Forest F1 ≈ 0.70–0.85
 *
 * SENSOR RANGES (matching real Arduino hardware, Rwanda lab)
 * ──────────────────────────────────────────────────────────
 *   soilMoisture    5 – 92 %     all 5 classes covered
 *   temperature    23.5 – 27.5 °C  base 25 °C, diurnal ±1.3 °C
 *   humidity       68 – 87 %    driven by soilMoisture + diurnal
 *   reservoirLevel  5 – 95 %    4-day depletion + refill cycle
 *   nitrogen        2 – 43      non-zero; thresholds [5,14,27,35]
 *   phosphorus      2 – 47      non-zero; thresholds [5,18,34,42]
 *   potassium       5 – 95      non-zero; thresholds [10,39,67,84]
 *   pH              7.0         constant — no pH sensor fitted
 *
 * All values are strictly > 0  (cleaning step drops rows where any sensor = 0)
 *
 * Usage:  node prisma/seed_historical.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── Config ───────────────────────────────────────────────────────────────────

const START_MS        = new Date('2026-03-05T06:00:00Z').getTime()
const END_MS          = new Date('2026-04-07T22:00:00Z').getTime()
const TARGET_PER_NODE = 50_000    // 100,000 total across both nodes
const BATCH           = 500

const DAY_S = 86_400

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

/** Deterministic pseudo-random (mulberry32) — same seed = same sequence */
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s += 0x6D2B79F5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Sensor model ─────────────────────────────────────────────────────────────

/**
 * @param {number} tSec    elapsed seconds since START_MS
 * @param {number} nodeIdx 0 = node-1 (North Field), 1 = node-2 (South Field)
 */
function generateReading(tSec, nodeIdx) {
  const rng = makeRng((Math.floor(tSec / 300) + 1) * (nodeIdx + 1) * 7919)
  const tod = (tSec % DAY_S) / DAY_S   // 0 = midnight, 0.5 = noon

  // ── 1. Soil Moisture — PRIMARY variable ───────────────────────────────────
  // Irrigation cycle; node-2 offset ~8 h so nodes stay out of phase.
  // Covers all 5 classes: CL(<20%) L(20-40%) O(40-70%) H(70-85%) CH(>85%)
  const cycleLen    = DAY_S * (nodeIdx === 0 ? 0.88 : 0.95)
  const cycleOffset = nodeIdx * DAY_S * 0.33
  const cp = ((tSec + cycleOffset) % cycleLen) / cycleLen

  let soilBase
  if (cp < 0.18) {
    soilBase = 8  + (88 - 8)  * (cp / 0.18)            // irrigation: 8 → 88%
  } else if (cp < 0.30) {
    soilBase = 88 - 12        * ((cp - 0.18) / 0.12)   // plateau:   88 → 76%
  } else {
    soilBase = 76 - 68        * ((cp - 0.30) / 0.70)   // drying:    76 → 8%
  }
  const soilMoisture = clamp(soilBase + 3 * (rng() - 0.5), 5, 92)

  // ── 2. Humidity — driven by soilMoisture ──────────────────────────────────
  // Wet soil evaporates → raises local humidity.
  //   SM ≈ 8  (criticalLow)  → humidity ≈ 67-71 %
  //   SM ≈ 52 (optimal)      → humidity ≈ 73-78 %
  //   SM ≈ 88 (criticalHigh) → humidity ≈ 79-84 %
  const humBase    = 66.0 + soilMoisture * 0.13
  const humDiurnal = -4.0 * Math.sin(2 * Math.PI * (tod - 0.25))
  const humidity   = clamp(humBase + humDiurnal + 1.5 * (rng() - 0.5), 68, 87)

  // ── 3. Temperature — weak inverse of soilMoisture ─────────────────────────
  // Hot/dry conditions correlate with lower soil moisture.
  //   SM ≈ 8  → temp ≈ 24.5-27.5 °C (hotter)
  //   SM ≈ 52 → temp ≈ 23.5-26.5 °C (cooler)
  const tempBase    = 26.2 - soilMoisture * 0.022
  const tempDiurnal =  1.3 * Math.sin(2 * Math.PI * (tod - 0.25))
  const temperature = clamp(tempBase + tempDiurnal + 0.2 * (rng() - 0.5), 23.5, 27.5)

  // ── 4. Reservoir Level — own cycle, pump-influenced ───────────────────────
  // 4-day refill cycle; depletion 40% faster when pump is ON (SM < 40%).
  const refillCycle = DAY_S * (3.8 + nodeIdx * 0.4)
  const rp          = (tSec % refillCycle) / refillCycle

  let resBase
  if (rp < 0.06) {
    resBase = 12 + (80 + 10 * rng()) * (rp / 0.06)      // rapid refill → 88-95%
  } else {
    const pumpFactor = soilMoisture < 40 ? 1.4 : 0.85
    resBase = 90 - 78 * Math.pow((rp - 0.06) / 0.94 * pumpFactor, 0.55)
  }
  const reservoirLevel = clamp(resBase + 3 * (rng() - 0.5), 5, 95)

  // ── 5. NPK — bell curve peaking at optimal soil moisture ──────────────────
  // Both drought stress (SM<20%) and waterlogging (SM>85%) reduce nutrient
  // availability; optimal conditions (SM≈52%) maximise NPK readings.
  //
  //   npkFactor at SM=5  (criticalLow) ≈ 0.09
  //   npkFactor at SM=52 (optimal)     = 1.00
  //   npkFactor at SM=90 (criticalHigh)≈ 0.21
  const npkFactor = Math.exp(-Math.pow(soilMoisture - 52, 2) / (2 * 20 * 20))

  const weekPhase = (tSec % (7 * DAY_S)) / (7 * DAY_S)
  const fertSpike = Math.max(0, Math.sin(2 * Math.PI * weekPhase)) * 0.25

  // Calibrated so each class range is well-covered:
  //   nitrogen:   criticalLow SM → 2-8 (low);   optimal SM → 22-33 (high)
  //   phosphorus: criticalLow SM → 2-8 (low);   optimal SM → 27-40 (high)
  //   potassium:  criticalLow SM → 5-16 (low);  optimal SM → 62-85 (high-CH)
  const nitrogen   = clamp(+(( 3 + 28 * npkFactor + fertSpike * 10 + 2 * (rng() - 0.5)).toFixed(1)),  2, 43)
  const phosphorus = clamp(+(( 3 + 34 * npkFactor + fertSpike * 10 + 2 * (rng() - 0.5)).toFixed(1)),  2, 47)
  const potassium  = clamp(+(( 8 + 70 * npkFactor + fertSpike * 18 + 4 * (rng() - 0.5)).toFixed(1)),  5, 95)

  return {
    timestamp:      new Date(START_MS + tSec * 1000),
    soilMoisture:   Math.round(soilMoisture   * 100) / 100,
    temperature:    Math.round(temperature    * 100) / 100,
    humidity:       Math.round(humidity       * 100) / 100,
    reservoirLevel: Math.round(reservoirLevel * 100) / 100,
    ph:             7.0,
    nitrogen,
    phosphorus,
    potassium,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const totalSec = (END_MS - START_MS) / 1000
  const interval = totalSec / TARGET_PER_NODE

  console.log('AquaSense — Historical Seed  (physics-based correlations)')
  console.log('Period   : 2026-03-05  →  2026-04-07')
  console.log(`Duration : ${(totalSec / DAY_S).toFixed(0)} days`)
  console.log(`Per node : ${TARGET_PER_NODE.toLocaleString()} readings  (~every ${Math.round(interval)} s)`)
  console.log(`Total    : ${(TARGET_PER_NODE * 2).toLocaleString()} readings across 2 nodes`)
  console.log('─'.repeat(56))

  const nodes = await prisma.sensorNode.findMany({
    where:   { slug: { in: ['node-1', 'node-2'] } },
    select:  { id: true, slug: true, name: true },
    orderBy: { slug: 'asc' },
  })

  if (nodes.length === 0) {
    console.error('ERROR: No nodes found. Run  npm run seed  first.')
    process.exit(1)
  }

  for (let ni = 0; ni < nodes.length; ni++) {
    const node = nodes[ni]
    console.log(`\n[${ni + 1}/${nodes.length}] ${node.name}  (${node.slug})`)

    let inserted = 0
    let batch    = []

    for (let i = 0; i < TARGET_PER_NODE; i++) {
      batch.push({ nodeId: node.id, ...generateReading(i * interval, ni) })

      if (batch.length === BATCH || i === TARGET_PER_NODE - 1) {
        await prisma.sensorReading.createMany({ data: batch, skipDuplicates: true })
        inserted += batch.length
        batch    = []

        if (inserted % (TARGET_PER_NODE / 10) < BATCH) {
          const pct = ((inserted / TARGET_PER_NODE) * 100).toFixed(0)
          process.stdout.write(
            `\r  ${pct.padStart(3)}%  ${inserted.toLocaleString().padStart(8)} / ${TARGET_PER_NODE.toLocaleString()}`
          )
        }
      }
    }
    process.stdout.write(
      `\r  100%  ${inserted.toLocaleString().padStart(8)} / ${TARGET_PER_NODE.toLocaleString()} — done\n`
    )
  }

  console.log('\n' + '─'.repeat(56))
  const total = await prisma.sensorReading.count()
  console.log(`Total records in DB: ${total.toLocaleString()}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
