'use client'

import { useEffect, useState } from 'react'
import { Cpu, Zap, WifiOff, Clock } from 'lucide-react'

interface Decision {
  id: string
  timestamp: string
  decision: string
  pumpCommand: boolean
  confidence: number
  soilMoisture: number
  reservoirLevel: number
}

function CommandBox({ pump }: { pump: boolean }) {
  const cmd = pump ? 'CMD:PUMP=1' : 'CMD:PUMP=0'
  return (
    <div className={`font-mono text-xl font-black tracking-widest px-6 py-4 rounded-2xl border-2 transition-all duration-500 ${
      pump
        ? 'bg-blue-950 border-blue-400 text-blue-300 shadow-lg shadow-blue-900'
        : 'bg-gray-900 border-gray-600 text-gray-400'
    }`}>
      <span className="text-gray-500 text-sm font-sans font-normal mr-2">USB serial →</span>
      {cmd}
    </div>
  )
}

function PumpIndicator({ pump }: { pump: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-3xl border-2 px-10 py-8 transition-all duration-500 ${
      pump
        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 border-blue-300 shadow-xl shadow-blue-200'
        : 'bg-gray-100 border-gray-200'
    }`}>
      <div className="relative">
        {pump && (
          <span className="absolute inset-0 rounded-full bg-white opacity-30 animate-ping" />
        )}
        <Zap size={40} className={pump ? 'text-white relative z-10' : 'text-gray-300 relative z-10'} />
      </div>
      <span className={`text-2xl font-black uppercase tracking-widest ${pump ? 'text-white' : 'text-gray-400'}`}>
        PUMP {pump ? 'ON' : 'OFF'}
      </span>
      <span className={`text-xs font-semibold ${pump ? 'text-blue-100' : 'text-gray-400'}`}>
        {pump ? 'Relay energised — water flowing' : 'Relay open — no water flow'}
      </span>
    </div>
  )
}

export default function LiveArduinoCommand() {
  const [latest, setLatest] = useState<Decision | null>(null)
  const [history, setHistory] = useState<Decision[]>([])
  const [age, setAge] = useState('')

  useEffect(() => {
    async function fetch_() {
      try {
        const r = await fetch('/api/decisions')
        const d = await r.json()
        if (d.latest) setLatest(d.latest)
        if (d.history) setHistory(d.history.slice(0, 12))
      } catch { /* silent */ }
    }
    fetch_()
    const id = setInterval(fetch_, 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!latest) return
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - new Date(latest.timestamp).getTime()) / 1000)
      setAge(sec < 60 ? `${sec}s ago` : sec < 3600 ? `${Math.floor(sec / 60)}m ago` : `${Math.floor(sec / 3600)}h ago`)
    }, 1000)
    return () => clearInterval(id)
  }, [latest])

  const pump = latest?.pumpCommand ?? false

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <div className="bg-slate-800 p-2.5 rounded-xl">
          <Cpu size={16} className="text-green-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-700">Live Arduino Command</p>
          <p className="text-[11px] text-gray-400">
            ML model → Python bridge → USB serial → Arduino Uno → pump relay
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[11px] font-bold text-green-600">Live</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Main command + pump indicator */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 w-full space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Last command sent to Arduino
            </p>
            <CommandBox pump={pump} />
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {age || '—'}
              </span>
              {latest && (
                <>
                  <span>·</span>
                  <span>Decision: <strong className="text-gray-600">{latest.decision}</strong></span>
                  <span>·</span>
                  <span>Confidence: <strong className="text-gray-600">{(latest.confidence * 100).toFixed(0)}%</strong></span>
                </>
              )}
            </div>
          </div>

          <PumpIndicator pump={pump} />
        </div>

        {/* How it works mini-flow */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Command flow every 2 seconds
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Arduino', sub: 'reads sensors', color: 'bg-slate-700 text-white' },
              { label: '→ Bridge', sub: 'POST /ingest', color: 'bg-gray-200 text-gray-700' },
              { label: '→ ML /predict', sub: 'IRRIGATE / HOLD', color: 'bg-violet-100 text-violet-700' },
              { label: `→ CMD:PUMP=${pump ? '1' : '0'}`, sub: 'USB serial TX', color: pump ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600' },
              { label: '→ Relay', sub: pump ? 'ON' : 'OFF', color: pump ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500' },
            ].map((step, i) => (
              <div key={i} className={`${step.color} rounded-xl px-3 py-1.5 text-center`}>
                <p className="text-[11px] font-bold">{step.label}</p>
                <p className="text-[9px] opacity-70">{step.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent command log */}
        {history.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Recent decisions → commands
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {history.map((d, i) => {
                const ts = new Date(d.timestamp)
                return (
                  <div key={d.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs ${
                    i === 0 ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
                  }`}>
                    <span className={`font-mono font-bold text-[11px] ${d.pumpCommand ? 'text-blue-600' : 'text-gray-400'}`}>
                      CMD:PUMP={d.pumpCommand ? '1' : '0'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      d.decision === 'IRRIGATE' ? 'bg-blue-100 text-blue-700'
                      : d.decision === 'LOW_WATER' ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                    }`}>{d.decision}</span>
                    <span className="text-gray-400 ml-auto tabular-nums">
                      {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="text-gray-300">{(d.confidence * 100).toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
