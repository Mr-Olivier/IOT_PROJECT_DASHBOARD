'use client'

import { BrainCircuit, TrendingUp } from 'lucide-react'

interface Prediction {
  timestamp: string
  probability: number
  confidence: number
}

interface MLPredictionData {
  id: string
  generatedAt: string
  horizon: string
  predictions: Prediction[]
  inputFeatures: Record<string, unknown>
  isStale: boolean
}

export interface PredictionPanelProps {
  pred24h?: MLPredictionData | null
  pred7d?: MLPredictionData | null
  isStale?: boolean
}

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function PredictionCard({ pred, label }: { pred: MLPredictionData; label: string }) {
  const primary = pred.predictions[0]
  const probPct = primary ? Math.round(primary.probability * 100) : 0
  const confPct = primary ? Math.round(primary.confidence * 100) : 0
  const featureEntries = Object.entries(pred.inputFeatures)

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-violet-500" />
          <h3 className="text-gray-800 font-medium text-sm">{label} Prediction</h3>
        </div>
        {pred.isStale && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            Stale
          </span>
        )}
      </div>

      {/* Probability bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Irrigation probability</span>
          <span className="text-xs text-gray-800 font-semibold">{probPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${probPct}%` }}
          />
        </div>
      </div>

      {/* Confidence */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Confidence</span>
          <span className="text-xs text-gray-800 font-semibold">{confPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-violet-300 rounded-full transition-all"
            style={{ width: `${confPct}%` }}
          />
        </div>
      </div>

      {/* Input features */}
      {featureEntries.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Input features</p>
          <div className="flex flex-col gap-1">
            {featureEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-gray-800 font-mono">
                  {typeof value === 'number' ? value.toFixed(2) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">Generated: {formatGeneratedAt(pred.generatedAt)}</p>
    </div>
  )
}

export default function PredictionPanel({ pred24h, pred7d, isStale = false }: PredictionPanelProps) {
  const noPredictions = !pred24h && !pred7d

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-violet-50 p-2 rounded-lg">
            <BrainCircuit size={18} className="text-violet-600" />
          </div>
          <h2 className="text-gray-900 font-semibold text-base">ML Predictions</h2>
        </div>
        {isStale && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            Stale
          </span>
        )}
      </div>

      {noPredictions ? (
        <p className="text-sm text-gray-400">No predictions available yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pred24h && <PredictionCard pred={pred24h} label="24h" />}
          {pred7d && <PredictionCard pred={pred7d} label="7d" />}
        </div>
      )}
    </div>
  )
}
