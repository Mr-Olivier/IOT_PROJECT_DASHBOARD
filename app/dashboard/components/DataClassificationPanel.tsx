/**
 * DataClassificationPanel — Assignment §10
 * Data Categorization & Classification
 *
 * Covers:
 *   §10.1  Expected results of the project
 *   §10.2  Goal of classification
 *   §10.3  Time-series data classified from all 4 devices (real DB counts)
 *   §10.4  Correlation logic applied to transform raw data classes
 *   §10.5  Mathematical methods / algorithms
 */

import { Target, AlertTriangle, TrendingUp, Cpu, FlaskConical } from 'lucide-react'
import type { SensorClassStats, CorrelationPair } from '@/lib/classification'

interface Props {
  totalReadings: number
  sensors: SensorClassStats[]
  correlations: CorrelationPair[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100)
}

function corrColor(r: number): string {
  const abs = Math.abs(r)
  if (abs >= 0.7) return r > 0 ? '#059669' : '#dc2626'
  if (abs >= 0.4) return r > 0 ? '#10b981' : '#f87171'
  if (abs >= 0.2) return r > 0 ? '#6ee7b7' : '#fca5a5'
  return '#9ca3af'
}

function corrBg(r: number): string {
  const abs = Math.abs(r)
  if (abs >= 0.7) return r > 0 ? '#d1fae5' : '#fee2e2'
  if (abs >= 0.4) return r > 0 ? '#ecfdf5' : '#fef2f2'
  return '#f9fafb'
}

