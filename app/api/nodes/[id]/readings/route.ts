import { NextRequest, NextResponse } from 'next/server'
import { getHistoricalReadings } from '@/lib/readings'
import { aggregateReadings } from '@/lib/aggregation'

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: nodeId } = params
  const { searchParams } = req.nextUrl

  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')
  const aggregateParam = searchParams.get('aggregate')

  if (!startParam || !endParam) {
    return NextResponse.json(
      { error: 'validation', fields: { ...(startParam ? {} : { start: 'required' }), ...(endParam ? {} : { end: 'required' }) } },
      { status: 400 }
    )
  }

  const start = new Date(startParam)
  const end = new Date(endParam)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: 'validation', fields: { _root: 'Invalid date format' } },
      { status: 400 }
    )
  }

  const durationMs = end.getTime() - start.getTime()
  const shouldAggregate =
    aggregateParam === 'true' || durationMs > FORTY_EIGHT_HOURS_MS

  try {
    if (shouldAggregate) {
      const readings = await aggregateReadings(nodeId, start, end)
      return NextResponse.json({ readings, aggregated: true })
    } else {
      const readings = await getHistoricalReadings(nodeId, start, end)
      return NextResponse.json({ readings, aggregated: false })
    }
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}