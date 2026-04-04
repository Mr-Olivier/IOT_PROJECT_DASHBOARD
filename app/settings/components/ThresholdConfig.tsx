'use client'

import { useState } from 'react'
import { SlidersHorizontal, CheckCircle } from 'lucide-react'

const METRICS = [
  { key: 'soilMoisture', label: 'Soil Moisture', unit: '%' },
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'humidity', label: 'Humidity', unit: '%' },
  { key: 'reservoirLevel', label: 'Reservoir Level', unit: 'cm' },
  { key: 'ph', label: 'pH', unit: 'pH' },
]

interface ThresholdRow {
  id: string
  metric: string
  minValue: number | null
  maxValue: number | null
  nodeId: string | null
}

interface NodeOption {
  id: string
  name: string
}

interface ThresholdConfigProps {
  initialThresholds: ThresholdRow[]
  nodes: NodeOption[]
}

interface FormState {
  metric: string
  nodeId: string
  minValue: string
  maxValue: string
}

export default function ThresholdConfig({ initialThresholds, nodes }: ThresholdConfigProps) {
  const [thresholds, setThresholds] = useState<ThresholdRow[]>(initialThresholds)
  const [form, setForm] = useState<FormState>({ metric: 'soilMoisture', nodeId: '', minValue: '', maxValue: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setFieldErrors({})
    setSuccess(false)

    const body: Record<string, unknown> = { metric: form.metric }
    if (form.nodeId) body.nodeId = form.nodeId
    if (form.minValue !== '') body.minValue = parseFloat(form.minValue)
    if (form.maxValue !== '') body.maxValue = parseFloat(form.maxValue)

    try {
      const res = await fetch('/api/alerts/thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields)
        else setError(data.error ?? 'Save failed')
      } else {
        setThresholds((prev) => {
          const idx = prev.findIndex(
            (t) => t.metric === data.threshold.metric && t.nodeId === (data.threshold.nodeId ?? null)
          )
          if (idx >= 0) { const next = [...prev]; next[idx] = data.threshold; return next }
          return [...prev, data.threshold]
        })
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "bg-white border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
  const labelClass = "text-xs text-gray-500 font-medium"

  return (
    <div className="flex flex-col gap-6">
      {/* Current thresholds table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-gray-500" />
          <h2 className="text-gray-900 font-semibold text-base">Current Thresholds</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide bg-gray-50">
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">Node</th>
                <th className="px-4 py-3">Min</th>
                <th className="px-4 py-3">Max</th>
              </tr>
            </thead>
            <tbody>
              {thresholds.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No thresholds configured.</td>
                </tr>
              ) : (
                thresholds.map((t) => {
                  const metaLabel = METRICS.find((m) => m.key === t.metric)?.label ?? t.metric
                  const nodeLabel = t.nodeId ? (nodes.find((n) => n.id === t.nodeId)?.name ?? t.nodeId) : 'Global'
                  return (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{metaLabel}</td>
                      <td className="px-4 py-3 text-gray-600">{nodeLabel}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{t.minValue !== null ? t.minValue : '—'}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{t.maxValue !== null ? t.maxValue : '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set threshold form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-gray-900 font-semibold text-base mb-4">Set Threshold</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Metric</label>
              <select
                value={form.metric}
                onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
                className={inputClass}
              >
                {METRICS.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              {fieldErrors.metric && <p className="text-xs text-red-500">{fieldErrors.metric}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Node (leave blank for global)</label>
              <select
                value={form.nodeId}
                onChange={(e) => setForm((f) => ({ ...f, nodeId: e.target.value }))}
                className={inputClass}
              >
                <option value="">Global</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Min Value</label>
              <input
                type="number"
                step="any"
                value={form.minValue}
                onChange={(e) => setForm((f) => ({ ...f, minValue: e.target.value }))}
                placeholder="Optional"
                className={inputClass}
              />
              {fieldErrors.minValue && <p className="text-xs text-red-500">{fieldErrors.minValue}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Max Value</label>
              <input
                type="number"
                step="any"
                value={form.maxValue}
                onChange={(e) => setForm((f) => ({ ...f, maxValue: e.target.value }))}
                placeholder="Optional"
                className={inputClass}
              />
              {fieldErrors.maxValue && <p className="text-xs text-red-500">{fieldErrors.maxValue}</p>}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <CheckCircle size={12} /> Threshold saved successfully.
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Threshold'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
