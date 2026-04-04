import { prisma } from '@/lib/prisma'

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

export function selectGranularity(durationMs: number): 'hour' | 'minute' {
  return durationMs > FORTY_EIGHT_HOURS_MS ? 'hour' : 'minute'
}

export interface AggregatedReading {
  bucket: Date
  soilMoisture: number
  temperature: number
  humidity: number
  reservoirLevel: number
  ph: number
  nitrogen: number | null
  phosphorus: number | null
  potassium: number | null
}

export async function aggregateReadings(
  nodeId: string,
  start: Date,
  end: Date
): Promise<AggregatedReading[]> {
  const durationMs = end.getTime() - start.getTime()
  const granularity = selectGranularity(durationMs)

  const rows = await prisma.$queryRaw<AggregatedReading[]>`
    SELECT
      date_trunc(${granularity}, timestamp) AS bucket,
      AVG("soilMoisture")   AS "soilMoisture",
      AVG(temperature)      AS temperature,
      AVG(humidity)         AS humidity,
      AVG("reservoirLevel") AS "reservoirLevel",
      AVG(ph)               AS ph,
      AVG(nitrogen)         AS nitrogen,
      AVG(phosphorus)       AS phosphorus,
      AVG(potassium)        AS potassium
    FROM "SensorReading"
    WHERE "nodeId" = ${nodeId}
      AND timestamp >= ${start}
      AND timestamp <= ${end}
    GROUP BY date_trunc(${granularity}, timestamp)
    ORDER BY bucket ASC
  `

  return rows.map((row) => ({
    bucket: new Date(row.bucket),
    soilMoisture: Number(row.soilMoisture),
    temperature: Number(row.temperature),
    humidity: Number(row.humidity),
    reservoirLevel: Number(row.reservoirLevel),
    ph: Number(row.ph),
    nitrogen: row.nitrogen !== null ? Number(row.nitrogen) : null,
    phosphorus: row.phosphorus !== null ? Number(row.phosphorus) : null,
    potassium: row.potassium !== null ? Number(row.potassium) : null,
  }))
}
// NPK aggregation
