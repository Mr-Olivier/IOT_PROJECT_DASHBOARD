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
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-gray-700 font-medium text-sm mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
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
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-gray-700 font-medium text-sm mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="ts"
            tickFormatter={(ts) => formatXAxis(ts, rangeMs)}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
            width={40}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              color: '#111827',
              fontSize: 12,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelFormatter={(ts) => formatTooltipLabel(ts)}
            formatter={(value: number) => [`${value} ${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
