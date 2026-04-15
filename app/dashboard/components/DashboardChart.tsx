'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  Activity,
  BarChart2,
  Droplets,
  Thermometer,
  Wind,
  Waves,
  Leaf,
  Atom,
  Zap,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'

// ─── Sensor line definitions ──────────────────────────────────────────────────
interface SensorLine {
  key: string
  label: string
  unit: string
  color: string
  Icon: LucideIcon
  yAxisId: string
}

const SENSOR_LINES: SensorLine[] = [
  { key: 'soilMoisture',   label: 'Soil Moisture',  unit: '%',     color: '#10b981', Icon: Droplets,    yAxisId: 'pct'  },
  { key: 'temperature',    label: 'Temperature',    unit: '°C',    color: '#f97316', Icon: Thermometer, yAxisId: 'temp' },
  { key: 'humidity',       label: 'Humidity',       unit: '%',     color: '#38bdf8', Icon: Wind,        yAxisId: 'pct'  },
  { key: 'reservoirLevel', label: 'Reservoir',      unit: '%',     color: '#818cf8', Icon: Waves,       yAxisId: 'level'},
  { key: 'nitrogen',       label: 'Nitrogen',       unit: 'mg/kg', color: '#84cc16', Icon: Leaf,        yAxisId: 'npk'  },
  { key: 'phosphorus',     label: 'Phosphorus',     unit: 'mg/kg', color: '#f59e0b', Icon: Atom,        yAxisId: 'npk'  },
  { key: 'potassium',      label: 'Potassium',      unit: 'mg/kg', color: '#f43f5e', Icon: Zap,         yAxisId: 'npk'  },
]

// ─── Time-range options ───────────────────────────────────────────────────────
const RANGES = [
  { label: '1 h',  hours: 1   },
  { label: '6 h',  hours: 6   },
  { label: '12 h', hours: 12  },
  { label: '24 h', hours: 24  },
  { label: '7 d',  hours: 168 },
]

// ─── Types ────────────────────────────────────────────────────────────────────
interface Reading {
  timestamp: string
  soilMoisture?: number | null
  temperature?: number | null
  humidity?: number | null
  reservoirLevel?: number | null
  nitrogen?: number | null
  phosphorus?: number | null
  potassium?: number | null
}

