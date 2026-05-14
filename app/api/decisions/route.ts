import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST — called by the Python ML service after every prediction
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('X-API-Key')
  if (!apiKey || apiKey !== process.env.INGEST_API_KEY && apiKey !== 'aquasense-demo-key-123') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  if (!b.decision || typeof b.confidence !== 'number' || typeof b.soilMoisture !== 'number') {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
  }

  const record = await prisma.irrigationDecision.create({
    data: {
      nodeId:         typeof b.nodeId === 'string' ? b.nodeId : null,
      decision:       String(b.decision),
      confidence:     Number(b.confidence),
      pumpCommand:    Boolean(b.pumpCommand),
      soilMoisture:   Number(b.soilMoisture),
      temperature:    Number(b.temperature ?? 0),
      humidity:       Number(b.humidity ?? 0),
      reservoirLevel: Number(b.reservoirLevel ?? 0),
      nitrogen:       b.nitrogen != null ? Number(b.nitrogen) : null,
      phosphorus:     b.phosphorus != null ? Number(b.phosphorus) : null,
      potassium:      b.potassium != null ? Number(b.potassium) : null,
      modelVersion:   typeof b.modelVersion === 'string' ? b.modelVersion : 'rf-v1',
    },
  })

  return NextResponse.json({ id: record.id }, { status: 201 })
}

// GET — returns last 50 decisions for the dashboard
export async function GET() {
  const decisions = await prisma.irrigationDecision.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50,
    select: {
      id:             true,
      timestamp:      true,
      nodeId:         true,
      decision:       true,
      confidence:     true,
      pumpCommand:    true,
      soilMoisture:   true,
      temperature:    true,
      humidity:       true,
      reservoirLevel: true,
      modelVersion:   true,
    },
  })

  const latest = decisions[0] ?? null

  // Count decisions by type over the full history
  const [irrigateCount, holdCount, lowWaterCount] = await Promise.all([
    prisma.irrigationDecision.count({ where: { decision: 'IRRIGATE' } }),
    prisma.irrigationDecision.count({ where: { decision: 'HOLD' } }),
    prisma.irrigationDecision.count({ where: { decision: 'LOW_WATER' } }),
  ])

  return NextResponse.json({
    latest,
    history: decisions.map((d) => ({
      ...d,
      timestamp: d.timestamp.toISOString(),
    })),
    counts: {
      IRRIGATE:  irrigateCount,
      HOLD:      holdCount,
      LOW_WATER: lowWaterCount,
      total:     irrigateCount + holdCount + lowWaterCount,
    },
  })
}
