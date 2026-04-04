'use client'

import { useEffect, useRef, useState } from 'react'
import { Power, Zap, Clock, RefreshCw } from 'lucide-react'

export interface PumpControlPanelProps {
  initialState?: 'on' | 'off' | 'unknown'
  initialSource?: string
  initialAutoEnabled?: boolean
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export default function PumpControlPanel({
  initialState = 'unknown',
  initialSource = 'manual',
  initialAutoEnabled = false,
}: PumpControlPanelProps) {
  const [pumpState, setPumpState] = useState<'on' | 'off' | 'unknown'>(initialState)
  const [source, setSource] = useState(initialSource)
  const [autoEnabled, setAutoEnabled] = useState(initialAutoEnabled)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (pumpState === 'on') {
      if (startTimeRef.current === null) startTimeRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        setElapsedMs(Date.now() - (startTimeRef.current ?? Date.now()))
      }, 1000)
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      startTimeRef.current = null
      setElapsedMs(0)
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [pumpState])

  async function handleTogglePump() {
    const action = pumpState === 'on' ? 'off' : 'on'
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Pump command failed')
      } else {
        setPumpState(data.state)
        setSource(data.source ?? 'manual')
        if (data.state === 'on') startTimeRef.current = Date.now() - (data.elapsedMs ?? 0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAuto() {
    setAutoLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pump/auto', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !autoEnabled }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to toggle auto mode')
      } else {
        setAutoEnabled(data.enabled ?? !autoEnabled)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setAutoLoading(false)
    }
  }

  const isOn = pumpState === 'on'
  const isOff = pumpState === 'off'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="bg-emerald-50 p-2 rounded-lg">
          <Power size={18} className="text-emerald-600" />
        </div>
        <h2 className="text-gray-900 font-semibold text-base">Pump Control</h2>
      </div>

      {/* State indicator */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            isOn ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : isOff ? 'bg-red-400' : 'bg-gray-400'
          }`}
          aria-hidden="true"
        />
        <span className="text-sm text-gray-700">
          Pump status:{' '}
          <span className={`font-semibold ${isOn ? 'text-emerald-600' : isOff ? 'text-red-500' : 'text-gray-500'}`}>
            {isOn ? 'Running' : isOff ? 'Stopped' : 'Unknown'}
          </span>
        </span>
      </div>

      {/* Source & elapsed */}
      <div className="flex flex-col gap-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Zap size={12} className="text-gray-400" />
          <span>Source: <span className="text-gray-700 capitalize font-medium">{source}</span></span>
        </div>
        {isOn && (
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-gray-400" />
            <span>Running for: <span className="text-gray-700 font-mono font-medium">{formatElapsed(elapsedMs)}</span></span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleTogglePump}
          disabled={loading || pumpState === 'unknown'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isOn
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <Power size={14} />
          {loading ? 'Sending…' : isOn ? 'Turn Off' : 'Turn On'}
        </button>

        <button
          onClick={handleToggleAuto}
          disabled={autoLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${
            autoEnabled
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <RefreshCw size={14} />
          {autoLoading ? 'Updating…' : autoEnabled ? 'Auto: ON' : 'Auto: OFF'}
        </button>
      </div>
    </div>
  )
}
