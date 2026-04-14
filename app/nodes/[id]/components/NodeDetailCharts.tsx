'use client'

import { useState } from 'react'
import TimeRangePicker from './TimeRangePicker'
import TimeSeriesChart, { type Reading } from './TimeSeriesChart'
import AllSensorsChart from './AllSensorsChart'
import ClassificationPanel from './ClassificationPanel'
import { LayoutGrid, Activity, ChevronDown, ChevronUp } from 'lucide-react'

interface NodeDetailChartsProps {
  nodeId: string
  initialReadings: Reading[]
}

const METRICS: Array<{
  key: 'soilMoisture' | 'temperature' | 'humidity' | 'reservoirLevel' | 'ph'
  title: string
  unit: string
  color: string
}> = [
  { key: 'soilMoisture', title: 'Soil Moisture', unit: '%',  color: '#10b981' },
  { key: 'temperature',  title: 'Temperature',   unit: '°C', color: '#f59e0b' },
  { key: 'humidity',     title: 'Humidity',       unit: '%',  color: '#38bdf8' },
  { key: 'reservoirLevel', title: 'Reservoir Level', unit: 'cm', color: '#818cf8' },
  { key: 'ph',           title: 'pH',             unit: 'pH', color: '#fb7185' },
]

type ViewMode = 'combined' | 'individual'

export default function NodeDetailCharts({ nodeId, initialReadings }: NodeDetailChartsProps) {
  const [readings, setReadings] = useState<Reading[]>(initialReadings)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ViewMode>('combined')
  const [showClassification, setShowClassification] = useState(true)

  async function handleRangeChange(start: Date, end: Date) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      })
      const res = await fetch(`/api/nodes/${nodeId}/readings?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReadings(data.readings ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TimeRangePicker onRangeChange={handleRangeChange} />

        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600">
              <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Loading…
            </div>
          )}

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setView('combined')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'combined'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Activity size={13} />
              Combined
            </button>
            <button
              onClick={() => setView('individual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'individual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid size={13} />
              Individual
            </button>
          </div>
        </div>
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      {view === 'combined' ? (
        /* Full-width combined multi-sensor chart */
        <AllSensorsChart readings={readings} />
      ) : (
        /* Individual per-sensor charts in a 2-col grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {METRICS.map(({ key, title, unit, color }) => (
            <TimeSeriesChart
              key={key}
              readings={readings}
              metric={key}
              title={title}
              unit={unit}
              color={color}
            />
          ))}
        </div>
      )}

      {/* ── Classification & Correlation ────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Collapsible header */}
        <button
          onClick={() => setShowClassification((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div>
            <h3 className="text-gray-900 font-semibold text-base text-left">
              Sensor Classification &amp; Calibration Reference
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 text-left">
              Assignment §9 — conversion formulas · calibration reference values · sensor correlations
            </p>
          </div>
          {showClassification
            ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
            : <ChevronDown size={16} className="text-gray-400 shrink-0" />
          }
        </button>

        {showClassification && (
          <div className="border-t border-gray-100">
            <ClassificationPanel readings={readings} />
          </div>
        )}
      </div>
    </div>
  )
}
