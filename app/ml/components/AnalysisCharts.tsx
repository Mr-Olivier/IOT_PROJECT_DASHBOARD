'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn, TrendingUp, FlaskConical, BarChart3 } from 'lucide-react'

// ─── Chart definitions grouped by section ────────────────────────────────────

const SECTIONS = [
  {
    id: 'model',
    label: 'ML Model Performance',
    subtitle: 'How well the Random Forest and other models learned from the sensor data',
    icon: TrendingUp,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    accentBar: 'bg-violet-500',
    charts: [
      {
        file: '11_model_comparison.png',
        title: 'Model Comparison',
        subtitle: '5-fold cross-validation F1 scores across all classifiers',
        insight: 'Random Forest leads at 98.99% F1 — Decision Tree and Gradient Boosting follow closely.',
      },
      {
        file: '08_feature_importance.png',
        title: 'Feature Importance',
        subtitle: 'Which sensor drives the model\'s decisions the most',
        insight: 'Soil moisture and humidity are the strongest predictors. NPK nutrients contribute less individually.',
      },
      {
        file: '07_confusion_matrix.png',
        title: 'Confusion Matrix',
        subtitle: 'True vs predicted soil classes on the 20% held-out test set',
        insight: 'Near-perfect diagonal — the model rarely misclassifies a dry reading as wet or vice versa.',
      },
      {
        file: '09_regression_scatter.png',
        title: 'Regression — Predicted vs Actual',
        subtitle: 'Gradient Boosting estimates the raw soil moisture value',
        insight: 'R² = 0.96 means 96% of moisture variation is explained by the other sensors alone.',
      },
    ],
  },
  {
    id: 'decisions',
    label: 'Irrigation Decisions',
    subtitle: 'Distribution of what the system decided to do across all 100,000 readings',
    icon: BarChart3,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    accentBar: 'bg-blue-500',
    charts: [
      {
        file: '10_decision_distribution.png',
        title: 'Decision Distribution',
        subtitle: 'Count of PUMP_ON / PUMP_OFF / ALERT / MONITOR decisions',
        insight: '56% of the time the pump stays off — soil was already at optimal moisture. 25% required irrigation.',
      },
      {
        file: '02_class_distribution.png',
        title: 'Soil Moisture Class Distribution',
        subtitle: 'How readings spread across criticalLow → criticalHigh classes',
        insight: '37.9% of readings fall in the optimal range — the system maintains healthy soil most of the time.',
      },
    ],
  },
  {
    id: 'eda',
    label: 'Exploratory Data Analysis',
    subtitle: 'Understanding patterns, correlations, and distributions in the raw sensor data',
    icon: FlaskConical,
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    accentBar: 'bg-teal-500',
    charts: [
      {
        file: '06_correlation_heatmap.png',
        title: 'Correlation Heatmap',
        subtitle: 'Pearson correlations between all 7 sensor readings',
        insight: 'N, P, K are strongly correlated (r > 0.99). Humidity and temperature are strongly anti-correlated (r = −0.92).',
      },
      {
        file: '03_time_series.png',
        title: 'Time Series',
        subtitle: 'All sensor values plotted over the full collection period',
        insight: 'Soil moisture shows clear daily cycles as the pump activates and the soil dries between readings.',
      },
      {
        file: '04_boxplots_by_class.png',
        title: 'Boxplots by Soil Class',
        subtitle: 'Sensor value spread within each moisture classification',
        insight: 'Temperature drops as soil moisture rises — cooler, wetter conditions keep the soil hydrated longer.',
      },
      {
        file: '05_soil_vs_reservoir.png',
        title: 'Soil vs Reservoir Level',
        subtitle: 'Scatter plot of moisture against tank water level',
        insight: 'Weak positive correlation (r = +0.25) — reservoir level alone is not a reliable predictor of soil moisture.',
      },
      {
        file: '01_sensor_distributions.png',
        title: 'Sensor Value Distributions',
        subtitle: 'Histogram of all 7 sensors across 100,000 readings',
        insight: 'Soil moisture is near-uniform — the irrigation system actively prevents it from staying too dry or too wet.',
      },
    ],
  },
]

