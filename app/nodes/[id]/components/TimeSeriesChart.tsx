'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export type SensorMetric =
  | 'soilMoisture'
  | 'temperature'
  | 'humidity'
  | 'reservoirLevel'
  | 'ph'

export interface Reading {
  timestamp?: string
  bucket?: string
  soilMoisture?: number
  temperature?: number
  humidity?: number
  reservoirLevel?: number
  ph?: number
  nitrogen?: number | null
  phosphorus?: number | null
  potassium?: number | null
}

export interface TimeSeriesChartProps {
  readings: Reading[]
  metric: SensorMetric
  title: string
  unit: string
  color?: string
}

function getTimestamp(reading: Reading): string {
  return reading.bucket ?? reading.timestamp ?? ''
}

function formatXAxis(ts: string, rangeMs: number): string {
  if (!ts) return ''
  const date = new Date(ts)
  if (isNaN(date.getTime())) return ts
  const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000
  if (rangeMs <= FORTY_EIGHT_HOURS) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function formatTooltipLabel(ts: string): string {
  if (!ts) return ''
  const date = new Date(ts)
  if (isNaN(date.getTime())) return ts
  return date.toLocaleString()
}

export default function TimeSeriesChart({
  readings,
  metric,
  title,
  unit,
  color = '#10b981',
}: TimeSeriesChartProps) {
  if (readings.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-gray-700 font-semibold text-sm mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
          No data available for this period
        </div>
      </div>
    )
  }

  const timestamps = readings
    .map((r) => getTimestamp(r))
    .filter(Boolean)
    .map((ts) => new Date(ts).getTime())
    .filter((t) => !isNaN(t))

  const rangeMs =
    timestamps.length >= 2
      ? Math.max(...timestamps) - Math.min(...timestamps)
      : 0

  const data = readings.map((r) => ({
    ts: getTimestamp(r),
    value: r[metric],
  }))

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      {/* Card header with gradient accent */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-gray-800 font-semibold text-sm">{title}</h3>
        <span className="ml-auto text-xs text-gray-400">
          {readings.length.toLocaleString()} pts
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="ts"
            tickFormatter={(ts) => formatXAxis(ts, rangeMs)}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #f3f4f6',
              borderRadius: '12px',
              color: '#111827',
              fontSize: 12,
              boxShadow: '0 8px 24px 0 rgba(0,0,0,0.08)',
            }}
            labelFormatter={(ts) => formatTooltipLabel(ts)}
            formatter={(value: number) => [`${value} ${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
