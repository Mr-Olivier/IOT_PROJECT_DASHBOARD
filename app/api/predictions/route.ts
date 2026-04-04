import { NextResponse } from 'next/server'
import { getLatestPrediction } from '@/lib/predictions'

export async function GET() {
  const [pred24h, pred7d] = await Promise.all([
    getLatestPrediction('24h'),
    getLatestPrediction('7d'),
  ])

  if (pred24h === null && pred7d === null) {
    return NextResponse.json({ error: 'predictions_unavailable' }, { status: 503 })
  }

  const isStale = (pred24h?.isStale ?? true) || (pred7d?.isStale ?? true)

  return NextResponse.json({
    predictions: {
      '24h': pred24h,
      '7d': pred7d,
    },
    isStale,
  })
}
