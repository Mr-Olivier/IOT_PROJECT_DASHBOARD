import { prisma } from '@/lib/prisma'
import { PumpEvent } from '@prisma/client'

/**
 * Determines whether the automated pump should activate.
 * Returns true if and only if:
 *   - moistureReadings is non-empty
 *   - ALL readings are below the threshold
 *   - rainForecast is false
 */
export function evaluateAutoPump(
  moistureReadings: number[],
  rainForecast: boolean,
  threshold: number
): boolean {
  if (moistureReadings.length === 0) return false
  if (rainForecast) return false
  return moistureReadings.every((r) => r < threshold)
}

/**
 * Returns the latest PumpEvent ordered by timestamp descending, or null.
 */
export async function getPumpState(): Promise<PumpEvent | null> {
  return prisma.pumpEvent.findFirst({
    orderBy: { timestamp: 'desc' },
  })
}

/**
 * Creates and returns a new PumpEvent record.
 */
export async function recordPumpEvent(payload: {
  nodeId?: string
  source: string
  action: string
  triggeredBy?: string
  success: boolean
  errorMsg?: string
}): Promise<PumpEvent> {
  return prisma.pumpEvent.create({ data: payload })
}
// pump logic
