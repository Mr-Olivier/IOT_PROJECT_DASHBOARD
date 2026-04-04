import { prisma } from '@/lib/prisma'
import { getThresholds } from '@/lib/thresholds'
import NodeManagement from './components/NodeManagement'
import ThresholdConfig from './components/ThresholdConfig'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [allNodes, globalThresholds] = await Promise.all([
    prisma.sensorNode.findMany({ orderBy: { createdAt: 'asc' } }),
    getThresholds(),
  ])

  const serializedNodes = allNodes.map((n) => ({
    id: n.id,
    name: n.name,
    zone: n.zone,
    isActive: n.isActive,
  }))

  const serializedThresholds = globalThresholds.map((t) => ({
    id: t.id,
    metric: t.metric,
    minValue: t.minValue,
    maxValue: t.maxValue,
    nodeId: t.nodeId,
  }))

  const nodeOptions = allNodes.map((n) => ({ id: n.id, name: n.name }))

  return (
    <main className="bg-gray-50 min-h-screen px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="flex flex-col gap-8">
        <section>
          <NodeManagement initialNodes={serializedNodes} />
        </section>

        <section>
          <ThresholdConfig
            initialThresholds={serializedThresholds}
            nodes={nodeOptions}
          />
        </section>
      </div>
    </main>
  )
}