// Flat list for lightbox navigation
const ALL_CHARTS = SECTIONS.flatMap((s) =>
  s.charts.map((c) => ({ ...c, sectionLabel: s.label, accentBar: s.accentBar }))
)

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  chart,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  chart: (typeof ALL_CHARTS)[0]
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lightbox header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${chart.accentBar} shrink-0`} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {chart.sectionLabel}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 leading-tight">{chart.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{chart.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Image */}
        <div className="relative flex-1 bg-gray-50 min-h-0" style={{ minHeight: 320 }}>
          <Image
            src={`/analysis-plots/${chart.file}`}
            alt={chart.title}
            fill
            className="object-contain p-6"
            unoptimized
          />
        </div>

        {/* Insight + nav */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Key insight</p>
            <p className="text-xs text-gray-600 leading-relaxed">{chart.insight}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onPrev}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-white transition-all"
            >
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <span className="text-xs font-bold text-gray-400 tabular-nums w-12 text-center">
              {index + 1} / {total}
            </span>
            <button
              onClick={onNext}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-white transition-all"
            >
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Chart card ──────────────────────────────────────────────────────────────

function ChartCard({
  chart,
  number,
  accentBar,
  onClick,
}: {
  chart: { file: string; title: string; subtitle: string; insight: string }
  number: number
  accentBar: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white border border-gray-100 hover:border-gray-300 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-250 flex flex-col"
    >
      {/* Image area — taller for visibility */}
      <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: '4/3' }}>
        <Image
          src={`/analysis-plots/${chart.file}`}
          alt={chart.title}
          fill
          className="object-cover group-hover:scale-[1.03] transition-transform duration-400"
          unoptimized
        />
        {/* Zoom hint on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
            <ZoomIn size={18} className="text-gray-700" />
          </div>
        </div>
        {/* Number badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-white/60 rounded-xl px-2.5 py-1 shadow-sm">
          <span className="text-[11px] font-black text-gray-700 tabular-nums">
            #{String(number).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        {/* Accent line + title */}
        <div className="flex items-start gap-3">
          <div className={`w-1 rounded-full shrink-0 mt-0.5 ${accentBar}`} style={{ height: 36 }} />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-gray-800 leading-snug">{chart.title}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{chart.subtitle}</p>
          </div>
        </div>

        {/* Insight callout */}
        <div className="bg-gray-50 rounded-xl px-3 py-2 mt-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Key insight</p>
          <p className="text-[11px] text-gray-600 leading-relaxed">{chart.insight}</p>
        </div>
      </div>
    </button>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AnalysisCharts() {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const openChart = useCallback((flatIdx: number) => setLightboxIdx(flatIdx), [])
  const closeLightbox = useCallback(() => setLightboxIdx(null), [])
  const prevChart = useCallback(() =>
    setLightboxIdx((i) => (i != null ? (i - 1 + ALL_CHARTS.length) % ALL_CHARTS.length : null)), [])
  const nextChart = useCallback(() =>
    setLightboxIdx((i) => (i != null ? (i + 1) % ALL_CHARTS.length : null)), [])

  // Build flat index lookup: section index → chart index → flat index
  let flatCounter = 0
  const sectionOffsets = SECTIONS.map((s) => {
    const offset = flatCounter
    flatCounter += s.charts.length
    return offset
  })

  return (
    <>
      <div className="space-y-10">
        {SECTIONS.map((section, si) => {
          const Icon = section.icon
          return (
            <div key={section.id}>
              {/* Section header */}
              <div className="flex items-center gap-4 mb-5">
                <div className={`${section.iconBg} p-3 rounded-2xl shrink-0`}>
                  <Icon size={18} className={section.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-gray-800 leading-tight">{section.label}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{section.subtitle}</p>
                </div>
                <span className="text-[10px] font-bold text-gray-300 shrink-0">
                  {section.charts.length} chart{section.charts.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* 2-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {section.charts.map((chart, ci) => {
                  const flatIdx = sectionOffsets[si] + ci
                  return (
                    <ChartCard
                      key={chart.file}
                      chart={chart}
                      number={flatIdx + 1}
                      accentBar={section.accentBar}
                      onClick={() => openChart(flatIdx)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightboxIdx != null && (
        <Lightbox
          chart={ALL_CHARTS[lightboxIdx]}
          index={lightboxIdx}
          total={ALL_CHARTS.length}
          onClose={closeLightbox}
          onPrev={prevChart}
          onNext={nextChart}
        />
      )}
    </>
  )
}
