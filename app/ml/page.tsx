import { prisma } from '@/lib/prisma'
import AutoRefresh from '@/app/dashboard/components/AutoRefresh'
import MLHeroCard from './components/MLHeroCard'
import MLMetricsRow from './components/MLMetricsRow'
import MLFeatureImportance from './components/MLFeatureImportance'
import MLDecisionDistribution from './components/MLDecisionDistribution'
import MLHistoryTable from './components/MLHistoryTable'
import MLHowItWorks from './components/MLHowItWorks'
import LiveArduinoCommand from './components/LiveArduinoCommand'
import AnalysisCharts from './components/AnalysisCharts'
import {
  Brain,
  Activity,
  Database,
  TrendingUp,
  Zap,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MLPage() {
  const now = new Date()

  // ── Fetch all ML data in parallel ────────────────────────────────────────
  const [latest, history, irrigateCount, holdCount, lowWaterCount, totalReadings, mlStatus] =
    await Promise.all([
      prisma.irrigationDecision.findFirst({ orderBy: { timestamp: 'desc' } }),

      prisma.irrigationDecision.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
        select: {
          id: true, timestamp: true, nodeId: true,
          decision: true, confidence: true, pumpCommand: true,
          soilMoisture: true, temperature: true,
          humidity: true, reservoirLevel: true, modelVersion: true,
        },
      }),

      prisma.irrigationDecision.count({ where: { decision: 'IRRIGATE' } }),
      prisma.irrigationDecision.count({ where: { decision: 'HOLD' } }),
      prisma.irrigationDecision.count({ where: { decision: 'LOW_WATER' } }),
      prisma.sensorReading.count(),

      fetch('http://localhost:5001/status', { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => null) as Promise<MLStatusResponse | null>,
    ])

  const total = irrigateCount + holdCount + lowWaterCount

  const counts = { IRRIGATE: irrigateCount, HOLD: holdCount, LOW_WATER: lowWaterCount, total }

  const serializedLatest = latest
    ? { ...latest, timestamp: latest.timestamp.toISOString() }
    : null

  const serializedHistory = history.map((d) => ({
    ...d,
    timestamp: d.timestamp.toISOString(),
  }))

  // Stats bar values
  const accuracy = mlStatus?.metrics?.accuracy ?? null
  const irrigatePct = total > 0 ? Math.round((irrigateCount / total) * 100) : 0

  return (
    <main className="bg-[#f8fafc] min-h-screen">
      <AutoRefresh intervalMs={6000} />

      {/* ══ HERO HEADER ══════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100 px-4 py-5 md:px-8">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-3 rounded-2xl shadow-md shadow-violet-100">
              <Brain size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight tracking-tight">
                AI Irrigation Intelligence
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Random Forest Model · Live Sensor Decisions · Automated Pump Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 border rounded-full px-3 py-1.5 text-xs font-bold ${
              mlStatus?.model_loaded
                ? 'bg-violet-50 border-violet-100 text-violet-700'
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}>
              <span className="relative flex h-2 w-2">
                {mlStatus?.model_loaded && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  mlStatus?.model_loaded ? 'bg-violet-500' : 'bg-gray-300'
                }`} />
              </span>
              {mlStatus?.model_loaded ? 'Model Active' : 'Model Offline'}
            </div>

            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-full px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Activity className="w-3 h-3 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">Live</span>
            </div>

            <span className="hidden md:block text-xs text-gray-400" suppressHydrationWarning>
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6 md:px-8 space-y-7">

        {/* ══ STATS BAR ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label:      'Total Decisions',
              value:      total.toLocaleString(),
              sub:        'since system started',
              icon:       Brain,
              iconBg:     'bg-violet-50',
              iconColor:  'text-violet-500',
              valueColor: 'text-violet-600',
            },
            {
              label:      'Model Accuracy',
              value:      accuracy != null ? `${(accuracy * 100).toFixed(1)}%` : '—',
              sub:        'on 20% hold-out test set',
              icon:       TrendingUp,
              iconBg:     'bg-emerald-50',
              iconColor:  'text-emerald-500',
              valueColor: 'text-emerald-600',
            },
            {
              label:      'Irrigate Rate',
              value:      `${irrigatePct}%`,
              sub:        `${irrigateCount.toLocaleString()} irrigation events`,
              icon:       Zap,
              iconBg:     'bg-blue-50',
              iconColor:  'text-blue-500',
              valueColor: 'text-blue-600',
            },
            {
              label:      'Training Records',
              value:      (mlStatus?.recordCount ?? totalReadings).toLocaleString(),
              sub:        'sensor readings used to train',
              icon:       Database,
              iconBg:     'bg-sky-50',
              iconColor:  'text-sky-500',
              valueColor: 'text-sky-600',
            },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
              <div className={`${s.iconBg} p-2.5 rounded-xl shrink-0`}>
                <s.icon size={18} className={s.iconColor} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium truncate">{s.label}</p>
                <p className={`text-xl font-extrabold tabular-nums mt-0.5 ${s.valueColor}`}>{s.value}</p>
                <p className="text-[10px] text-gray-300 truncate">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ══ SECTION 1 — CURRENT DECISION ════════════════════════════════ */}
        <section>
          <SectionHeader
            title="Current Irrigation Decision"
            subtitle="The latest reading from the sensors — what the model decided and why"
            badge="Live"
            badgeColor="violet"
          />
          <MLHeroCard latest={serializedLatest} mlStatus={mlStatus} />
        </section>

        {/* ══ SECTION 2 — LIVE ARDUINO COMMAND ════════════════════════════ */}
        <section>
          <SectionHeader
            title="Live Arduino Command"
            subtitle="What the ML model tells the Arduino to do — CMD:PUMP=1 turns the relay ON, CMD:PUMP=0 turns it OFF"
            badge="Real-time"
            badgeColor="violet"
          />
          <LiveArduinoCommand />
        </section>

        {/* ══ SECTION 3 — MODEL PERFORMANCE ═══════════════════════════════ */}
        {mlStatus?.metrics && (
          <section>
            <SectionHeader
              title="Model Performance Metrics"
              subtitle="Evaluated on 20% of data held out during training — higher is better"
            />
            <MLMetricsRow metrics={mlStatus.metrics} trainedAt={mlStatus.trainedAt} recordCount={mlStatus.recordCount} />
          </section>
        )}

        {/* ══ SECTION 4 — FEATURE IMPORTANCE + DECISION DISTRIBUTION ══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <SectionHeader
              title="Feature Importance"
              subtitle="Which sensor influences the model's decisions the most"
            />
            <MLFeatureImportance importances={mlStatus?.importances ?? null} />
          </section>

          <section>
            <SectionHeader
              title="Decision Distribution"
              subtitle="Breakdown of all decisions across the full dataset"
            />
            <MLDecisionDistribution counts={counts} />
          </section>
        </div>

        {/* ══ SECTION 4b — DECISION HISTORY TABLE ═════════════════════════ */}
        <section>
          <SectionHeader
            title="Decision History"
            subtitle="Last 100 irrigation decisions — every sensor reading the model acted on"
          />
          <MLHistoryTable history={serializedHistory} />
        </section>

        {/* ══ SECTION 5 — PYTHON ANALYSIS CHARTS ══════════════════════════ */}
        <section>
          <SectionHeader
            title="Full Analysis Report — Charts & Findings"
            subtitle="11 charts generated by the Python pipeline across 3 categories: ML performance, irrigation decisions, and exploratory data analysis. Click any chart to enlarge."
            badge="Auto-updated"
            badgeColor="emerald"
          />
          <AnalysisCharts />
        </section>

        {/* ══ SECTION 6 — HOW IT WORKS ════════════════════════════════════ */}
        <section>
          <SectionHeader
            title="How the AI Model Works"
            subtitle="Technical explanation of the machine learning pipeline"
          />
          <MLHowItWorks
            recordCount={mlStatus?.recordCount ?? totalReadings}
            trainedAt={mlStatus?.trainedAt ?? null}
            classDistrib={mlStatus?.classDistrib ?? null}
          />
        </section>

      </div>
    </main>
  )
}

// ── Types ────────────────────────────────────────────────────────────────────
interface MLStatusResponse {
  status:       string
  model_loaded: boolean
  trainedAt?:   string
  recordCount?: number
  modelVersion?: string
  metrics?: { accuracy: number; precision: number; recall: number; f1: number }
  importances?: Record<string, number>
  classDistrib?: Record<string, number>
}

// ── Section header helper ─────────────────────────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  badge,
  badgeColor = 'amber',
}: {
  title: string
  subtitle?: string
  badge?: string
  badgeColor?: 'amber' | 'emerald' | 'violet'
}) {
  const badgeStyles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-600 border-amber-200',
    violet:  'bg-violet-50 text-violet-700 border-violet-200',
  }[badgeColor]

  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <div>
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
          {title}
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border normal-case tracking-normal ${badgeStyles}`}>
              {badge}
            </span>
          )}
        </h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
