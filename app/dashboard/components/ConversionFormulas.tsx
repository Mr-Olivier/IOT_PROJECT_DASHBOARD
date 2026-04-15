/**
 * ConversionFormulas — Assignment requirement:
 * "Document the conversion formulas used for normalisation, calibration
 *  and conversion of your data."
 *
 * Shown prominently on the dashboard so it is always visible.
 */

import { Cpu, Thermometer, Waves, Droplets, Leaf, type LucideIcon } from 'lucide-react'

interface Formula {
  sensor: string
  raw: string
  formula: string
  example: string
  reference: string
  icon: LucideIcon
  gradient: string
  iconBg: string
  iconColor: string
  badge: string
}

const FORMULAS: Formula[] = [
  {
    sensor: 'Soil Moisture',
    raw: 'ADC counts (0 – 1023)',
    formula: 'Moisture (%) = (1 − ADC ÷ 1023) × 100',
    example: 'ADC = 450  →  (1 − 450/1023) × 100  =  56.0 %',
    reference: 'Dry air ≈ 1023 ADC · Saturated water ≈ 300 ADC',
    icon: Droplets,
    gradient: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    sensor: 'Temperature',
    raw: 'DHT11/22 digital output (°C)',
    formula: 'Temperature (°C) = raw output  (factory calibrated)',
    example: 'Output = 26.8  →  26.8 °C  ±0.5 °C accuracy',
    reference: 'NIST-traceable thermometer at same location',
    icon: Thermometer,
    gradient: 'from-orange-500 to-red-500',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    sensor: 'Humidity',
    raw: 'DHT11/22 digital output (%RH)',
    formula: 'Humidity (%) = raw output  (factory calibrated)',
    example: 'Output = 71.3  →  71.3 %RH  ±2 % accuracy',
    reference: 'Calibrated hygrometer at same location',
    icon: Cpu,
    gradient: 'from-sky-500 to-blue-500',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    sensor: 'Reservoir Level',
    raw: 'HC-SR04 echo pulse duration (µs)',
    formula: 'Distance (cm) = pulse_µs × 0.034 ÷ 2',
    example: 'pulse = 2000 µs  →  2000 × 0.034 / 2  =  34.0 cm',
    reference: 'Speed of sound = 343 m/s at 20 °C · physical ruler check',
    icon: Waves,
    gradient: 'from-blue-500 to-indigo-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    sensor: 'NPK (Nitrogen, Phosphorus, Potassium)',
    raw: 'RS485 Modbus HEX bytes via MAX485',
    formula: 'N/P/K (mg/kg) = bytes[hi] × 256 + bytes[lo]   (big-endian uint16)',
    example: 'bytes = 0x00, 0xD2  →  0×256 + 210  =  210 mg/kg',
    reference: 'Soil lab (Kjeldahl / Olsen / NH₄OAc methods) on same sample',
    icon: Leaf,
    gradient: 'from-lime-500 to-green-500',
    iconBg: 'bg-lime-50',
    iconColor: 'text-lime-600',
    badge: 'bg-lime-50 text-lime-700 border-lime-200',
  },
]

export default function ConversionFormulas() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-sky-400 via-violet-400 to-rose-400" />

      <div className="px-6 pt-5 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-sm">
            <Leaf size={17} className="text-white" />
          </div>
          <div>
            <h2 className="text-gray-900 font-bold text-base leading-tight">
              How Raw Sensor Signals Become Real Numbers
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Each sensor sends a raw electrical signal — these formulas convert it into a number you can understand (like 26 °C or 65 % moisture)
            </p>
          </div>
        </div>

        {/* Formula cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {FORMULAS.map((f) => (
            <div
              key={f.sensor}
              className="border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all"
            >
              {/* Mini gradient top */}
              <div className={`h-0.5 w-full bg-gradient-to-r ${f.gradient}`} />

              <div className="p-4">
                {/* Sensor badge */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`${f.iconBg} p-1.5 rounded-lg`}>
                    <f.icon size={13} className={f.iconColor} />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${f.badge}`}>
                    {f.sensor}
                  </span>
                </div>

                {/* Raw input */}
                <p className="text-xs text-gray-400 mb-1.5">
                  <span className="font-semibold text-gray-500">Sensor sends: </span>
                  <span className="font-mono">{f.raw}</span>
                </p>

                {/* Formula */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mb-2">
                  <p className="text-xs font-mono font-semibold text-gray-800">{f.formula}</p>
                </div>

                {/* Example */}
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl px-3 py-2 mb-2">
                  <p className="text-[11px] font-mono text-emerald-800">
                    <span className="font-semibold text-emerald-600">eg. </span>
                    {f.example}
                  </p>
                </div>

                {/* Calibration reference */}
                <p className="text-[11px] text-gray-400 leading-snug">
                  <span className="font-semibold text-gray-500">Ref: </span>
                  {f.reference}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Normalisation formula note */}
        <div className="mt-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-semibold text-emerald-700 mb-1">
            Normalisation formula — used to draw all sensors on one graph:
          </p>
          <p className="text-sm font-mono font-bold text-gray-800">
            normalized (%) = (value − min) ÷ (max − min) × 100
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            Because sensors use different units (°C, %, mg/kg), we scale them all to 0–100 % so they fit on the same graph.
            This does not change the data — it just makes comparison easier.
          </p>
        </div>
      </div>
    </div>
  )
}
