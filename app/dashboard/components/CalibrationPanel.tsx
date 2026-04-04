import { FlaskConical, Info } from "lucide-react";

const FORMULAS = [
  {
    sensor: "Soil Moisture",
    raw: "ADC (0 – 1023)",
    formula: "Moisture % = (1 − raw ÷ 1023) × 100",
    reference: "Dry air ≈ 1023 · Water ≈ 300",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    sensor: "Temperature",
    raw: "DHT22 direct output",
    formula: "Already in °C — no conversion needed",
    reference: "Factory calibrated ±0.5 °C",
    dot: "bg-orange-400",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    sensor: "Humidity",
    raw: "DHT22 direct output",
    formula: "Already in % RH — no conversion needed",
    reference: "Factory calibrated ±2% RH",
    dot: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    sensor: "Reservoir Level",
    raw: "Ultrasonic pulse time (µs)",
    formula: "Distance (cm) = (pulse × 0.034) ÷ 2",
    reference: "Speed of sound = 343 m/s at 20 °C",
    dot: "bg-indigo-400",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    sensor: "NPK (RS485)",
    raw: "HEX bytes via MAX485",
    formula: "N / P / K (mg/kg) = byte value × sensor factor",
    reference: "Ref: sensor datasheet calibration table",
    dot: "bg-violet-400",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
  },
];

export default function CalibrationPanel() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-violet-50 p-2 rounded-xl">
          <FlaskConical size={18} className="text-violet-600" />
        </div>
        <div>
          <h2 className="text-gray-900 font-semibold text-base">
            Calibration & Conversion
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Raw → real-world unit formulas
          </p>
        </div>
      </div>

      {/* Formula cards */}
      <div className="flex flex-col gap-2">
        {FORMULAS.map((f) => (
          <div
            key={f.sensor}
            className="border border-gray-100 rounded-xl p-3.5 hover:border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${f.dot}`} />
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${f.badge}`}
              >
                {f.sensor}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1">
              Raw input:{" "}
              <span className="font-mono text-gray-700">{f.raw}</span>
            </p>
            <p className="text-xs bg-gray-100 rounded-lg px-3 py-2 font-mono text-gray-800 font-medium my-1.5">
              {f.formula}
            </p>
            <div className="flex items-start gap-1 mt-1">
              <Info size={11} className="text-gray-300 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400">{f.reference}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
