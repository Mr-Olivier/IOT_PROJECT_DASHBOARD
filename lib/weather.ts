import { prisma } from '@/lib/prisma'

const STALE_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes

export function isWeatherStale(fetchedAt: Date, now: Date): boolean {
  return now.getTime() - fetchedAt.getTime() > STALE_THRESHOLD_MS
}

export async function fetchAndCacheWeather(): Promise<{
  data: unknown
  isStale: boolean
  fetchedAt: Date
} | null> {
  const latest = await prisma.weatherCache.findFirst({
    orderBy: { fetchedAt: 'desc' },
  })

  if (latest && !isWeatherStale(latest.fetchedAt, new Date())) {
    return { data: latest.data, isStale: false, fetchedAt: latest.fetchedAt }
  }

  // Attempt to fetch fresh data from OpenWeatherMap
  const apiKey = process.env.OPENWEATHERMAP_API_KEY ?? ''
  const lat = process.env.FIELD_LAT ?? '0'
  const lon = process.env.FIELD_LON ?? '0'
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OpenWeatherMap responded with ${res.status}`)
    const data = await res.json()

    // Mark all previous entries as stale
    await prisma.weatherCache.updateMany({ data: { isStale: true } })

    const entry = await prisma.weatherCache.create({
      data: { data, isStale: false },
    })

    return { data: entry.data, isStale: false, fetchedAt: entry.fetchedAt }
  } catch {
    // Fetch failed — return latest cache with isStale: true
    if (latest) {
      return { data: latest.data, isStale: true, fetchedAt: latest.fetchedAt }
    }
    return null
  }
}
