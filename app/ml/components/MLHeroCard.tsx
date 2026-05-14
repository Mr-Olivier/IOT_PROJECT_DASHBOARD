'use client'

import { useState, useEffect } from 'react'
import { Droplets, ShieldOff, AlertTriangle, Clock, Cpu } from 'lucide-react'

type Decision = 'IRRIGATE' | 'HOLD' | 'LOW_WATER'

interface LatestDecision {
  id: string
  timestamp: string
  nodeId: string | null
  decision: string
  confidence: number
  pumpCommand: boolean
  soilMoisture: number
  temperature: number
  humidity: number
  reservoirLevel: number
  modelVersion: string
}

interface MLStatus {
  status: string
  model_loaded: boolean
  trainedAt?: string
  metrics?: { accuracy: number; precision: number; recall: number; f1: number }
}

interface Props {
  latest: LatestDecision | null
  mlStatus: MLStatus | null
}

const CONFIG: Record<Decision, {
  icon: typeof Droplets
  bg: string
  gradientCard: string
  text: string
  subtext: string
  border: string
  lightBg: string
  badge: string
  pulseDot: string
  tagline: string
  description: string
}> = {
  IRRIGATE: {
    icon:         Droplets,
    bg:           'from-blue-500 to-cyan-500',
    gradientCard: 'from-blue-50 via-white to-cyan-50',
    text:         'text-blue-700',
    subtext:      'text-blue-500',
    border:       'border-blue-200',
    lightBg:      'bg-blue-50',
    badge:        'bg-blue-100 text-blue-700 border-blue-200',
    pulseDot:     'bg-blue-500',
    tagline:      'Pump is ON',
    description:  'Soil moisture is below threshold. Reservoir has sufficient water. The model commanded the pump relay to activate.',
  },
  HOLD: {
    icon:         ShieldOff,
    bg:           'from-emerald-500 to-teal-500',
    gradientCard: 'from-emerald-50 via-white to-teal-50',
    text:         'text-emerald-700',
    subtext:      'text-emerald-500',
    border:       'border-emerald-200',
    lightBg:      'bg-emerald-50',
    badge:        'bg-emerald-100 text-emerald-700 border-emerald-200',
    pulseDot:     'bg-emerald-500',
    tagline:      'Pump is OFF',
    description:  'Soil moisture is at a healthy level. No irrigation needed right now. The pump relay stays off to conserve water.',
  },
  LOW_WATER: {
    icon:         AlertTriangle,
    bg:           'from-amber-500 to-orange-500',
    gradientCard: 'from-amber-50 via-white to-orange-50',
    text:         'text-amber-700',
    subtext:      'text-amber-500',
    border:       'border-amber-200',
    lightBg:      'bg-amber-50',
    badge:        'bg-amber-100 text-amber-700 border-amber-200',
    pulseDot:     'bg-amber-500',
    tagline:      'Pump held off — refill tank',
    description:  'Reservoir level is critically low. Even though soil may be dry, pumping is suspended to protect the pump from running dry.',
  },
}

function SensorPill({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3 text-center shadow-sm">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xl font-extrabold text-gray-800 tabular-nums leading-none">
        {value.toFixed(1)}<span className="text-xs font-medium text-gray-400 ml-0.5">{unit}</span>
      </p>
    </div>
  )
}

export default function MLHeroCard({ latest, mlStatus }: Props) {
  if (!latest) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 shadow-sm">
        <div className="bg-gray-50 p-5 rounded-3xl">
          <Cpu size={36} className="text-gray-200" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-400">No decisions recorded yet</p>
          <p className="text-xs text-gray-300 mt-1">
            Start the ML service and serial bridge, or run the backfill script
          </p>
          <code className="mt-2 inline-block text-[11px] bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-gray-500 font-mono">
            python ml_service/main.py
          </code>
        </div>
      </div>
    )
  }

  const decision = (latest.decision as Decision) in CONFIG
    ? (latest.decision as Decision)
    : 'HOLD'
  const cfg = CONFIG[decision]
  const Icon = cfg.icon

  const [ageStr, setAgeStr] = useState('')
  useEffect(() => {
    function computeAge() {
      const sec = Math.floor((Date.now() - new Date(latest.timestamp).getTime()) / 1000)
      setAgeStr(
        sec < 60 ? `${sec}s ago`
        : sec < 3600 ? `${Math.floor(sec / 60)}m ago`
        : `${Math.floor(sec / 3600)}h ago`
      )
    }
    computeAge()
    const id = setInterval(computeAge, 1000)
    return () => clearInterval(id)
  }, [latest.timestamp])

  return (
    <div className={`bg-gradient-to-br ${cfg.gradientCard} border ${cfg.border} rounded-2xl shadow-sm overflow-hidden`}>
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">

          {/* Left: decision identity */}
          <div className="flex items-center gap-5 flex-1">
            <div className={`bg-gradient-to-br ${cfg.bg} p-5 rounded-3xl shadow-lg shrink-0`}>
              <Icon size={32} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Latest Decision
              </p>
              <h2 className={`text-4xl font-black tracking-tight ${cfg.text} leading-none`}>
                {decision === 'LOW_WATER' ? 'LOW WATER' : decision}
              </h2>
              <p className={`text-sm font-semibold mt-1 ${cfg.subtext}`}>{cfg.tagline}</p>
              <p className="text-xs text-gray-500 mt-2 max-w-md leading-relaxed">
                {cfg.description}
              </p>
            </div>
          </div>

          {/* Right: confidence + pump + time */}
          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            {/* Confidence ring */}
            <div className={`${cfg.lightBg} border ${cfg.border} rounded-2xl px-5 py-3 text-center`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Confidence</p>
              <p className={`text-3xl font-black tabular-nums ${cfg.text}`}>
                {(latest.confidence * 100).toFixed(0)}%
              </p>
            </div>

            {/* Pump badge */}
            <div className={`flex items-center gap-2 ${cfg.badge} border px-4 py-2 rounded-full text-sm font-bold`}>
              <span className="relative flex h-2.5 w-2.5">
                {latest.pumpCommand && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.pulseDot} opacity-60`} />
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${latest.pumpCommand ? cfg.pulseDot : 'bg-gray-300'}`} />
              </span>
              Pump {latest.pumpCommand ? 'ON' : 'OFF'}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock size={11} />
              <span suppressHydrationWarning>{ageStr}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-gray-300 inline-block" />
              <span>node: {latest.nodeId ?? 'unknown'}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-gray-300 inline-block" />
              <span>{latest.modelVersion}</span>
            </div>
          </div>
        </div>

        {/* Sensor pills */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SensorPill label="Soil Moisture"    value={latest.soilMoisture}   unit="%" />
          <SensorPill label="Temperature"      value={latest.temperature}    unit="°C" />
          <SensorPill label="Humidity"         value={latest.humidity}       unit="%" />
          <SensorPill label="Reservoir Level"  value={latest.reservoirLevel} unit="%" />
        </div>
      </div>

      {/* Footer bar */}
      <div className={`border-t ${cfg.border} bg-white/40 px-6 py-3 flex items-center justify-between text-xs text-gray-500`}>
        <span>
          Decided at {new Date(latest.timestamp).toLocaleString()}
        </span>
        {mlStatus?.metrics && (
          <span className={`font-semibold ${cfg.subtext}`}>
            Model accuracy: {(mlStatus.metrics.accuracy * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
