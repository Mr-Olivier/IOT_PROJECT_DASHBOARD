import { SensorReading } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export function filterReadingsByRange(
  readings: SensorReading[],
  start: Date,
  end: Date
): SensorReading[] {
  return readings.filter(
    (r) => r.timestamp >= start && r.timestamp <= end
  )
}

export async function getLatestReading(nodeId: string): Promise<SensorReading | null> {
  return prisma.sensorReading.findFirst({
    where: { nodeId },
    orderBy: { timestamp: 'desc' },
  })
}

export async function getHistoricalReadings(
  nodeId: string,
  start: Date,
  end: Date
): Promise<SensorReading[]> {
  return prisma.sensorReading.findMany({
    where: {
      nodeId,
      timestamp: { gte: start, lte: end },
    },
    orderBy: { timestamp: 'asc' },
  })
}
