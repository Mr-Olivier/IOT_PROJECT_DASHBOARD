'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Droplets,
  Thermometer,
  Wind,
  Waves,
  FlaskConical,
  Leaf,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from 'lucide-react'
import { type Reading } from './TimeSeriesChart'

// ─── Per-metric config ────────────────────────────────────────────────────────
interface Band {
  max: number
  label: string
  color: string
  bg: string
  textColor: string
}

interface MetricConfig {
  key: keyof Reading
  label: string
  unit: string
  Icon: LucideIcon
  gradient: string   // tw gradient utility
  iconBg: string
  iconColor: string
  validMin: number
  validMax: number
  bands: Band[]
}

const METRICS: MetricConfig[] = [
  {
    key: 'soilMoisture',
    label: 'Soil Moisture',
    unit: '%',
    Icon: Droplets,
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    validMin: 0,
    validMax: 100,
    bands: [
      { max: 20,  label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 40,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 70,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 85,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 100, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    Icon: Thermometer,
    gradient: 'from-orange-500 to-red-500',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    validMin: -40,
    validMax: 80,
    bands: [
      { max: 10,  label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 18,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 30,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 38,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 80,  label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'humidity',
    label: 'Humidity',
    unit: '%',
    Icon: Wind,
    gradient: 'from-sky-500 to-blue-600',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    validMin: 0,
    validMax: 100,
    bands: [
      { max: 30,  label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 45,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 75,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 85,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 100, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'reservoirLevel',
    label: 'Reservoir Level',
    unit: 'cm',
    Icon: Waves,
    gradient: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    validMin: 0,
    validMax: 400,
    bands: [
      { max: 5,   label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 15,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 35,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 50,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 400, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'ph',
    label: 'pH Level',
    unit: '',
    Icon: FlaskConical,
    gradient: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    validMin: 0,
    validMax: 14,
    bands: [
      { max: 4.5, label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 5.5, label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 7.5, label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 8.5, label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 14,  label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'nitrogen',
    label: 'Nitrogen (N)',
    unit: 'mg/kg',
    Icon: Leaf,
    gradient: 'from-lime-500 to-green-600',
    iconBg: 'bg-lime-50',
    iconColor: 'text-lime-600',
    validMin: 0,
    validMax: 1999,
    bands: [
      { max: 50,   label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 100,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 300,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 600,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 1999, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'phosphorus',
    label: 'Phosphorus (P)',
    unit: 'mg/kg',
    Icon: Leaf,
    gradient: 'from-orange-400 to-amber-600',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    validMin: 0,
    validMax: 1999,
    bands: [
      { max: 25,   label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 50,   label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 150,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 400,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 1999, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'potassium',
    label: 'Potassium (K)',
    unit: 'mg/kg',
    Icon: Leaf,
    gradient: 'from-purple-500 to-fuchsia-600',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    validMin: 0,
    validMax: 1999,
    bands: [
      { max: 100,  label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 200,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 500,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 800,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 1999, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function classify(value: number, bands: Band[]): Band {
  for (const b of bands) {
    if (value <= b.max) return b
  }
  return bands[bands.length - 1]
}

function fillPct(value: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

type TrendDir = 'up' | 'down' | 'flat'
function trendOf(readings: Reading[], key: keyof Reading): TrendDir {
  if (readings.length < 5) return 'flat'
  const recent = readings.slice(-5).map((r) => r[key] as number | null | undefined)
  const valid = recent.filter((v): v is number => v != null)
  if (valid.length < 2) return 'flat'
  const delta = valid[valid.length - 1] - valid[0]
  if (Math.abs(delta) < 0.5) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

// ─── Individual Metric Card ───────────────────────────────────────────────────
interface MetricCardProps {
  cfg: MetricConfig
  value: number | null | undefined
  readings: Reading[]
  liveValue?: number | null
}

function MetricCard({ cfg, value: initialValue, readings, liveValue }: MetricCardProps) {
  const value = liveValue !== undefined ? liveValue : initialValue
  const band = value != null ? classify(value, cfg.bands) : null
  const trend = trendOf(readings, cfg.key)

  // compute min/max from readings
  const nums = readings
    .map((r) => r[cfg.key] as number | null | undefined)
    .filter((v): v is number => v != null)
  const minVal = nums.length ? Math.min(...nums) : null
  const maxVal = nums.length ? Math.max(...nums) : null
  const fill = value != null ? fillPct(value, cfg.validMin, cfg.validMax) : 0

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  const trendColor =
    trend === 'up'
      ? 'text-emerald-500'
      : trend === 'down'
      ? 'text-red-400'
      : 'text-gray-400'

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* Gradient top bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.gradient}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className={`${cfg.iconBg} p-2.5 rounded-xl`}>
            <cfg.Icon size={18} className={cfg.iconColor} />
          </div>
          {band ? (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide"
              style={{ backgroundColor: band.bg, color: band.textColor }}
            >
              {band.label}
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 tracking-wide">
              NO DATA
            </span>
          )}
        </div>

        {/* Label */}
        <p className="text-xs text-gray-500 font-medium mb-1">{cfg.label}</p>

        {/* Value */}
        <div className="flex items-end gap-1.5 mb-3">
          <span className="text-3xl font-bold text-gray-900 leading-none tabular-nums">
            {value != null ? value.toFixed(1) : '—'}
          </span>
          {cfg.unit && (
            <span className="text-sm text-gray-400 mb-0.5">{cfg.unit}</span>
          )}
          <TrendIcon size={14} className={`${trendColor} ml-1 mb-1`} />
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${cfg.gradient} transition-all duration-500`}
            style={{ width: `${fill}%` }}
          />
        </div>

        {/* Min / Max */}
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>
            Min{' '}
            <span className="font-semibold text-gray-600">
              {minVal != null ? minVal.toFixed(1) : '—'}
            </span>
          </span>
          <span>
            Max{' '}
            <span className="font-semibold text-gray-600">
              {maxVal != null ? maxVal.toFixed(1) : '—'}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
interface SensorMetricsRowProps {
  nodeId: string
  readings: Reading[]
}

export default function SensorMetricsRow({ nodeId, readings }: SensorMetricsRowProps) {
  const latest = readings.length > 0 ? readings[readings.length - 1] : null

  const [liveValues, setLiveValues] = useState<Partial<Record<string, number | null>>>({})

  useEffect(() => {
    if (typeof EventSource === 'undefined') return
    const es = new EventSource('/api/stream')
    es.addEventListener('reading', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.nodeId !== nodeId) return
        const d = payload.data
        setLiveValues((prev) => ({ ...prev, ...d }))
      } catch {
        // ignore
      }
    })
    return () => es.close()
  }, [nodeId])

  const primaryMetrics = METRICS.slice(0, 4)
  const secondaryMetrics = METRICS.slice(4)

  return (
    <div className="flex flex-col gap-4">
      {/* Primary 4 sensors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {primaryMetrics.map((cfg) => (
          <MetricCard
            key={String(cfg.key)}
            cfg={cfg}
            value={latest ? (latest[cfg.key] as number | null | undefined) : null}
            readings={readings}
            liveValue={liveValues[String(cfg.key)] as number | null | undefined}
          />
        ))}
      </div>

      {/* NPK + pH row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {secondaryMetrics.map((cfg) => (
          <MetricCard
            key={String(cfg.key)}
            cfg={cfg}
            value={latest ? (latest[cfg.key] as number | null | undefined) : null}
            readings={readings}
            liveValue={liveValues[String(cfg.key)] as number | null | undefined}
          />
        ))}
      </div>
    </div>
  )
}
