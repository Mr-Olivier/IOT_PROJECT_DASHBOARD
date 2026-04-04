'use client'

import { useState } from 'react'
import { Server, Pencil, Trash2 } from 'lucide-react'

interface NodeRow {
  id: string
  name: string
  zone: string | null
  isActive: boolean
}

interface NodeManagementProps {
  initialNodes: NodeRow[]
}

export default function NodeManagement({ initialNodes }: NodeManagementProps) {
  const [nodes, setNodes] = useState<NodeRow[]>(initialNodes)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRename(id: string) {
    if (!renameValue.trim()) return
    setLoading(id)
    setError(null)
    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      if (res.ok) {
        setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, name: renameValue.trim() } : n)))
        setRenaming(null)
        setRenameValue('')
      } else {
        const data = await res.json()
        setError(data.error ?? 'Rename failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(null)
    }
  }

  async function handleDecommission(id: string) {
    if (!confirm('Decommission this node? It will be marked inactive.')) return
    setLoading(id)
    setError(null)
    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      if (res.ok) {
        setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, isActive: false } : n)))
      } else {
        const data = await res.json()
        setError(data.error ?? 'Decommission failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Server size={16} className="text-gray-500" />
        <h2 className="text-gray-900 font-semibold text-base">Node Management</h2>
      </div>

      {error && (
        <div className="mx-5 mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide bg-gray-50">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {nodes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No nodes registered.</td>
              </tr>
            ) : (
              nodes.map((node) => (
                <tr key={node.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {renaming === node.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(node.id)
                          if (e.key === 'Escape') { setRenaming(null); setRenameValue('') }
                        }}
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-40"
                        autoFocus
                      />
                    ) : (
                      node.name
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{node.zone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      node.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {node.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {renaming === node.id ? (
                        <>
                          <button
                            onClick={() => handleRename(node.id)}
                            disabled={loading === node.id}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                          >
                            {loading === node.id ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => { setRenaming(null); setRenameValue('') }}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setRenaming(node.id); setRenameValue(node.name) }}
                          disabled={loading === node.id}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
                        >
                          <Pencil size={11} /> Rename
                        </button>
                      )}
                      {node.isActive && (
                        <button
                          onClick={() => handleDecommission(node.id)}
                          disabled={loading === node.id}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={11} /> {loading === node.id ? 'Working...' : 'Decommission'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
