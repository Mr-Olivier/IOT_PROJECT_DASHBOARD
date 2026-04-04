import { NextRequest, NextResponse } from 'next/server'
import { getThresholds, saveThreshold, validateThreshold } from '@/lib/thresholds'

export async function GET(req: NextRequest) {
  const nodeId = req.nextUrl.searchParams.get('nodeId') ?? undefined
  const thresholds = await getThresholds(nodeId)
  return NextResponse.json(thresholds)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { nodeId, metric, minValue, maxValue } = body

  const validation = validateThreshold(
    metric,
    minValue ?? null,
    maxValue ?? null
  )

  if (!validation.valid) {
    return NextResponse.json({ error: 'validation', fields: validation.errors }, { status: 400 })
  }

  const saved = await saveThreshold({ nodeId, metric, minValue, maxValue })
  return NextResponse.json(saved)
}
