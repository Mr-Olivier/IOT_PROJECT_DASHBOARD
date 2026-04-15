/**
 * lib/classification.ts
 * Server-side functions for §10 — Data Categorization & Classification.
 * Computes class distributions and Pearson correlation coefficients
 * directly from the PostgreSQL database.
 */

import { prisma } from '@/lib/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SensorClassStats {
  sensor: string
  label: string
  unit: string
  total: number
  criticalLow: number
  low: number
  optimal: number
  high: number
  criticalHigh: number
}

export interface CorrelationPair {
  a: string
  aLabel: string
  b: string
  bLabel: string
  r: number           // Pearson r  −1 … +1
  interpretation: string
}

export interface ClassificationStats {
  totalReadings: number
  sensors: SensorClassStats[]
  correlations: CorrelationPair[]
}

// ─── Class distribution ───────────────────────────────────────────────────────

type RawDistRow = {
  total: bigint
  sm_cl: bigint; sm_l: bigint; sm_o: bigint; sm_h: bigint; sm_ch: bigint
  t_cl:  bigint; t_l:  bigint; t_o:  bigint; t_h:  bigint; t_ch:  bigint
  h_cl:  bigint; h_l:  bigint; h_o:  bigint; h_h:  bigint; h_ch:  bigint
  r_cl:  bigint; r_l:  bigint; r_o:  bigint; r_h:  bigint; r_ch:  bigint
  n_cl:  bigint; n_l:  bigint; n_o:  bigint; n_h:  bigint; n_ch:  bigint
  p_cl:  bigint; p_l:  bigint; p_o:  bigint; p_h:  bigint; p_ch:  bigint
  k_cl:  bigint; k_l:  bigint; k_o:  bigint; k_h:  bigint; k_ch:  bigint
}

type RawCorrRow = {
  sm_t: number | null; sm_h: number | null; sm_r: number | null; sm_n: number | null
  t_h:  number | null; t_r:  number | null
  h_r:  number | null
  n_p:  number | null; n_k:  number | null
  p_k:  number | null
}

function n(v: bigint): number { return Number(v) }

