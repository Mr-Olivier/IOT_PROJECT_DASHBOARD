import Link from 'next/link'
import SensorCard from './SensorCard'
import { Radio } from 'lucide-react'

interface NodeData {
  id: string
  name: string
  zone?: string
  isOffline: boolean
  lastSeen?: string
  soilMoisture?: number
  temperature?: number
  humidity?: number
  reservoirLevel?: number
  ph?: number
}

export interface NodeStatusGridProps {
  initialNodes: NodeData[]
}

export default function NodeStatusGrid({ initialNodes }: NodeStatusGridProps) {
  if (initialNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <Radio size={32} className="text-gray-300" />
        <p className="text-sm">No active sensor nodes</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {initialNodes.map((node) => (
        <Link
          key={node.id}
          href={`/nodes/${node.id}`}
          className="block hover:scale-[1.01] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
        >
          <SensorCard
            nodeId={node.id}
            name={node.name}
            zone={node.zone}
            isOffline={node.isOffline}
            lastSeen={node.lastSeen}
            soilMoisture={node.soilMoisture}
            temperature={node.temperature}
            humidity={node.humidity}
            reservoirLevel={node.reservoirLevel}
            ph={node.ph}
          />
        </Link>
      ))}
    </div>
  )
}
