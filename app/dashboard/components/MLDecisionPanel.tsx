'use client'

import { useEffect, useState } from 'react'
import {
  Brain,
  Zap,
  Droplets,
  ShieldOff,
  Clock,
  TrendingUp,
  BarChart2,
  RefreshCw,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Decision {
  id:             string
  timestamp:      string
  nodeId:         string | null
  decision:       'IRRIGATE' | 'HOLD' | 'LOW_WATER'
  confidence:     number
  pumpCommand:    boolean
  soilMoisture:   number
  temperature:    number
  humidity:       number
  reservoirLevel: number
  modelVersion:   string
}

interface MLStatus {
  status:         string
  model_loaded:   boolean
  trainedAt?:     string
  recordCount?:   number
  modelVersion?:  string
  metrics?: {
    accuracy:  number
    precision: number
    recall:    number
    f1:        number
  }
  importances?: Record<string, number>
  classDistrib?: Record<string, number>
}

interface DecisionsResponse {
  latest:  Decision | null
  history: Decision[]
  counts:  { IRRIGATE: number; HOLD: number; LOW_WATER: number; total: number }
}

// ---------------------------------------------------------------------------
// Config constants
// ---------------------------------------------------------------------------

const DECISION_CONFIG = {
  IRRIGATE: {
    label:     'IRRIGATE',
    tagline:   'Soil is dry — pump is ON',
    icon:      Droplets,
    bg:        'from-blue-500 to-cyan-500',
    lightBg:   'bg-blue-50',
    border:    'border-blue-200',
    text:      'text-blue-700',
    badge:     'bg-blue-100 text-blue-700',
    pulse:     'bg-blue-400',
    pumpColor: 'text-blue-600',
  },
  HOLD: {
    label:     'HOLD',
    tagline:   'Soil moisture is sufficient',
    icon:      ShieldOff,
    bg:        'from-emerald-500 to-teal-500',
    lightBg:   'bg-emerald-50',
    border:    'border-emerald-200',
    text:      'text-emerald-700',
    badge:     'bg-emerald-100 text-emerald-700',
    pulse:     'bg-emerald-400',
    pumpColor: 'text-emerald-600',
  },
  LOW_WATER: {
    label:     'LOW WATER',
    tagline:   'Reservoir too low — pump held off',
    icon:      ShieldOff,
    bg:        'from-amber-500 to-orange-500',
    lightBg:   'bg-amber-50',
    border:    'border-amber-200',
    text:      'text-amber-700',
    badge:     'bg-amber-100 text-amber-700',
    pulse:     'bg-amber-400',
    pumpColor: 'text-amber-600',
  },
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number, decimals = 1) {
  return n.toFixed(decimals)
}

function relTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)  return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function sortedImportances(imp: Record<string, number>): [string, number][] {
  return Object.entries(imp).sort((a, b) => b[1] - a[1])
}

const FEATURE_LABELS: Record<string, string> = {
  soilMoisture:   'Soil Moisture',
  temperature:    'Temperature',
  humidity:       'Humidity',
  reservoirLevel: 'Reservoir',
  nitrogen:       'Nitrogen',
  phosphorus:     'Phosphorus',
  potassium:      'Potassium',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-xl border ${color}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-base font-extrabold tabular-nums">{value}</span>
    </div>
  )
}