function interpCorr(r: number): string {
  const abs = Math.abs(r)
  const dir = r >= 0 ? 'positive' : 'negative'
  if (abs >= 0.7) return `Strong ${dir} correlation`
  if (abs >= 0.4) return `Moderate ${dir} correlation`
  if (abs >= 0.2) return `Weak ${dir} correlation`
  return 'No significant correlation'
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function getClassificationStats(nodeId: string): Promise<ClassificationStats> {

  // ── 1. Class distribution (single query) ──────────────────────────────────
  const [distRow] = await prisma.$queryRaw<RawDistRow[]>`
    SELECT
      COUNT(*)::bigint AS total,
      -- Soil Moisture thresholds (%)
      COUNT(CASE WHEN "soilMoisture" <= 20 THEN 1 END)::bigint                              AS sm_cl,
      COUNT(CASE WHEN "soilMoisture" > 20  AND "soilMoisture" <= 40  THEN 1 END)::bigint    AS sm_l,
      COUNT(CASE WHEN "soilMoisture" > 40  AND "soilMoisture" <= 70  THEN 1 END)::bigint    AS sm_o,
      COUNT(CASE WHEN "soilMoisture" > 70  AND "soilMoisture" <= 85  THEN 1 END)::bigint    AS sm_h,
      COUNT(CASE WHEN "soilMoisture" > 85                            THEN 1 END)::bigint    AS sm_ch,
      -- Temperature thresholds (°C)
      COUNT(CASE WHEN temperature <= 10 THEN 1 END)::bigint                                 AS t_cl,
      COUNT(CASE WHEN temperature > 10  AND temperature <= 18 THEN 1 END)::bigint           AS t_l,
      COUNT(CASE WHEN temperature > 18  AND temperature <= 30 THEN 1 END)::bigint           AS t_o,
      COUNT(CASE WHEN temperature > 30  AND temperature <= 38 THEN 1 END)::bigint           AS t_h,
      COUNT(CASE WHEN temperature > 38                        THEN 1 END)::bigint           AS t_ch,
      -- Humidity thresholds (%)
      COUNT(CASE WHEN humidity <= 30 THEN 1 END)::bigint                                    AS h_cl,
      COUNT(CASE WHEN humidity > 30  AND humidity <= 45 THEN 1 END)::bigint                 AS h_l,
      COUNT(CASE WHEN humidity > 45  AND humidity <= 75 THEN 1 END)::bigint                 AS h_o,
      COUNT(CASE WHEN humidity > 75  AND humidity <= 85 THEN 1 END)::bigint                 AS h_h,
      COUNT(CASE WHEN humidity > 85                     THEN 1 END)::bigint                 AS h_ch,
      -- Reservoir Level thresholds (%)
      COUNT(CASE WHEN "reservoirLevel" <= 10 THEN 1 END)::bigint                            AS r_cl,
      COUNT(CASE WHEN "reservoirLevel" > 10  AND "reservoirLevel" <= 25 THEN 1 END)::bigint AS r_l,
      COUNT(CASE WHEN "reservoirLevel" > 25  AND "reservoirLevel" <= 75 THEN 1 END)::bigint AS r_o,
      COUNT(CASE WHEN "reservoirLevel" > 75  AND "reservoirLevel" <= 90 THEN 1 END)::bigint AS r_h,
      COUNT(CASE WHEN "reservoirLevel" > 90                             THEN 1 END)::bigint AS r_ch,
      -- Nitrogen thresholds (mg/kg)
      COUNT(CASE WHEN nitrogen <= 50  THEN 1 END)::bigint                                   AS n_cl,
      COUNT(CASE WHEN nitrogen > 50   AND nitrogen <= 100 THEN 1 END)::bigint               AS n_l,
      COUNT(CASE WHEN nitrogen > 100  AND nitrogen <= 300 THEN 1 END)::bigint               AS n_o,
      COUNT(CASE WHEN nitrogen > 300  AND nitrogen <= 600 THEN 1 END)::bigint               AS n_h,
      COUNT(CASE WHEN nitrogen > 600                      THEN 1 END)::bigint               AS n_ch,
      -- Phosphorus thresholds (mg/kg)
      COUNT(CASE WHEN phosphorus <= 25  THEN 1 END)::bigint                                 AS p_cl,
      COUNT(CASE WHEN phosphorus > 25   AND phosphorus <= 50  THEN 1 END)::bigint           AS p_l,
      COUNT(CASE WHEN phosphorus > 50   AND phosphorus <= 150 THEN 1 END)::bigint           AS p_o,
      COUNT(CASE WHEN phosphorus > 150  AND phosphorus <= 400 THEN 1 END)::bigint           AS p_h,
      COUNT(CASE WHEN phosphorus > 400                        THEN 1 END)::bigint           AS p_ch,
      -- Potassium thresholds (mg/kg)
      COUNT(CASE WHEN potassium <= 100  THEN 1 END)::bigint                                 AS k_cl,
      COUNT(CASE WHEN potassium > 100   AND potassium <= 200 THEN 1 END)::bigint            AS k_l,
      COUNT(CASE WHEN potassium > 200   AND potassium <= 500 THEN 1 END)::bigint            AS k_o,
      COUNT(CASE WHEN potassium > 500   AND potassium <= 800 THEN 1 END)::bigint            AS k_h,
      COUNT(CASE WHEN potassium > 800                        THEN 1 END)::bigint            AS k_ch
    FROM "SensorReading"
    WHERE "nodeId" = ${nodeId}
  `

  const total = n(distRow.total)

  const sensors: SensorClassStats[] = [
    { sensor: 'soilMoisture',   label: 'Soil Moisture',  unit: '%',     total, criticalLow: n(distRow.sm_cl), low: n(distRow.sm_l), optimal: n(distRow.sm_o), high: n(distRow.sm_h), criticalHigh: n(distRow.sm_ch) },
    { sensor: 'temperature',    label: 'Temperature',    unit: '°C',    total, criticalLow: n(distRow.t_cl),  low: n(distRow.t_l),  optimal: n(distRow.t_o),  high: n(distRow.t_h),  criticalHigh: n(distRow.t_ch)  },
    { sensor: 'humidity',       label: 'Humidity',       unit: '%',     total, criticalLow: n(distRow.h_cl),  low: n(distRow.h_l),  optimal: n(distRow.h_o),  high: n(distRow.h_h),  criticalHigh: n(distRow.h_ch)  },
    { sensor: 'reservoirLevel', label: 'Reservoir',      unit: '%',     total, criticalLow: n(distRow.r_cl),  low: n(distRow.r_l),  optimal: n(distRow.r_o),  high: n(distRow.r_h),  criticalHigh: n(distRow.r_ch)  },
    { sensor: 'nitrogen',       label: 'Nitrogen (N)',   unit: 'mg/kg', total, criticalLow: n(distRow.n_cl),  low: n(distRow.n_l),  optimal: n(distRow.n_o),  high: n(distRow.n_h),  criticalHigh: n(distRow.n_ch)  },
    { sensor: 'phosphorus',     label: 'Phosphorus (P)', unit: 'mg/kg', total, criticalLow: n(distRow.p_cl),  low: n(distRow.p_l),  optimal: n(distRow.p_o),  high: n(distRow.p_h),  criticalHigh: n(distRow.p_ch)  },
    { sensor: 'potassium',      label: 'Potassium (K)',  unit: 'mg/kg', total, criticalLow: n(distRow.k_cl),  low: n(distRow.k_l),  optimal: n(distRow.k_o),  high: n(distRow.k_h),  criticalHigh: n(distRow.k_ch)  },
  ]

  // ── 2. Pearson correlation coefficients (single query) ────────────────────
  const [corrRow] = await prisma.$queryRaw<RawCorrRow[]>`
    SELECT
      corr("soilMoisture", temperature)      AS sm_t,
      corr("soilMoisture", humidity)         AS sm_h,
      corr("soilMoisture", "reservoirLevel") AS sm_r,
      corr("soilMoisture", nitrogen)         AS sm_n,
      corr(temperature,    humidity)         AS t_h,
      corr(temperature,    "reservoirLevel") AS t_r,
      corr(humidity,       "reservoirLevel") AS h_r,
      corr(nitrogen,       phosphorus)       AS n_p,
      corr(nitrogen,       potassium)        AS n_k,
      corr(phosphorus,     potassium)        AS p_k
    FROM "SensorReading"
    WHERE "nodeId" = ${nodeId}
  `

  function r(v: number | null): number {
    return v != null && !isNaN(v) ? Math.round(v * 1000) / 1000 : 0
  }

  const correlations: CorrelationPair[] = [
    { a: 'soilMoisture', aLabel: 'Soil Moisture', b: 'temperature',    bLabel: 'Temperature',    r: r(corrRow.sm_t), interpretation: interpCorr(r(corrRow.sm_t)) },
    { a: 'soilMoisture', aLabel: 'Soil Moisture', b: 'humidity',       bLabel: 'Humidity',       r: r(corrRow.sm_h), interpretation: interpCorr(r(corrRow.sm_h)) },
    { a: 'soilMoisture', aLabel: 'Soil Moisture', b: 'reservoirLevel', bLabel: 'Reservoir',      r: r(corrRow.sm_r), interpretation: interpCorr(r(corrRow.sm_r)) },
    { a: 'soilMoisture', aLabel: 'Soil Moisture', b: 'nitrogen',       bLabel: 'Nitrogen',       r: r(corrRow.sm_n), interpretation: interpCorr(r(corrRow.sm_n)) },
    { a: 'temperature',  aLabel: 'Temperature',   b: 'humidity',       bLabel: 'Humidity',       r: r(corrRow.t_h),  interpretation: interpCorr(r(corrRow.t_h))  },
    { a: 'temperature',  aLabel: 'Temperature',   b: 'reservoirLevel', bLabel: 'Reservoir',      r: r(corrRow.t_r),  interpretation: interpCorr(r(corrRow.t_r))  },
    { a: 'humidity',     aLabel: 'Humidity',      b: 'reservoirLevel', bLabel: 'Reservoir',      r: r(corrRow.h_r),  interpretation: interpCorr(r(corrRow.h_r))  },
    { a: 'nitrogen',     aLabel: 'Nitrogen',      b: 'phosphorus',     bLabel: 'Phosphorus',     r: r(corrRow.n_p),  interpretation: interpCorr(r(corrRow.n_p))  },
    { a: 'nitrogen',     aLabel: 'Nitrogen',      b: 'potassium',      bLabel: 'Potassium',      r: r(corrRow.n_k),  interpretation: interpCorr(r(corrRow.n_k))  },
    { a: 'phosphorus',   aLabel: 'Phosphorus',    b: 'potassium',      bLabel: 'Potassium',      r: r(corrRow.p_k),  interpretation: interpCorr(r(corrRow.p_k))  },
  ]

  return { totalReadings: total, sensors, correlations }
}
