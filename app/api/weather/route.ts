import { NextResponse } from 'next/server'
import { fetchAndCacheWeather } from '@/lib/weather'

export async function GET() {
  const result = await fetchAndCacheWeather()

  if (result === null) {
    return NextResponse.json({ error: 'weather_unavailable' }, { status: 503 })
  }

  return NextResponse.json({
    data: result.data,
    isStale: result.isStale,
    fetchedAt: result.fetchedAt,
  })
}
