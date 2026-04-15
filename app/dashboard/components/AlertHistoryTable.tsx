'use client'

import { useState } from 'react'
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AlertData } from './AlertBanner'

export interface AlertHistoryTableProps {
  initialAlerts?: AlertData[]
  initialTotal?: number
}

const PAGE_SIZE = 10

function formatMetric(metric: string): string {
  const labels: Record<string, string> = {
    soilMoisture: 'Soil Moisture',
    temperature: 'Temperature',
    humidity: 'Humidity',
    reservoirLevel: 'Reservoir Level',
    nitrogen: 'Nitrogen',
    phosphorus: 'Phosphorus',
    potassium: 'Potassium',
  }
  return labels[metric] ?? metric
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })
}

export default function AlertHistoryTable({
  initialAlerts = [],
  initialTotal = 0,
}: AlertHistoryTableProps) {
  const [alerts, setAlerts] = useState<AlertData[]>(initialAlerts)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set())

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function fetchPage(targetPage: number) {
    setLoading(true)
    try {
      const offset = (targetPage - 1) * PAGE_SIZE
      const res = await fetch(`/api/alerts?offset=${offset}&limit=${PAGE_SIZE}`)
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts ?? [])
        setTotal(data.total ?? 0)
        setPage(targetPage)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAcknowledge(id: string) {
    setAcknowledging((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/alerts/${id}/ack`, { method: 'POST' })
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true } : a))
      }
    } finally {
      setAcknowledging((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Bell size={16} className="text-gray-500" />
        <h2 className="text-gray-900 font-semibold text-base">Alert History</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide bg-gray-50">
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3">Node</th>
              <th className="px-4 py-3">Breach</th>
              <th className="px-4 py-3">Threshold</th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No alerts found.</td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className={`border-b border-gray-100 transition-colors ${
                    !alert.acknowledged
                      ? alert.direction === 'above'
                        ? 'bg-red-50/60 hover:bg-red-50'
                        : 'bg-amber-50/60 hover:bg-amber-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 text-gray-900 font-medium">{formatMetric(alert.metric)}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{alert.nodeId}</td>
                  <td className="px-4 py-3 font-mono text-gray-700">{alert.breachValue.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-gray-700">{alert.thresholdValue.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      alert.direction === 'above' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {alert.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(alert.createdAt)}</td>
                  <td className="px-4 py-3">
                    {alert.acknowledged ? (
                      <span className="text-xs text-emerald-600 font-medium">Acknowledged</span>
                    ) : (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={acknowledging.has(alert.id)}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
                      >
                        {acknowledging.has(alert.id) ? 'Acking...' : 'Acknowledge'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
        <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button
            onClick={() => fetchPage(page - 1)}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={12} /> Previous
          </button>
          <button
            onClick={() => fetchPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
