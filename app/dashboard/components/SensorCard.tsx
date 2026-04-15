'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Droplets,
  Thermometer,
  Wind,
  Waves,
  Wifi,
  WifiOff,
  Leaf,
  ArrowUpRight,
} from 'lucide-react'

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
  nitrogen?: number | null
  phosphorus?: number | null
  potassium?: number | null
}

interface LiveReadings {
  soilMoisture?: number
  temperature?: number
  humidity?: number
  reservoirLevel?: number
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
  return `${Math.floor(hours / 24)}d ago`
}

const METRICS = [
  {
    key: 'soilMoisture' as const,
    label: 'Soil Moisture',
    unit: '%',
    icon: Droplets,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    gradient: 'from-emerald-400 to-teal-500',
    valueColor: 'text-emerald-700',
  },
  {
    key: 'temperature' as const,
    label: 'Temperature',
    unit: '°C',
    icon: Thermometer,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    gradient: 'from-orange-400 to-red-500',
    valueColor: 'text-orange-700',
  },
  {
    key: 'humidity' as const,
    label: 'Humidity',
    unit: '%',
    icon: Wind,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    gradient: 'from-sky-400 to-blue-500',
    valueColor: 'text-sky-700',
  },
  {
    key: 'reservoirLevel' as const,
    label: 'Reservoir',
    unit: '%',
    icon: Waves,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    gradient: 'from-blue-500 to-indigo-500',
    valueColor: 'text-blue-700',
  },
  {
    key: 'nitrogen' as const,
    label: 'Nitrogen (N)',
    unit: 'mg/kg',
    icon: Leaf,
    color: 'text-lime-600',
    bg: 'bg-lime-50',
    gradient: 'from-lime-400 to-green-500',
    valueColor: 'text-lime-700',
  },
  {
    key: 'phosphorus' as const,
    label: 'Phosphorus (P)',
    unit: 'mg/kg',
    icon: Leaf,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    gradient: 'from-amber-400 to-orange-500',
    valueColor: 'text-amber-700',
  },
  {
    key: 'potassium' as const,
    label: 'Potassium (K)',
    unit: 'mg/kg',
    icon: Leaf,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    gradient: 'from-purple-500 to-fuchsia-500',
    valueColor: 'text-purple-700',
  },
]

export default function SensorCard(props: SensorCardProps) {
  const [live, setLive] = useState<LiveReadings>({
    soilMoisture: props.soilMoisture,
    temperature: props.temperature,
    humidity: props.humidity,
    reservoirLevel: props.reservoirLevel,
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
            nitrogen: d.nitrogen !== undefined ? d.nitrogen : prev.nitrogen,
            phosphorus: d.phosphorus !== undefined ? d.phosphorus : prev.phosphorus,
            potassium: d.potassium !== undefined ? d.potassium : prev.potassium,
            lastSeen: payload.ts ?? prev.lastSeen,
            isOffline: false,
          }))
        } catch {
          // ignore
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
            nitrogen: data.nitrogen ?? null,
            phosphorus: data.phosphorus ?? null,
            potassium: data.potassium ?? null,
            lastSeen: data.timestamp,
            isOffline: data.isOffline ?? false,
          })
        } catch {
          // ignore
        }
      }

      poll()
      intervalRef.current = setInterval(poll, 10_000)

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
  }, [props.nodeId])

  // NPK only (the 4 primary sensors already appear in the overview row above)
  const npk = METRICS.slice(4)

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 border ${
        live.isOffline ? 'border-red-100' : 'border-gray-100'
      }`}
    >
      {/* Top gradient bar */}
      <div
        className={`h-1 w-full ${
          live.isOffline
            ? 'bg-gradient-to-r from-red-300 to-rose-400'
            : 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500'
        }`}
      />

      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-gray-900 font-bold text-base leading-tight truncate">
              {props.name}
            </h3>
            <ArrowUpRight size={14} className="text-gray-300 shrink-0" />
          </div>
          {props.zone && (
            <span className="text-gray-400 text-xs mt-0.5 block">{props.zone}</span>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            live.isOffline
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {live.isOffline ? (
            <WifiOff size={10} />
          ) : (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
          )}
          {live.isOffline ? 'Offline' : 'Online'}
        </span>
      </div>

      {/* Last seen */}
      <p className="text-[11px] text-gray-400 px-5 pb-3" suppressHydrationWarning>
        Last reading: {formatRelativeTime(live.lastSeen)}
      </p>

      {/* Node ID */}
      <p className="text-[10px] text-gray-300 px-5 pb-3 font-mono truncate">
        ID: {props.nodeId}
      </p>

      {/* NPK soil nutrient readings */}
      <div className="border-t border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 pt-2.5 pb-1">
          Soil Nutrients (NPK)
        </p>
        <div className="grid grid-cols-3 gap-px bg-gray-100">
          {npk.map(({ key, label, unit, icon: Icon, bg, color, valueColor }) => {
            const value = live[key]
            return (
              <div key={key} className="bg-white px-3 py-2.5 flex flex-col items-center gap-1">
                <div className={`${bg} p-1.5 rounded-lg`}>
                  <Icon size={12} className={color} />
                </div>
                <p className="text-[10px] text-gray-400 font-medium text-center">
                  {label.split(' ')[0]}
                </p>
                <p className={`text-xs font-bold tabular-nums ${valueColor}`}>
                  {value != null ? `${typeof value === 'number' ? value.toFixed(0) : value}` : '—'}
                </p>
                <p className="text-[9px] text-gray-300">{unit}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