const CLASS_COLORS = {
  criticalLow:  { bg: '#fee2e2', color: '#dc2626', label: 'CRITICAL LOW'  },
  low:          { bg: '#fef3c7', color: '#d97706', label: 'LOW'           },
  optimal:      { bg: '#d1fae5', color: '#059669', label: 'OPTIMAL'       },
  high:         { bg: '#fef3c7', color: '#d97706', label: 'HIGH'          },
  criticalHigh: { bg: '#fee2e2', color: '#dc2626', label: 'CRITICAL HIGH' },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DataClassificationPanel({ totalReadings, sensors, correlations }: Props) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 via-sky-500 to-emerald-500" />

      <div className="px-6 pt-5 pb-6 space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-2.5 rounded-xl shadow-sm">
            <Cpu size={17} className="text-white" />
          </div>
          <div>
            <h2 className="text-gray-900 font-bold text-base leading-tight">
              Data Classification &amp; Analysis
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Every sensor reading is put into a class (e.g. OPTIMAL or CRITICAL LOW) — based on {totalReadings.toLocaleString()} readings stored in the database
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            §10.1 — Expected Results
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Target size={13} className="text-violet-500" />
            What This Project Is Trying to Do
          </h3>
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5">
            <p className="text-sm font-semibold text-violet-800 mb-2">
              AquaSense — Smart Irrigation System Goals
            </p>
            <ul className="space-y-1.5 text-xs text-violet-700">
              <li className="flex gap-2"><span className="font-bold shrink-0">1.</span> Read sensor data in real time from 4 devices (soil moisture, temperature/humidity, water tank, NPK nutrients) and save every reading to the database with a timestamp.</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">2.</span> Give each reading a label — one of 5 classes from CRITICAL LOW to CRITICAL HIGH — and use those labels to decide when to turn the irrigation pump on or off.</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">3.</span> Spot unusual readings (anything outside OPTIMAL) and send an alert so the farmer can fix the problem before the crops are damaged.</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">4.</span> Store {totalReadings.toLocaleString()}+ readings over time so we can see patterns — like how soil dries out each day or how nutrients decrease over weeks.</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">5.</span> Save water by only irrigating when the soil is dry (LOW or CRITICAL LOW) AND the water tank still has enough water in it.</li>
            </ul>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            §10.2 — Goal of Classification
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle size={13} className="text-amber-500" />
            Why Do We Classify the Data?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                title: 'Detect Problems Early',
                icon: AlertTriangle,
                iconBg: 'bg-red-50',
                iconColor: 'text-red-500',
                border: 'border-red-100',
                desc: 'When a reading is CRITICAL LOW or CRITICAL HIGH, that means something is wrong. The system immediately sends an alert so the farmer can act before the crop is hurt.',
                example: 'Soil Moisture ≤ 20 % → CRITICAL LOW → Alert + pump ON',
              },
              {
                title: 'Optimise Irrigation',
                icon: TrendingUp,
                iconBg: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
                border: 'border-emerald-100',
                desc: 'The pump only turns on when both the soil is dry AND the water tank still has water. This stops the system from wasting water or running the pump when the tank is empty.',
                example: 'Moisture = LOW AND Reservoir ≥ LOW → pump ON',
              },
              {
                title: 'Predict Future Needs',
                icon: TrendingUp,
                iconBg: 'bg-sky-50',
                iconColor: 'text-sky-600',
                border: 'border-sky-100',
                desc: 'By looking at past class labels, we can see how fast the soil dries out. This lets us predict when the next irrigation will be needed before it becomes critical.',
                example: 'Moisture drops ~5 %/hour → next irrigation in ~3 h',
              },
            ].map((g) => (
              <div key={g.title} className={`border ${g.border} rounded-2xl p-4`}>
                <div className={`${g.iconBg} p-2 rounded-xl inline-flex mb-3`}>
                  <g.icon size={15} className={g.iconColor} />
                </div>
                <p className="text-sm font-bold text-gray-800 mb-1">{g.title}</p>
                <p className="text-xs text-gray-500 mb-2 leading-relaxed">{g.desc}</p>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5">
                  <p className="text-[11px] font-mono text-gray-600">{g.example}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            §10.3 — Class Distribution from All 4 Devices (real DB data)
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
            <FlaskConical size={13} className="text-indigo-500" />
            How Often Was Each Sensor in Each Class?
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Every reading ever saved to the database was classified into one of 5 labels.
            The bars below show how many readings fell into each class — across all {totalReadings.toLocaleString()} records.
          </p>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(CLASS_COLORS).map(([k, c]) => (
              <span key={k} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: c.bg, color: c.color }}>
                {c.label}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {sensors.map((s) => {
              const classes = [
                { key: 'criticalLow',  count: s.criticalLow  },
                { key: 'low',          count: s.low          },
                { key: 'optimal',      count: s.optimal      },
                { key: 'high',         count: s.high         },
                { key: 'criticalHigh', count: s.criticalHigh },
              ] as const

              return (
                <div key={s.sensor} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {s.label} <span className="text-gray-400 font-normal">({s.unit})</span>
                    </span>
                    <span className="text-[10px] text-gray-400">{s.total.toLocaleString()} readings</span>
                  </div>

                  {/* Stacked bar */}
                  <div className="flex h-5 rounded-lg overflow-hidden mb-2">
                    {classes.map(({ key, count }) => {
                      const p = pct(count, s.total)
                      const c = CLASS_COLORS[key]
                      return p > 0 ? (
                        <div
                          key={key}
                          className="flex items-center justify-center text-[9px] font-bold transition-all"
                          style={{ width: `${p}%`, backgroundColor: c.color, color: '#fff' }}
                          title={`${c.label}: ${count.toLocaleString()} (${p}%)`}
                        >
                          {p >= 8 ? `${p}%` : ''}
                        </div>
                      ) : null
                    })}
                  </div>

                  {/* Count pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {classes.map(({ key, count }) => {
                      const c = CLASS_COLORS[key]
                      const p = pct(count, s.total)
                      return (
                        <span key={key} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: c.bg, color: c.color }}>
                          {c.label}: {count.toLocaleString()} ({p}%)
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            §10.4 — Correlation Logic (computed Pearson r from DB)
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
            <TrendingUp size={13} className="text-emerald-600" />
            Do Sensors Move Together? (Correlation Table)
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Pearson r tells us if two sensors go up and down at the same time (+1 = always together, −1 = always opposite, 0 = no link).
            Calculated from all {totalReadings.toLocaleString()} real database readings.
            Formula: <span className="font-mono">r = Σ[(xᵢ−x̄)(yᵢ−ȳ)] ÷ √[Σ(xᵢ−x̄)² · Σ(yᵢ−ȳ)²]</span>
          </p>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-semibold">Sensor A</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-semibold">Sensor B</th>
                  <th className="text-center px-4 py-2 text-gray-500 font-semibold">Pearson r</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-semibold">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {correlations.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">{c.aLabel}</td>
                    <td className="px-4 py-2 font-medium text-gray-700">{c.bLabel}</td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className="font-mono font-bold px-2 py-0.5 rounded-lg"
                        style={{ backgroundColor: corrBg(c.r), color: corrColor(c.r) }}
                      >
                        {c.r >= 0 ? '+' : ''}{c.r.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{c.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            §10.5 — Mathematical Methods & Algorithms
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Cpu size={13} className="text-sky-500" />
            Maths &amp; Algorithms Used in This System
          </h3>

          <div className="space-y-3">

            {/* Algorithm 1 — Min-Max Normalization */}
            <div className="border border-sky-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-sky-700 mb-1">
                Algorithm 1 — Min-Max Normalization (Scaling)
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Different sensors use different units (°C, %, mg/kg). To draw them all on the same graph,
                we scale each value to a 0–100 % range. This is called normalisation — it makes all
                sensors comparable without changing their shape or pattern.
              </p>
              <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-2 mb-2">
                <p className="text-sm font-mono font-bold text-sky-900">
                  x_norm = (x − x_min) ÷ (x_max − x_min) × 100
                </p>
              </div>
              <p className="text-[11px] text-gray-400">
                Used for: Soil Moisture, Temperature, Humidity, Reservoir Level, N, P, K before drawing the graph.
                Example: Temperature 26 °C with range −40 to 80 °C → (26−(−40)) ÷ (80−(−40)) × 100 = 55 %.
              </p>
            </div>

            {/* Algorithm 2 — Threshold-Based Rule Classifier */}
            <div className="border border-violet-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-violet-700 mb-1">
                Algorithm 2 — Threshold Rule Classifier (gives each reading a label)
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Every sensor reading is compared against a set of boundary values (thresholds).
                Depending on which range the value falls in, it gets a class label.
                The thresholds come from agricultural science standards — no machine learning is needed.
              </p>
              <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 mb-2 font-mono text-xs text-violet-900 space-y-0.5">
                <p>classify(x, T) → class where:</p>
                <p className="pl-4">if x ≤ T[0] → CRITICAL LOW</p>
                <p className="pl-4">if x ≤ T[1] → LOW</p>
                <p className="pl-4">if x ≤ T[2] → OPTIMAL</p>
                <p className="pl-4">if x ≤ T[3] → HIGH</p>
                <p className="pl-4">else        → CRITICAL HIGH</p>
                <p className="mt-1 text-violet-600">T = [t₁, t₂, t₃, t₄] — different for each sensor type</p>
              </div>
              <p className="text-[11px] text-gray-400">
                Very fast — runs instantly for every new reading.
                CRITICAL LOW / LOW → pump turns ON · OPTIMAL → pump stays OFF · CRITICAL HIGH → alert is sent.
              </p>
            </div>

            {/* Algorithm 3 — Pearson Correlation */}
            <div className="border border-emerald-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-emerald-700 mb-1">
                Algorithm 3 — Pearson Correlation (how much do two sensors move together?)
              </p>
              <p className="text-xs text-gray-500 mb-2">
                We use this formula to measure whether two sensors tend to increase and decrease together.
                For example, when temperature goes up, does humidity go down?
                The result r is a number from −1 to +1 — calculated from all {totalReadings.toLocaleString()} real readings.
              </p>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 mb-2">
                <p className="text-sm font-mono font-bold text-emerald-900">
                  r(X,Y) = Σ[(xᵢ−x̄)(yᵢ−ȳ)] ÷ √[Σ(xᵢ−x̄)² · Σ(yᵢ−ȳ)²]
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-500">
                <div className="bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 text-center">
                  <p className="font-bold text-red-600">r &lt; −0.4</p>
                  <p>One goes up, the other goes down</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-center">
                  <p className="font-bold text-gray-500">−0.2 ≤ r ≤ 0.2</p>
                  <p>No clear link between them</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5 text-center">
                  <p className="font-bold text-emerald-600">r &gt; 0.4</p>
                  <p>Both go up and down together</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
