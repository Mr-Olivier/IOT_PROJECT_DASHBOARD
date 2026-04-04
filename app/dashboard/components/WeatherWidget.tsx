'use client'

import { useEffect, useRef, useState } from 'react'
import { Cloud, Droplets, Wind } from 'lucide-react'

interface WeatherEntry {
  dt: number
  pop: number
  rain?: { '3h': number }
  main: { temp: number }
}

interface WeatherData {
  current: {
    temp: number
    humidity: number
    wind_speed: number
    weather: Array<{ description: string; icon: string }>
  }
  list?: WeatherEntry[]
}

export interface WeatherWidgetProps {
  initialData?: WeatherData
  isStale?: boolean
  fetchedAt?: string
}

function formatTime(isoOrUnix: string | number): string {
  const d = typeof isoOrUnix === 'number' ? new Date(isoOrUnix * 1000) : new Date(isoOrUnix)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatFetchedAt(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function WeatherWidget({
  initialData,
  isStale: initialIsStale = false,
  fetchedAt: initialFetchedAt,
}: WeatherWidgetProps) {
  const [data, setData] = useState<WeatherData | undefined>(initialData)
  const [isStale, setIsStale] = useState(initialIsStale)
  const [fetchedAt, setFetchedAt] = useState<string | undefined>(initialFetchedAt)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function refresh() {
    try {
      const res = await fetch('/api/weather')
      if (!res.ok) return
      const json = await res.json()
      setData(json.data)
      setIsStale(json.isStale ?? false)
      setFetchedAt(json.fetchedAt)
    } catch {
      // keep existing data on error
    }
  }

  useEffect(() => {
    intervalRef.current = setInterval(refresh, 30 * 60 * 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const forecast = data?.list?.slice(0, 8) ?? []
  const current = data?.current
  const description = current?.weather?.[0]?.description ?? '—'
  const icon = current?.weather?.[0]?.icon

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-sky-50 p-2 rounded-lg">
            <Cloud size={18} className="text-sky-500" />
          </div>
          <h2 className="text-gray-900 font-semibold text-base">Weather</h2>
        </div>
        {isStale && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            Stale data
          </span>
        )}
      </div>

      {/* Current conditions */}
      {current ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 bg-sky-50 rounded-lg p-3">
            {icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
                alt={description}
                width={48}
                height={48}
                className="shrink-0"
              />
            )}
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {current.temp.toFixed(1)}
                <span className="text-base text-gray-500 ml-1">°C</span>
              </p>
              <p className="text-sm text-gray-500 capitalize">{description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
              <Droplets size={16} className="text-sky-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Humidity</p>
                <p className="text-sm font-semibold text-gray-900">{current.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
              <Wind size={16} className="text-sky-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Wind</p>
                <p className="text-sm font-semibold text-gray-900">{current.wind_speed.toFixed(1)} m/s</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No weather data available</p>
      )}

      {/* 24h rain forecast */}
      {forecast.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">24h Rain Forecast</p>
          <div className="flex flex-col gap-1.5">
            {forecast.map((entry) => {
              const popPct = Math.round(entry.pop * 100)
              const rain3h = entry.rain?.['3h']
              return (
                <div key={entry.dt} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-12 shrink-0">{formatTime(entry.dt)}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-sky-400 rounded-full transition-all"
                      style={{ width: `${popPct}%` }}
                    />
                  </div>
                  <span className="text-gray-700 w-10 text-right shrink-0 font-medium">{popPct}%</span>
                  {rain3h !== undefined && (
                    <span className="text-gray-400 w-14 text-right shrink-0">{rain3h.toFixed(1)} mm</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">Last updated: {formatFetchedAt(fetchedAt)}</p>
    </div>
  )
}
