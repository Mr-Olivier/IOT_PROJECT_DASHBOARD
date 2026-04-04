import { prisma } from '@/lib/prisma'

export type SensorMetric = 'soilMoisture' | 'temperature' | 'humidity' | 'reservoirLevel' | 'ph' | 'nitrogen' | 'phosphorus' | 'potassium'

export interface ThresholdConfig {
  metric: SensorMetric
  minValue: number | null
  maxValue: number | null
}

export interface ReadingValues {
  soilMoisture: number
  temperature: number
  humidity: number
  reservoirLevel: number
  ph: number
  nitrogen?: number | null
  phosphorus?: number | null
  potassium?: number | null
}

export interface AlertInput {
  nodeId: string
  metric: SensorMetric
  breachValue: number
  thresholdValue: number
  direction: 'above' | 'below'
}

const METRICS: SensorMetric[] = [
  'soilMoisture',
  'temperature',
  'humidity',
  'reservoirLevel',
  'ph',
  'nitrogen',
  'phosphorus',
  'potassium',
]

export function evaluateThresholds(
  reading: ReadingValues & { nodeId: string },
  thresholds: ThresholdConfig[]
): AlertInput[] {
  const alerts: AlertInput[] = []

  for (const metric of METRICS) {
    const config = thresholds.find((t) => t.metric === metric)
    if (!config) continue

    const value = reading[metric]

    // Skip evaluation if value is null or undefined (e.g. node has no NPK sensor)
    if (value === null || value === undefined) continue

    if (config.minValue !== null && value < config.minValue) {
      alerts.push({
        nodeId: reading.nodeId,
        metric,
        breachValue: value,
        thresholdValue: config.minValue,
        direction: 'below',
      })
    } else if (config.maxValue !== null && value > config.maxValue) {
      alerts.push({
        nodeId: reading.nodeId,
        metric,
        breachValue: value,
        thresholdValue: config.maxValue,
        direction: 'above',
      })
    }
  }

  return alerts
}

export async function createAlerts(alerts: AlertInput[]): Promise<void> {
  if (alerts.length === 0) return

  await prisma.alert.createMany({
    data: alerts.map((a) => ({
      nodeId: a.nodeId,
      metric: a.metric,
      breachValue: a.breachValue,
      thresholdValue: a.thresholdValue,
      direction: a.direction,
    })),
  })
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await prisma.alert.update({
    where: { id },
    data: {
      acknowledged: true,
      acknowledgedAt: new Date(),
    },
  })
}

export async function getAlertHistory(filters: {
  nodeId?: string
  acknowledged?: boolean
  limit?: number
  offset?: number
}) {
  return prisma.alert.findMany({
    where: {
      ...(filters.nodeId !== undefined && { nodeId: filters.nodeId }),
      ...(filters.acknowledged !== undefined && { acknowledged: filters.acknowledged }),
    },
    orderBy: { createdAt: 'desc' },
    ...(filters.limit !== undefined && { take: filters.limit }),
    ...(filters.offset !== undefined && { skip: filters.offset }),
  })
}
