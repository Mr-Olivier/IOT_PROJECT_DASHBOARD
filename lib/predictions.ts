import { MLPrediction } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function savePrediction(payload: {
  horizon: string
  predictions: unknown
  inputFeatures: unknown
}): Promise<MLPrediction> {
  // Mark previous predictions for this horizon as stale
  await prisma.mLPrediction.updateMany({
    where: { horizon: payload.horizon, isStale: false },
    data: { isStale: true },
  })

  return prisma.mLPrediction.create({
    data: {
      horizon: payload.horizon,
      predictions: payload.predictions as never,
      inputFeatures: payload.inputFeatures as never,
      isStale: false,
    },
  })
}

export async function getLatestPrediction(horizon: string): Promise<MLPrediction | null> {
  return prisma.mLPrediction.findFirst({
    where: { horizon },
    orderBy: { generatedAt: 'desc' },
  })
}

export async function fetchAndCachePredictions(): Promise<{
  data: MLPrediction
  isStale: boolean
} | null> {
  const mlUrl = process.env.ML_SERVICE_URL
  if (!mlUrl) {
    const cached = await getLatestPrediction('24h')
    return cached ? { data: cached, isStale: true } : null
  }

  // Gather recent sensor readings as context for the ML service
  const recentReadings = await prisma.sensorReading.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50,
  })

  try {
    const res = await fetch(`${mlUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readings: recentReadings }),
    })

    if (!res.ok) throw new Error(`ML service responded with ${res.status}`)

    const body = await res.json()

    const saved = await savePrediction({
      horizon: body.horizon ?? '24h',
      predictions: body.predictions,
      inputFeatures: body.inputFeatures ?? recentReadings,
    })

    return { data: saved, isStale: false }
  } catch {
    // Return latest cached prediction with isStale: true
    const cached = await getLatestPrediction('24h')
    if (cached) return { data: cached, isStale: true }
    return null
  }
}
