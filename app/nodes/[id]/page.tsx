import { redirect } from 'next/navigation'
import { getNodeById } from '@/lib/nodes'
import { getHistoricalReadings } from '@/lib/readings'
import NodeDetailCharts from './components/NodeDetailCharts'

export const dynamic = 'force-dynamic'

interface NodePageProps {
  params: { id: string }
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
  }))

  return (
    <main className="bg-gray-50 min-h-screen px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{node.name}</h1>
        {node.zone && (
          <p className="text-sm text-gray-500 mt-1">Zone: {node.zone}</p>
        )}
      </div>

      <NodeDetailCharts nodeId={node.id} initialReadings={serializedReadings} />
    </main>
  )
}
