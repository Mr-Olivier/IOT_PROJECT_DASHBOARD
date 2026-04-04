import * as fc from 'fast-check'
import { filterReadingsByRange } from '@/lib/readings'
import { SensorReading } from '@prisma/client'

function makeReading(timestamp: Date): SensorReading {
  return {
    id: 'test-id',
    nodeId: 'node-1',
    timestamp,
    soilMoisture: 50,
    temperature: 25,
    humidity: 60,
    reservoirLevel: 100,
    ph: 7,
    nitrogen: null,
    phosphorus: null,
    potassium: null,
  }
}

describe('filterReadingsByRange', () => {
  it('returns only readings within [start, end] inclusive', () => {
    const start = new Date('2024-01-01T00:00:00Z')
    const end = new Date('2024-01-02T00:00:00Z')
    const readings = [
      makeReading(new Date('2023-12-31T23:59:59Z')), // before
      makeReading(new Date('2024-01-01T00:00:00Z')), // start boundary
      makeReading(new Date('2024-01-01T12:00:00Z')), // inside
      makeReading(new Date('2024-01-02T00:00:00Z')), // end boundary
      makeReading(new Date('2024-01-02T00:00:01Z')), // after
    ]
    const result = filterReadingsByRange(readings, start, end)
    expect(result).toHaveLength(3)
    expect(result.map((r) => r.timestamp.toISOString())).toEqual([
      '2024-01-01T00:00:00.000Z',
      '2024-01-01T12:00:00.000Z',
      '2024-01-02T00:00:00.000Z',
    ])
  })

  it('returns empty array when no readings fall in range', () => {
    const start = new Date('2024-06-01T00:00:00Z')
    const end = new Date('2024-06-02T00:00:00Z')
    const readings = [
      makeReading(new Date('2024-01-01T00:00:00Z')),
      makeReading(new Date('2024-12-31T00:00:00Z')),
    ]
    expect(filterReadingsByRange(readings, start, end)).toHaveLength(0)
  })

  it('returns all readings when all fall within range', () => {
    const start = new Date('2024-01-01T00:00:00Z')
    const end = new Date('2024-12-31T00:00:00Z')
    const readings = [
      makeReading(new Date('2024-03-01T00:00:00Z')),
      makeReading(new Date('2024-06-15T00:00:00Z')),
      makeReading(new Date('2024-09-30T00:00:00Z')),
    ]
    expect(filterReadingsByRange(readings, start, end)).toHaveLength(3)
  })

  // Feature: smart-irrigation-dashboard, Property 2: Time Range Filtering Correctness
  // **Validates: Requirements 2.2**
  it('property: filtered result contains exactly readings within [start, end]', () => {
    const readingArb = fc.date().map((d) => makeReading(d))

    fc.assert(
      fc.property(
        fc.array(readingArb, { maxLength: 50 }),
        fc.tuple(fc.date(), fc.date()).map(([a, b]) =>
          a <= b ? [a, b] : [b, a]
        ),
        (readings, [start, end]) => {
          const result = filterReadingsByRange(readings, start, end)

          // Every result reading must be within [start, end]
          const allInRange = result.every(
            (r) => r.timestamp >= start && r.timestamp <= end
          )

          // Every reading in range must appear in result
          const inRangeCount = readings.filter(
            (r) => r.timestamp >= start && r.timestamp <= end
          ).length

          return allInRange && result.length === inRangeCount
        }
      ),
      { numRuns: 100 }
    )
  })
})
