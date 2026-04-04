export const SENSOR_RANGES = {
  soilMoisture: { min: 0, max: 100 },
  temperature: { min: -40, max: 80 },
  humidity: { min: 0, max: 100 },
  reservoirLevel: { min: 0, max: 400 },
  ph: { min: 0, max: 14 },
  nitrogen: { min: 0, max: 1999 },
  phosphorus: { min: 0, max: 1999 },
  potassium: { min: 0, max: 1999 },
} as const

type SensorMetric = keyof typeof SENSOR_RANGES

const REQUIRED_FIELDS = [
  'nodeId',
  'timestamp',
  'soilMoisture',
  'temperature',
  'humidity',
  'reservoirLevel',
  'ph',
] as const

type ValidationResult =
  | { valid: true }
  | { valid: false; errors: Record<string, string> }

export function validateSensorPayload(payload: unknown): ValidationResult {
  const errors: Record<string, string> = {}

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, errors: { _root: 'Payload must be a JSON object' } }
  }

  const p = payload as Record<string, unknown>

  // Check required fields are present
  for (const field of REQUIRED_FIELDS) {
    if (p[field] === undefined || p[field] === null) {
      errors[field] = `${field} is required`
    }
  }

  // Validate numeric ranges (only if field is present)
  const numericMetrics: SensorMetric[] = [
    'soilMoisture',
    'temperature',
    'humidity',
    'reservoirLevel',
    'ph',
  ]

  for (const metric of numericMetrics) {
    if (p[metric] === undefined || p[metric] === null) continue // already flagged above

    const value = p[metric]
    if (typeof value !== 'number' || isNaN(value)) {
      errors[metric] = `${metric} must be a number`
      continue
    }

    const { min, max } = SENSOR_RANGES[metric]
    if (value < min || value > max) {
      errors[metric] = `value ${value} out of range [${min}, ${max}]`
    }
  }

  // Validate optional NPK fields (skip if absent)
  const optionalNpkMetrics: SensorMetric[] = ['nitrogen', 'phosphorus', 'potassium']

  for (const metric of optionalNpkMetrics) {
    if (p[metric] === undefined || p[metric] === null) continue // optional — skip if absent

    const value = p[metric]
    if (typeof value !== 'number' || isNaN(value)) {
      errors[metric] = `${metric} must be a number`
      continue
    }

    const { min, max } = SENSOR_RANGES[metric]
    if (value < min || value > max) {
      errors[metric] = `value ${value} out of range [${min}, ${max}]`
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}
// NPK validation
