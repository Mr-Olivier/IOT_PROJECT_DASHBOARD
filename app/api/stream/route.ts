import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET() {
  let lastReadingTime = new Date()
  let lastAlertTime = new Date()
  let lastPumpEventId: string | null = null
  let lastPredictionId: string | null = null

  // Seed the last known IDs so we only stream new events
  try {
    const latestPump = await prisma.pumpEvent.findFirst({ orderBy: { timestamp: 'desc' } })
    if (latestPump) lastPumpEventId = latestPump.id

    const latestPrediction = await prisma.mLPrediction.findFirst({ orderBy: { generatedAt: 'desc' } })
    if (latestPrediction) lastPredictionId = latestPrediction.id
  } catch {
    // If seeding fails, we'll just stream everything from now
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const enqueue = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(encodeSSE(event, data)))
        } catch {
          // Controller already closed — client disconnected
        }
      }

      let closed = false

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval)
          return
        }
        try {
          // Poll for new sensor readings
          const newReadings = await prisma.sensorReading.findMany({
            where: { timestamp: { gt: lastReadingTime } },
            orderBy: { timestamp: 'asc' },
          })
          for (const reading of newReadings) {
            enqueue('reading', {
              type: 'reading',
              nodeId: reading.nodeId,
              data: reading,
              ts: reading.timestamp.toISOString(),
            })
            lastReadingTime = reading.timestamp
          }

          // Poll for new alerts
          const newAlerts = await prisma.alert.findMany({
            where: { createdAt: { gt: lastAlertTime } },
            orderBy: { createdAt: 'asc' },
          })
          for (const alert of newAlerts) {
            enqueue('alert', {
              type: 'alert',
              nodeId: alert.nodeId,
              data: alert,
              ts: alert.createdAt.toISOString(),
            })
            lastAlertTime = alert.createdAt
          }

          // Check for new pump state
          const latestPump = await prisma.pumpEvent.findFirst({
            orderBy: { timestamp: 'desc' },
          })
          if (latestPump && latestPump.id !== lastPumpEventId) {
            enqueue('pump_state', {
              type: 'pump_state',
              nodeId: latestPump.nodeId ?? null,
              data: latestPump,
              ts: latestPump.timestamp.toISOString(),
            })
            lastPumpEventId = latestPump.id
          }

          // Check for new ML prediction
          const latestPrediction = await prisma.mLPrediction.findFirst({
            orderBy: { generatedAt: 'desc' },
          })
          if (latestPrediction && latestPrediction.id !== lastPredictionId) {
            enqueue('prediction', {
              type: 'prediction',
              nodeId: null,
              data: latestPrediction,
              ts: latestPrediction.generatedAt.toISOString(),
            })
            lastPredictionId = latestPrediction.id
          }
        } catch {
          closed = true
          try { controller.close() } catch { /* already closed */ }
          clearInterval(interval)
        }
      }, 3000)

      return () => {
        closed = true
        clearInterval(interval)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
