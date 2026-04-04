'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'

export interface TimeRangePickerProps {
  onRangeChange: (start: Date, end: Date) => void
}

type Preset = '24h' | '7d' | '30d' | 'Custom'

const PRESETS: Preset[] = ['24h', '7d', '30d', 'Custom']

function presetDurationMs(preset: Exclude<Preset, 'Custom'>): number {
  switch (preset) {
    case '24h': return 24 * 60 * 60 * 1000
    case '7d':  return 7  * 24 * 60 * 60 * 1000
    case '30d': return 30 * 24 * 60 * 60 * 1000
  }
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

export default function TimeRangePicker({ onRangeChange }: TimeRangePickerProps) {
  const [active, setActive] = useState<Preset>('24h')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')

  function handlePreset(preset: Preset) {
    setActive(preset)
    if (preset !== 'Custom') {
      const end = new Date()
      const start = new Date(end.getTime() - presetDurationMs(preset))
      onRangeChange(start, end)
    }
  }

  function handleCustomChange(start: string, end: string) {
    if (start && end) {
      const startDate = new Date(start)
      const endDate = new Date(end)
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        onRangeChange(startDate, endDate)
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active === preset
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {active === 'Custom' && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <Calendar size={11} /> Start
            </label>
            <input
              type="datetime-local"
              value={customStart}
              max={customEnd || toDatetimeLocal(new Date())}
              onChange={(e) => {
                setCustomStart(e.target.value)
                handleCustomChange(e.target.value, customEnd)
              }}
              className="bg-white border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <Calendar size={11} /> End
            </label>
            <input
              type="datetime-local"
              value={customEnd}
              min={customStart}
              max={toDatetimeLocal(new Date())}
              onChange={(e) => {
                setCustomEnd(e.target.value)
                handleCustomChange(customStart, e.target.value)
              }}
              className="bg-white border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
