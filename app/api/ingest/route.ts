import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { validateSensorPayload } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { evaluateThresholds, createAlerts, ThresholdConfig } from '@/lib/alerts'
import { getThresholds } from '@/lib/thresholds'
import { fetchAndCachePredictions } from '@/lib/predictions'

export async function POST(req: NextRequest) {
  // 1. Check API key header
  const apiKey = req.headers.get('X-API-Key')
  if (!apiKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2. Parse JSON body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'validation', fields: { _root: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  // 3. Validate payload
  const result = validateSensorPayload(body)
  if (!result.valid) {
    return NextResponse.json(
      { error: 'validation', fields: result.errors },
      { status: 400 }
    )
  }

  const payload = body as {
    nodeId: string
    timestamp: string
    soilMoisture: number
    temperature: number
    humidity: number
    reservoirLevel: number
    ph: number
    nitrogen?: number | null
    phosphorus?: number | null
    potassium?: number | null
  }

  // 4. Look up SensorNode and verify API key hash
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

  let node
  try {
    node = await prisma.sensorNode.findFirst({
      where: { slug: payload.nodeId, apiKeyHash },
    })
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }

  if (!node) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 5. Persist SensorReading
  try {
    const reading = await prisma.sensorReading.create({
      data: {
        nodeId: node.id,
        timestamp: new Date(payload.timestamp),
        soilMoisture: payload.soilMoisture,
        temperature: payload.temperature,
        humidity: payload.humidity,
        reservoirLevel: payload.reservoirLevel,
        ph: payload.ph,
        nitrogen: payload.nitrogen ?? null,
        phosphorus: payload.phosphorus ?? null,
        potassium: payload.potassium ?? null,
      },
    })

    // 6. Alert evaluation (synchronous — before returning)
    const thresholds = await getThresholds(node.id)
    const alertInputs = evaluateThresholds(
      {
        nodeId: node.id,
        soilMoisture: payload.soilMoisture,
        temperature: payload.temperature,
        humidity: payload.humidity,
        reservoirLevel: payload.reservoirLevel,
        ph: payload.ph,
        nitrogen: payload.nitrogen ?? null,
        phosphorus: payload.phosphorus ?? null,
        potassium: payload.potassium ?? null,
      },
      thresholds as ThresholdConfig[]
    )
    if (alertInputs.length > 0) {
      await createAlerts(alertInputs)
    }

    // 7. ML prediction refresh (fire-and-forget)
    void fetchAndCachePredictions().catch(console.error)

    return NextResponse.json({ id: reading.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