interface DashboardChartProps {
  nodeId: string
  nodeName: string
  initialReadings: Reading[]
  isMockData?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtX(ts: string, rangeHours: number): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  if (rangeHours <= 24) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// ─── Custom tooltip (plain function — no hooks) ───────────────────────────────
interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = new Date(label as string)
  const timeStr = isNaN(d.getTime()) ? String(label) : d.toLocaleString()

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-4 min-w-[180px]">
      <p className="text-xs text-gray-400 font-medium mb-2.5">{timeStr}</p>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry) => {
          const cfg = SENSOR_LINES.find((s) => s.label === entry.name || s.key === entry.name)
          if (!cfg) return null
          return (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-gray-600">{cfg.label}</span>
              </div>
              <span className="text-xs font-bold text-gray-900 tabular-nums">
                {entry.value != null ? Number(entry.value).toFixed(1) : '—'}{' '}
                <span className="font-normal text-gray-400">{cfg.unit}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardChart({
  nodeId,
  nodeName,
  initialReadings,
  isMockData = false,
}: DashboardChartProps) {
  // Keep full 24-h mock data in a ref so we can slice it for shorter ranges
  const fullMockRef = useRef<Reading[]>(initialReadings)

  const [readings, setReadings] = useState<Reading[]>(initialReadings)
  const [activeHours, setActiveHours] = useState(24)
  const [loading, setLoading] = useState(false)
  const [visibleSensors, setVisibleSensors] = useState<Set<string>>(
    new Set(SENSOR_LINES.map((s) => s.key))
  )

  const fetchReadings = useCallback(
    async (hours: number) => {
      if (isMockData) {
        // For mock mode: slice the full 24-h data to the requested window
        setLoading(true)
        setTimeout(() => {
          const full = fullMockRef.current
          if (full.length === 0) { setLoading(false); return }
          const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).getTime()
          const sliced = full.filter((r) => new Date(r.timestamp).getTime() >= cutoff)
          setReadings(sliced.length > 0 ? sliced : full.slice(-20))
          setLoading(false)
        }, 250)
        return
      }
      // Real DB fetch
      setLoading(true)
      try {
        const end = new Date()
        const start = new Date(end.getTime() - hours * 60 * 60 * 1000)
        const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() })
        const res = await fetch(`/api/nodes/${nodeId}/readings?${params}`)
        if (res.ok) {
          const data = await res.json()
          setReadings(data.readings ?? [])
        }
      } finally {
        setLoading(false)
      }
    },
    [nodeId, isMockData]
  )

  function handleRange(hours: number) {
    setActiveHours(hours)
    fetchReadings(hours)
  }

  function toggleSensor(key: string) {
    setVisibleSensors((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const chartData = useMemo(
    () => readings.map((r) => ({
      ts: r.timestamp,
      soilMoisture:   r.soilMoisture   ?? null,
      temperature:    r.temperature    ?? null,
      humidity:       r.humidity       ?? null,
      reservoirLevel: r.reservoirLevel ?? null,
      nitrogen:       r.nitrogen       ?? null,
      phosphorus:     r.phosphorus     ?? null,
      potassium:      r.potassium      ?? null,
    })),
    [readings]
  )

  const isEmpty = readings.length === 0

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Rainbow accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-sky-400 via-indigo-400 to-purple-500" />

      <div className="px-6 pt-5 pb-5">

        {/* ── Title ───────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-sm">
              <BarChart2 size={17} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-gray-900 font-bold text-lg leading-tight">
                  Multi-Sensor Time-Series
                </h2>
                {isMockData && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wide">
                    Mock Data
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {isMockData
                  ? 'Simulated sensor data — auto-switches to DB once sensors connect'
                  : `Node: ${nodeName}`}
                {' · '}
                {readings.length.toLocaleString()} data points · timestamps synchronized
              </p>
            </div>
          </div>

          {/* Time range + refresh */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {RANGES.map((r) => (
              <button
                key={r.hours}
                onClick={() => handleRange(r.hours)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeHours === r.hours
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => fetchReadings(activeHours)}
              disabled={loading}
              className="p-1.5 rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Sensor toggle chips ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SENSOR_LINES.map(({ key, label, color, Icon }) => {
            const active = visibleSensors.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleSensor(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={
                  active
                    ? { backgroundColor: color, borderColor: color, color: '#fff' }
                    : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }
                }
              >
                <Icon size={11} />
                {label}
              </button>
            )
          })}
        </div>

        {/* ── Axis legend strip ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-mono">
            Y-Left: % — Moisture &amp; Humidity
          </span>
          <span className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2 py-1 rounded-lg font-mono">
            Y-Right: °C — Temperature
          </span>
          <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-mono">
            % — Reservoir
          </span>
          <span className="flex items-center gap-1.5 bg-lime-50 text-lime-700 px-2 py-1 rounded-lg font-mono">
            mg/kg — N · P · K
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            X-Axis: Timestamp
          </span>
        </div>

        {/* ── Chart ───────────────────────────────────────────────────────────── */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-72 gap-3 text-gray-300">
            <Activity size={36} />
            <p className="text-sm font-medium">No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 60, left: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />

              {/* X — Time */}
              <XAxis
                dataKey="ts"
                tickFormatter={(ts) => fmtX(ts, activeHours)}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                label={{ value: 'Time →', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#9ca3af' }}
              />

              {/* Y Left — % */}
              <YAxis
                yAxisId="pct"
                orientation="left"
                domain={[0, 100]}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                width={46}
                tickFormatter={(v) => `${v}%`}
                label={{ value: '% (Moisture · Hum)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: '#10b981' }}
              />

              {/* Y Right — °C */}
              <YAxis
                yAxisId="temp"
                orientation="right"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                width={44}
                tickFormatter={(v) => `${v}°`}
                label={{ value: '°C', angle: 90, position: 'insideRight', offset: -4, fontSize: 11, fill: '#f97316' }}
              />

              {/* Hidden axes for reservoir and NPK */}
              <YAxis yAxisId="level" orientation="right" hide width={0} domain={[0, 100]} />
              <YAxis yAxisId="npk"   orientation="right" hide width={0} domain={[0, 1999]} />

              {/* Threshold reference lines */}
              <ReferenceLine yAxisId="pct"  y={40}  stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5}
                label={{ value: 'Moisture min 40%', position: 'insideTopLeft', fontSize: 9, fill: '#10b981' }} />
              <ReferenceLine yAxisId="temp" y={30}  stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5}
                label={{ value: '30°C optimal max', position: 'insideTopRight', fontSize: 9, fill: '#f97316' }} />

              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 14 }} iconType="circle" iconSize={8} />

              {/* Sensor lines */}
              {SENSOR_LINES.filter((s) => visibleSensors.has(s.key)).map(({ key, label, color, yAxisId }) => (
                <Line
                  key={key}
                  yAxisId={yAxisId}
                  type="monotone"
                  dataKey={key}
                  name={label}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between gap-4 flex-wrap text-xs text-gray-400">
          <div className="flex items-center gap-3 flex-wrap">
            <span>Range: <span className="font-semibold text-gray-600">{RANGES.find((r) => r.hours === activeHours)?.label}</span></span>
            <span>X-Axis: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">timestamp</code> (synchronized)</span>
          </div>
          <span className="font-mono">{readings.length.toLocaleString()} records shown</span>
        </div>
      </div>
    </div>
  )
}
