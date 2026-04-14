import { SENSOR_RANGES } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

const VALID_METRICS = Object.keys(SENSOR_RANGES) as Array<keyof typeof SENSOR_RANGES>

type ValidationResult =
  | { valid: true }
  | { valid: false; errors: Record<string, string> }

export function validateThreshold(
  metric: string,
  minValue: number | null,
  maxValue: number | null
): ValidationResult {
  const errors: Record<string, string> = {}

  if (!VALID_METRICS.includes(metric as keyof typeof SENSOR_RANGES)) {
    errors.metric = `metric must be one of: ${VALID_METRICS.join(', ')}`
  }

  const range = SENSOR_RANGES[metric as keyof typeof SENSOR_RANGES]

  if (range) {
    if (minValue !== null && minValue !== undefined) {
      if (minValue < range.min || minValue > range.max) {
        errors.minValue = `minValue ${minValue} out of range [${range.min}, ${range.max}]`
      }
    }

    if (maxValue !== null && maxValue !== undefined) {
      if (maxValue < range.min || maxValue > range.max) {
        errors.maxValue = `maxValue ${maxValue} out of range [${range.min}, ${range.max}]`
      }
    }
  }

  if (
    minValue !== null &&
    minValue !== undefined &&
    maxValue !== null &&
    maxValue !== undefined &&
    !errors.minValue &&
    !errors.maxValue
  ) {
    if (minValue >= maxValue) {
      errors.minValue = 'minValue must be less than maxValue'
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}

export async function saveThreshold(payload: {
  nodeId?: string
  metric: string
  minValue?: number
  maxValue?: number
}) {
  const { nodeId, metric, minValue, maxValue } = payload
  const nodeIdValue = nodeId ?? null

  const existing = await prisma.threshold.findFirst({
    where: { nodeId: nodeIdValue, metric },
  })

  if (existing) {
    return prisma.threshold.update({
      where: { id: existing.id },
      data: {
        minValue: minValue ?? null,
        maxValue: maxValue ?? null,
      },
    })
  }

  return prisma.threshold.create({
    data: {
      nodeId: nodeIdValue,
      metric,
      minValue: minValue ?? null,
      maxValue: maxValue ?? null,
    },
  })
}

export async function getThresholds(nodeId?: string) {
  const globalThresholds = await prisma.threshold.findMany({
    where: { nodeId: null },
  })

  if (!nodeId) {
    return globalThresholds
  }

  const nodeThresholds = await prisma.threshold.findMany({
    where: { nodeId },
  })

  // Merge: node-specific overrides global for same metric
  const merged = new Map(globalThresholds.map((t) => [t.metric, t]))
  for (const t of nodeThresholds) {
    merged.set(t.metric, t)
  }

  return Array.from(merged.values())
}
