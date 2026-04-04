'use client'

import { useEffect, useRef, useState } from 'react'
import { Droplets, Thermometer, Wind, Waves, FlaskConical, Wifi, WifiOff, Leaf } from 'lucide-react'

export interface SensorCardProps {
  nodeId: string
  name: string
  zone?: string
  isOffline: boolean
  lastSeen?: string
  soilMoisture?: number
  temperature?: number
  humidity?: number
  reservoirLevel?: number
  ph?: number
  nitrogen?: number | null
  phosphorus?: number | null
  potassium?: number | null
}

interface LiveReadings {
  soilMoisture?: number
  temperature?: number
  humidity?: number
  reservoirLevel?: number
  ph?: number
  nitrogen?: number | null
  phosphorus?: number | null
  potassium?: number | null
  lastSeen?: string
  isOffline: boolean
}

function formatRelativeTime(isoTimestamp?: string): string {
  if (!isoTimestamp) return 'Never'
  const diff = Date.now() - new Date(isoTimestamp).getTime()
  if (diff < 0) return 'Just now'
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const METRICS = [
  { key: 'soilMoisture' as const, label: 'Soil Moisture', unit: '%', icon: Droplets, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { key: 'temperature' as const, label: 'Temperature', unit: '°C', icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-50' },
  { key: 'humidity' as const, label: 'Humidity', unit: '%', icon: Wind, color: 'text-sky-500', bg: 'bg-sky-50' },
  { key: 'reservoirLevel' as const, label: 'Reservoir', unit: 'cm', icon: Waves, color: 'text-blue-500', bg: 'bg-blue-50' },
  { key: 'ph' as const, label: 'pH Level', unit: '', icon: FlaskConical, color: 'text-violet-500', bg: 'bg-violet-50' },
  { key: 'nitrogen' as const, label: 'Nitrogen', unit: ' mg/kg', icon: Leaf, color: 'text-lime-500', bg: 'bg-lime-50' },
  { key: 'phosphorus' as const, label: 'Phosphorus', unit: ' mg/kg', icon: Leaf, color: 'text-orange-500', bg: 'bg-orange-50' },
  { key: 'potassium' as const, label: 'Potassium', unit: ' mg/kg', icon: Leaf, color: 'text-purple-500', bg: 'bg-purple-50' },
]

export default function SensorCard(props: SensorCardProps) {
  const [live, setLive] = useState<LiveReadings>({
    soilMoisture: props.soilMoisture,
    temperature: props.temperature,
    humidity: props.humidity,
    reservoirLevel: props.reservoirLevel,
    ph: props.ph,
    nitrogen: props.nitrogen,
    phosphorus: props.phosphorus,
    potassium: props.potassium,
    lastSeen: props.lastSeen,
    isOffline: props.isOffline,
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const supportsSSE = typeof EventSource !== 'undefined'

    if (supportsSSE) {
      const es = new EventSource('/api/stream')
      esRef.current = es

      es.addEventListener('reading', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data)
          if (payload.nodeId !== props.nodeId) return
          const d = payload.data
          setLive((prev) => ({
            ...prev,
            soilMoisture: d.soilMoisture ?? prev.soilMoisture,
            temperature: d.temperature ?? prev.temperature,
            humidity: d.humidity ?? prev.humidity,
            reservoirLevel: d.reservoirLevel ?? prev.reservoirLevel,
            ph: d.ph ?? prev.ph,
            nitrogen: d.nitrogen !== undefined ? d.nitrogen : prev.nitrogen,
            phosphorus: d.phosphorus !== undefined ? d.phosphorus : prev.phosphorus,
            potassium: d.potassium !== undefined ? d.potassium : prev.potassium,
            lastSeen: payload.ts ?? prev.lastSeen,
            isOffline: false,
          }))
        } catch {
          // ignore malformed events
        }
      })

      return () => {
        es.close()
        esRef.current = null
      }
    } else {
      const poll = async () => {
        try {
          const res = await fetch(`/api/nodes/${props.nodeId}/latest`)
          if (!res.ok) return
          const data = await res.json()
          setLive({
            soilMoisture: data.soilMoisture,
            temperature: data.temperature,
            humidity: data.humidity,
            reservoirLevel: data.reservoirLevel,
            ph: data.ph,
            nitrogen: data.nitrogen ?? null,
            phosphorus: data.phosphorus ?? null,
            potassium: data.potassium ?? null,
            lastSeen: data.timestamp,
            isOffline: data.isOffline ?? false,
          })
        } catch {
          // ignore fetch errors
        }
      }

      poll()
      intervalRef.current = setInterval(poll, 10_000)

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
  }, [props.nodeId])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-gray-900 font-semibold text-base leading-tight">{props.name}</h3>
          {props.zone && (
            <span className="text-gray-500 text-xs mt-0.5 block">{props.zone}</span>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            live.isOffline
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {live.isOffline ? <WifiOff size={11} /> : <Wifi size={11} />}
          {live.isOffline ? 'Offline' : 'Online'}
        </span>
      </div>

      {/* Last seen */}
      <p className="text-xs text-gray-400" suppressHydrationWarning>Last seen: {formatRelativeTime(live.lastSeen)}</p>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {METRICS.map(({ key, label, unit, icon: Icon, color, bg }) => {
          const value = live[key]
          const isFullWidth = key === 'ph'
          return (
            <div
              key={key}
              className={`${isFullWidth ? 'col-span-2' : ''} flex items-center gap-3 bg-gray-50 rounded-lg p-3`}
            >
              <div className={`${bg} p-2 rounded-lg shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {value != null ? `${value}${unit}` : '—'}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
// hydration fix
// NPK sensor card
