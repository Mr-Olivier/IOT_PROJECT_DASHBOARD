import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getNodeById } from '@/lib/nodes'
import { getHistoricalReadings } from '@/lib/readings'
import NodeDetailCharts from './components/NodeDetailCharts'
import SensorMetricsRow from './components/SensorMetricsRow'
import { ArrowLeft, Wifi, WifiOff, MapPin, Clock, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface NodePageProps {
  params: { id: string }
}

function formatRelativeTime(d: Date): string {
  const diff = Date.now() - d.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function NodePage({ params }: NodePageProps) {
  const node = await getNodeById(params.id)

  if (!node) {
    redirect('/dashboard')
  }

  const end = new Date()
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  const readings = await getHistoricalReadings(node.id, start, end)

  const serializedReadings = readings.map((r) => ({
    timestamp: r.timestamp.toISOString(),
    soilMoisture: r.soilMoisture,
    temperature: r.temperature,
    humidity: r.humidity,
    reservoirLevel: r.reservoirLevel,
    ph: r.ph,
    nitrogen: r.nitrogen ?? null,
    phosphorus: r.phosphorus ?? null,
    potassium: r.potassium ?? null,
  }))

  const latest = serializedReadings.length > 0
    ? serializedReadings[serializedReadings.length - 1]
    : null

  const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000
  const isOffline = !latest || (Date.now() - new Date(latest.timestamp).getTime() > OFFLINE_THRESHOLD_MS)
  const lastSeenStr = latest ? formatRelativeTime(new Date(latest.timestamp)) : 'Never'

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-5 md:px-8">
        <div className="max-w-screen-xl mx-auto">
          {/* Breadcrumb */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-600 transition-colors mb-3 group"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Node identity */}
            <div className="flex items-center gap-4">
              {/* Status ring */}
              <div className={`relative shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
                isOffline ? 'bg-red-50' : 'bg-emerald-50'
              }`}>
                {!isOffline && (
                  <span className="absolute inset-0 rounded-2xl animate-ping bg-emerald-400 opacity-20" />
                )}
                <Activity size={22} className={isOffline ? 'text-red-400' : 'text-emerald-600'} />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{node.name}</h1>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isOffline
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {isOffline ? <WifiOff size={11} /> : <Wifi size={11} />}
                    {isOffline ? 'Offline' : 'Online'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  {node.zone && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={11} />
                      {node.zone}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-400" suppressHydrationWarning>
                    <Clock size={11} />
                    Last seen: {lastSeenStr}
                  </span>
                  <span className="text-xs text-gray-400">
                    {serializedReadings.length.toLocaleString()} records (last 24 h)
                  </span>
                </div>
              </div>
            </div>

            {/* Live badge */}
            {!isOffline && (
              <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5 self-start">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-emerald-700">Live Streaming</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Page body ──────────────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-4 py-6 md:px-8 flex flex-col gap-6">

        {/* ── Section label ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Live Sensor Readings
          </h2>
          {/* Metric cards in a row */}
          <SensorMetricsRow nodeId={node.id} readings={serializedReadings} />
        </div>

        {/* ── Charts section ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Time-Series Analysis
          </h2>
          <NodeDetailCharts nodeId={node.id} initialReadings={serializedReadings} />
        </div>
      </div>
    </main>
  )
}
