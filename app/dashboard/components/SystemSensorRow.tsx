/**
 * SystemSensorRow — shows current readings for each sensor type.
 * When online nodes provide real averages those are used; otherwise
 * realistic mock values are shown so the UI is never empty.
 */
import {
  Droplets,
  Thermometer,
  Wind,
  Waves,
  Leaf,
  Atom,
  Zap,
  type LucideIcon,
} from 'lucide-react'

interface Band {
  max: number
  label: string
  color: string
  bg: string
  textColor: string
}

interface MetricCfg {
  key: string
  label: string
  unit: string
  Icon: LucideIcon
  gradient: string
  iconBg: string
  iconColor: string
  validMin: number
  validMax: number
  mockValue: number          // shown when no real data
  bands: Band[]
}

const METRICS: MetricCfg[] = [
  {
    key: 'soilMoisture',
    label: 'Soil Moisture',
    unit: '%',
    Icon: Droplets,
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    validMin: 0,
    validMax: 100,
    mockValue: 62.4,
    bands: [
      { max: 20,  label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 40,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 70,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 85,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 100, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    Icon: Thermometer,
    gradient: 'from-orange-400 via-rose-500 to-red-500',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    validMin: -40,
    validMax: 80,
    mockValue: 26.8,
    bands: [
      { max: 10,  label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 18,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 30,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 38,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 80,  label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'humidity',
    label: 'Humidity',
    unit: '%',
    Icon: Wind,
    gradient: 'from-sky-400 via-blue-500 to-indigo-500',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    validMin: 0,
    validMax: 100,
    mockValue: 71.3,
    bands: [
      { max: 30,  label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 45,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 75,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 85,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 100, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'reservoirLevel',
    label: 'Reservoir',
    unit: '%',
    Icon: Waves,
    gradient: 'from-blue-500 via-violet-500 to-purple-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    validMin: 0,
    validMax: 100,
    mockValue: 34.1,
    bands: [
      { max: 10,  label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 25,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 75,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 90,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 100, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'nitrogen',
    label: 'Nitrogen',
    unit: 'mg/kg',
    Icon: Leaf,
    gradient: 'from-lime-400 via-green-500 to-emerald-600',
    iconBg: 'bg-lime-50',
    iconColor: 'text-lime-600',
    validMin: 0,
    validMax: 1999,
    mockValue: 142.0,
    bands: [
      { max: 50,   label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 100,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 500,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 800,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 1999, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'phosphorus',
    label: 'Phosphorus',
    unit: 'mg/kg',
    Icon: Atom,
    gradient: 'from-amber-400 via-orange-500 to-yellow-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    validMin: 0,
    validMax: 1999,
    mockValue: 58.0,
    bands: [
      { max: 25,   label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 50,   label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 200,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 400,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 1999, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
  {
    key: 'potassium',
    label: 'Potassium',
    unit: 'mg/kg',
    Icon: Zap,
    gradient: 'from-pink-400 via-rose-500 to-red-400',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-600',
    validMin: 0,
    validMax: 1999,
    mockValue: 214.0,
    bands: [
      { max: 100,  label: 'CRITICAL LOW',  color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
      { max: 200,  label: 'LOW',           color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 600,  label: 'OPTIMAL',       color: '#059669', bg: '#d1fae5', textColor: '#059669' },
      { max: 900,  label: 'HIGH',          color: '#d97706', bg: '#fef3c7', textColor: '#d97706' },
      { max: 1999, label: 'CRITICAL HIGH', color: '#dc2626', bg: '#fee2e2', textColor: '#dc2626' },
    ],
  },
]

function classify(value: number, bands: Band[]): Band {
  for (const b of bands) if (value <= b.max) return b
  return bands[bands.length - 1]
}

function fillPct(value: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

interface SystemSensorRowProps {
  averages: Record<string, number | null>
  onlineCount: number
}

export default function SystemSensorRow({ averages, onlineCount }: SystemSensorRowProps) {
  const usingMock = onlineCount === 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
      {METRICS.map((cfg) => {
        // Use real DB average if available, otherwise fall back to mock value
        const value = averages[cfg.key] ?? cfg.mockValue
        const band = classify(value, cfg.bands)
        const fill = fillPct(value, cfg.validMin, cfg.validMax)

        return (
          <div
            key={cfg.key}
            className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
          >
            {/* Gradient accent bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.gradient}`} />

            <div className="p-4">
              {/* Icon + badge */}
              <div className="flex items-center justify-between mb-3">
                <div className={`${cfg.iconBg} p-2.5 rounded-xl`}>
                  <cfg.Icon size={16} className={cfg.iconColor} />
                </div>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wide"
                  style={{ backgroundColor: band.bg, color: band.textColor }}
                >
                  {band.label}
                </span>
              </div>

              {/* Label */}
              <p className="text-xs text-gray-500 font-medium mb-1 truncate">{cfg.label}</p>

              {/* Value */}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
                  {value.toFixed(1)}
                </span>
                {cfg.unit && (
                  <span className="text-xs text-gray-400">{cfg.unit}</span>
                )}
              </div>

              {/* Progress fill bar */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${cfg.gradient} transition-all duration-700`}
                  style={{ width: `${fill}%` }}
                />
              </div>

              <p className="text-[10px] text-gray-400 mt-2">
                {usingMock ? 'Demo reading' : `Avg · ${onlineCount} node${onlineCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