function DecisionHistoryBar({ history }: { history: Decision[] }) {
  const items = [...history].reverse().slice(-30)
  return (
    <div className="flex items-end gap-0.5 h-8 w-full">
      {items.map((d, i) => {
        const cfg = DECISION_CONFIG[d.decision] ?? DECISION_CONFIG.HOLD
        const height = Math.max(20, Math.round(d.confidence * 100))
        return (
          <div
            key={d.id}
            title={`${d.decision} — ${fmt(d.confidence * 100, 0)}% @ ${new Date(d.timestamp).toLocaleTimeString()}`}
            className={`flex-1 rounded-sm bg-gradient-to-t ${cfg.bg} opacity-80 hover:opacity-100 transition-opacity cursor-default`}
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  initialDecisions: DecisionsResponse | null
  initialStatus:    MLStatus | null
}

export default function MLDecisionPanel({ initialDecisions, initialStatus }: Props) {
  const [decisions, setDecisions] = useState<DecisionsResponse | null>(initialDecisions)
  const [mlStatus,  setMlStatus]  = useState<MLStatus | null>(initialStatus)
  const [retraining, setRetraining] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  // Refresh every 3 seconds — decisions arrive every 2s from the bridge
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [dr, sr] = await Promise.all([
          fetch('/api/decisions').then((r) => r.json()),
          fetch('http://localhost:5001/status').then((r) => r.json()).catch(() => null),
        ])
        setDecisions(dr)
        if (sr) setMlStatus(sr)
        setLastRefresh(Date.now())
      } catch {
        // silently ignore — stale data stays
      }
    }, 3000)
    return () => clearInterval(id)
  }, [])

  const handleRetrain = async () => {
    setRetraining(true)
    try {
      const r = await fetch('http://localhost:5001/train', { method: 'POST' })
      if (r.ok) {
        const data = await r.json()
        setMlStatus((prev) => ({ ...prev, ...data, status: 'ready', model_loaded: true }))
      }
    } catch {
      // ML service might not be running
    } finally {
      setRetraining(false)
    }
  }

  const latest   = decisions?.latest ?? null
  const history  = decisions?.history ?? []
  const counts   = decisions?.counts
  const cfg      = latest ? (DECISION_CONFIG[latest.decision] ?? DECISION_CONFIG.HOLD) : null
  const metrics  = mlStatus?.metrics
  const imps     = mlStatus?.importances

  return (
    <div className="space-y-4">

      {/* ── Top row: current decision card + model stats ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Current decision — full-width card */}
        <div className="lg:col-span-2">
          {latest && cfg ? (
            <div className={`bg-white border ${cfg.border} rounded-2xl p-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">

                {/* Left: icon + decision name */}
                <div className="flex items-center gap-4">
                  <div className={`bg-gradient-to-br ${cfg.bg} p-3.5 rounded-2xl shadow-md shrink-0`}>
                    <cfg.icon size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                      Current ML Decision
                    </p>
                    <h3 className={`text-2xl font-extrabold tracking-tight ${cfg.text}`}>
                      {cfg.label}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{cfg.tagline}</p>
                  </div>
                </div>

                {/* Right: confidence + pump */}
                <div className="flex flex-col items-end gap-2">
                  <div className={`${cfg.lightBg} ${cfg.text} border ${cfg.border} px-3 py-1.5 rounded-full text-sm font-bold`}>
                    {fmt(latest.confidence * 100, 0)}% confidence
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      {latest.pumpCommand && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.pulse} opacity-75`} />
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${latest.pumpCommand ? cfg.pulse : 'bg-gray-300'}`} />
                    </span>
                    <span className={`text-xs font-bold ${latest.pumpCommand ? cfg.pumpColor : 'text-gray-400'}`}>
                      Pump {latest.pumpCommand ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sensor values that triggered this decision */}
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Soil',     value: `${fmt(latest.soilMoisture)}%`,   unit: '' },
                  { label: 'Temp',     value: `${fmt(latest.temperature)}`,     unit: '°C' },
                  { label: 'Humidity', value: `${fmt(latest.humidity)}%`,       unit: '' },
                  { label: 'Reservoir',value: `${fmt(latest.reservoirLevel)}%`, unit: '' },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-2">
                    <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
                    <p className="text-sm font-extrabold text-gray-700 tabular-nums">
                      {s.value}{s.unit}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  <span suppressHydrationWarning>{relTime(latest.timestamp)}</span>
                </span>
                <span>model: {latest.modelVersion}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 shadow-sm min-h-[160px]">
              <Brain size={32} className="text-gray-200" />
              <p className="text-sm font-medium text-gray-400">
                No decisions yet — start the ML service and serial bridge
              </p>
              <p className="text-xs text-gray-300">
                python ml_service/main.py &nbsp;·&nbsp; python serial_bridge/bridge.py
              </p>
            </div>
          )}
        </div>

        {/* Model performance card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-violet-50 p-2 rounded-xl">
                <TrendingUp size={16} className="text-violet-500" />
              </div>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Model Performance
              </span>
            </div>
            <button
              onClick={handleRetrain}
              disabled={retraining}
              title="Retrain model on latest data"
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={13} className={`text-gray-400 ${retraining ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {metrics ? (
            <div className="grid grid-cols-2 gap-2">
              <MetricBadge label="Accuracy"  value={`${(metrics.accuracy  * 100).toFixed(1)}%`} color="bg-violet-50 border-violet-100 text-violet-700" />
              <MetricBadge label="F1 Score"  value={`${(metrics.f1        * 100).toFixed(1)}%`} color="bg-sky-50 border-sky-100 text-sky-700" />
              <MetricBadge label="Precision" value={`${(metrics.precision * 100).toFixed(1)}%`} color="bg-emerald-50 border-emerald-100 text-emerald-700" />
              <MetricBadge label="Recall"    value={`${(metrics.recall    * 100).toFixed(1)}%`} color="bg-teal-50 border-teal-100 text-teal-700" />
            </div>
          ) : (
            <p className="text-xs text-gray-300 text-center py-4">
              {mlStatus?.status === 'untrained' ? 'Model not trained yet' : 'ML service offline'}
            </p>
          )}

          {mlStatus?.trainedAt && (
            <div className="text-[10px] text-gray-400 border-t pt-3 space-y-1">
              <div className="flex justify-between">
                <span>Trained at</span>
                <span className="font-medium">{new Date(mlStatus.trainedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Records used</span>
                <span className="font-medium">{(mlStatus.recordCount ?? 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: history timeline + feature importances ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Decision history */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-sky-50 p-2 rounded-xl">
                <BarChart2 size={16} className="text-sky-500" />
              </div>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Decision History
              </span>
            </div>
            <span className="text-[10px] text-gray-300">last 30 decisions</span>
          </div>

          {history.length > 0 ? (
            <>
              <DecisionHistoryBar history={history} />
              <div className="mt-3 flex items-center justify-center gap-4">
                {(['IRRIGATE', 'HOLD', 'LOW_WATER'] as const).map((k) => {
                  const c = DECISION_CONFIG[k]
                  return (
                    <div key={k} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-sm bg-gradient-to-br ${c.bg}`} />
                      <span className="text-[10px] text-gray-500">{c.label}</span>
                    </div>
                  )
                })}
              </div>

              {counts && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {([
                    { key: 'IRRIGATE'  as const, label: 'Irrigate' },
                    { key: 'HOLD'      as const, label: 'Hold' },
                    { key: 'LOW_WATER' as const, label: 'Low Water' },
                  ]).map(({ key, label }) => {
                    const c   = DECISION_CONFIG[key]
                    const pct = counts.total > 0
                      ? Math.round((counts[key] / counts.total) * 100)
                      : 0
                    return (
                      <div key={key} className={`${c.lightBg} border ${c.border} rounded-xl p-2`}>
                        <p className={`text-[10px] font-semibold ${c.text}`}>{label}</p>
                        <p className={`text-lg font-extrabold tabular-nums ${c.text}`}>{counts[key].toLocaleString()}</p>
                        <p className={`text-[10px] ${c.text} opacity-70`}>{pct}%</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-16">
              <p className="text-xs text-gray-300">No decisions recorded yet</p>
            </div>
          )}
        </div>

        {/* Feature importances */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-orange-50 p-2 rounded-xl">
              <Zap size={16} className="text-orange-500" />
            </div>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Feature Importance
            </span>
            <span className="text-[10px] text-gray-300 ml-auto">
              which sensor matters most to the model
            </span>
          </div>

          {imps ? (
            <div className="space-y-2.5">
              {sortedImportances(imps).map(([feature, imp]) => {
                const pct  = Math.round(imp * 100)
                const rank = sortedImportances(imps).findIndex(([f]) => f === feature)
                const colors = [
                  'from-violet-500 to-purple-400',
                  'from-sky-500 to-cyan-400',
                  'from-emerald-500 to-teal-400',
                  'from-orange-500 to-amber-400',
                  'from-rose-500 to-pink-400',
                  'from-indigo-500 to-blue-400',
                  'from-lime-500 to-green-400',
                ]
                const bar = colors[rank % colors.length]
                return (
                  <div key={feature} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 shrink-0 truncate">
                      {FEATURE_LABELS[feature] ?? feature}
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-600 tabular-nums w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24">
              <p className="text-xs text-gray-300">Feature data unavailable — is the ML service running?</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
