import { Clock } from 'lucide-react'

interface DecisionRow {
  id: string
  timestamp: string
  nodeId: string | null
  decision: string
  confidence: number
  pumpCommand: boolean
  soilMoisture: number
  temperature: number
  humidity: number
  reservoirLevel: number
  modelVersion: string
}

interface Props {
  history: DecisionRow[]
}

const BADGE: Record<string, string> = {
  IRRIGATE:  'bg-blue-50 text-blue-700 border-blue-200',
  HOLD:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOW_WATER: 'bg-amber-50 text-amber-700 border-amber-200',
}

const PUMP_BADGE = {
  on:  'bg-blue-50 text-blue-600 border-blue-100',
  off: 'bg-gray-50 text-gray-400 border-gray-100',
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 90 ? 'bg-emerald-400' : pct >= 70 ? 'bg-sky-400' : 'bg-amber-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600 tabular-nums w-8">{pct}%</span>
    </div>
  )
}

export default function MLHistoryTable({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-10 flex items-center justify-center shadow-sm">
        <p className="text-sm text-gray-300">No decision history yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Last {history.length} Decisions
          </span>
        </div>
        <span className="text-[10px] text-gray-300">
          most recent first
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              {['Time', 'Decision', 'Confidence', 'Pump', 'Soil %', 'Temp °C', 'Humidity %', 'Reservoir %', 'Node'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50/50 transition-colors ${i === 0 ? 'bg-violet-50/20' : ''}`}
              >
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                  {new Date(row.timestamp).toLocaleString([], {
                    month: 'short', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${BADGE[row.decision] ?? 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                    {row.decision === 'LOW_WATER' ? 'LOW WATER' : row.decision}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ConfidenceBar value={row.confidence} />
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${row.pumpCommand ? PUMP_BADGE.on : PUMP_BADGE.off}`}>
                    {row.pumpCommand ? 'ON' : 'OFF'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-gray-700 tabular-nums">
                  {row.soilMoisture.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-gray-700 tabular-nums">
                  {row.temperature.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-gray-700 tabular-nums">
                  {row.humidity.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-gray-700 tabular-nums">
                  {row.reservoirLevel.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                  {row.nodeId ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
