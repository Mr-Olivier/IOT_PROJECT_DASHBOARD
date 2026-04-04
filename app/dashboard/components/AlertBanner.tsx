'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export interface AlertData {
  id: string
  nodeId: string
  metric: string
  breachValue: number
  thresholdValue: number
  direction: 'above' | 'below'
  acknowledged: boolean
  createdAt: string
}

export interface AlertBannerProps {
  initialAlerts?: AlertData[]
}

function formatMetric(metric: string): string {
  const labels: Record<string, string> = {
    soilMoisture: 'Soil Moisture',
    temperature: 'Temperature',
    humidity: 'Humidity',
    reservoirLevel: 'Reservoir Level',
    ph: 'pH',
  }
  return labels[metric] ?? metric
}

export default function AlertBanner({ initialAlerts = [] }: AlertBannerProps) {
  const [alerts, setAlerts] = useState<AlertData[]>(initialAlerts.filter((a) => !a.acknowledged))
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set())
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const es = new EventSource('/api/stream')
    eventSourceRef.current = es

    es.addEventListener('alert', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        const alert: AlertData = payload.data
        if (!alert.acknowledged) {
          setAlerts((prev) => {
            if (prev.some((a) => a.id === alert.id)) return prev
            return [alert, ...prev]
          })
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`AquaSense Alert — ${formatMetric(alert.metric)}`, {
              body: `Node ${alert.nodeId}: ${alert.breachValue.toFixed(2)} is ${alert.direction} threshold ${alert.thresholdValue.toFixed(2)}`,
              icon: '/favicon.ico',
            })
          }
        }
      } catch {
        // ignore malformed events
      }
    })

    return () => { es.close(); eventSourceRef.current = null }
  }, [])

  async function handleAcknowledge(id: string) {
    setAcknowledging((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/alerts/${id}/ack`, { method: 'POST' })
      if (res.ok) setAlerts((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setAcknowledging((prev) => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  if (alerts.length === 0) return null

  return (
    <div className="flex flex-col gap-2" role="alert" aria-live="polite">
      {alerts.map((alert) => {
        const isHigh = alert.direction === 'above'
        return (
          <div
            key={alert.id}
            className={`flex items-start justify-between gap-4 rounded-xl px-4 py-3 border ${
              isHigh
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={16}
                className={`mt-0.5 shrink-0 ${isHigh ? 'text-red-500' : 'text-amber-500'}`}
              />
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="font-semibold">
                  {formatMetric(alert.metric)} — Node <span className="font-mono">{alert.nodeId}</span>
                </span>
                <span className="text-xs opacity-75">
                  Value <span className="font-mono font-medium">{alert.breachValue.toFixed(2)}</span>{' '}
                  is <span className="font-medium">{alert.direction}</span> threshold{' '}
                  <span className="font-mono font-medium">{alert.thresholdValue.toFixed(2)}</span>
                </span>
              </div>
            </div>
            <button
              onClick={() => handleAcknowledge(alert.id)}
              disabled={acknowledging.has(alert.id)}
              aria-label="Acknowledge alert"
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isHigh
                  ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300'
              }`}
            >
              <X size={12} />
              {acknowledging.has(alert.id) ? 'Acknowledging…' : 'Dismiss'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
