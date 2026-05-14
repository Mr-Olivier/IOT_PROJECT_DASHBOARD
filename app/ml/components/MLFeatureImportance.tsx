import { Zap } from 'lucide-react'

interface Props {
  importances: Record<string, number> | null
}

const LABELS: Record<string, { label: string; unit: string; gradient: string }> = {
  soilMoisture:   { label: 'Soil Moisture',   unit: '%',    gradient: 'from-emerald-500 to-teal-400' },
  temperature:    { label: 'Temperature',     unit: '°C',   gradient: 'from-orange-500 to-amber-400' },
  humidity:       { label: 'Humidity',        unit: '%',    gradient: 'from-sky-500 to-cyan-400' },
  reservoirLevel: { label: 'Reservoir Level', unit: '%',    gradient: 'from-blue-500 to-indigo-400' },
  nitrogen:       { label: 'Nitrogen (N)',    unit: 'mg/kg', gradient: 'from-lime-500 to-green-400' },
  phosphorus:     { label: 'Phosphorus (P)',  unit: 'mg/kg', gradient: 'from-violet-500 to-purple-400' },
  potassium:      { label: 'Potassium (K)',   unit: 'mg/kg', gradient: 'from-rose-500 to-pink-400' },
}

export default function MLFeatureImportance({ importances }: Props) {
  if (!importances) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-8 flex items-center justify-center shadow-sm">
        <p className="text-sm text-gray-300">Feature data unavailable — start the ML service</p>
      </div>
    )
  }

  const sorted = Object.entries(importances).sort((a, b) => b[1] - a[1])
  const maxVal = sorted[0]?.[1] ?? 1

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-5">
        <div className="bg-orange-50 p-2 rounded-xl">
          <Zap size={16} className="text-orange-500" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Feature Importance</p>
          <p className="text-[10px] text-gray-400">Higher = more influence on the decision</p>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map(([key, val], i) => {
          const info  = LABELS[key] ?? { label: key, unit: '', gradient: 'from-gray-400 to-gray-300' }
          const pct   = Math.round(val * 100)
          const width = Math.round((val / maxVal) * 100)

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-300 w-4 tabular-nums">#{i + 1}</span>
                  <span className="text-sm font-semibold text-gray-700">{info.label}</span>
                  <span className="text-[10px] text-gray-300">{info.unit}</span>
                </div>
                <span className="text-sm font-extrabold text-gray-600 tabular-nums">{pct}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${info.gradient} transition-all duration-700 shadow-sm`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-5 text-[10px] text-gray-300 leading-relaxed border-t pt-4">
        Calculated from Random Forest Gini impurity reduction across all 100 decision trees.
        Higher importance means the model relies more heavily on that sensor when choosing
        between IRRIGATE, HOLD, and LOW_WATER.
      </p>
    </div>
  )
}
