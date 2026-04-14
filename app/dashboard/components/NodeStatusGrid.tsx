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
  nitrogen?: number | null
  phosphorus?: number | null
  potassium?: number | null
}

export interface NodeStatusGridProps {
  initialNodes: NodeData[]
}

export default function NodeStatusGrid({ initialNodes }: NodeStatusGridProps) {
  if (initialNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 bg-white border border-gray-100 rounded-2xl">
        <div className="bg-gray-50 p-4 rounded-2xl">
          <Radio size={28} className="text-gray-300" />
        </div>
        <p className="text-sm font-medium">No active sensor nodes</p>
        <p className="text-xs text-gray-300">Configure nodes in Settings</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {initialNodes.map((node) => (
        <Link
          key={node.id}
          href={`/nodes/${node.id}`}
          className="block hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
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
            nitrogen={node.nitrogen}
            phosphorus={node.phosphorus}
            potassium={node.potassium}
          />
        </Link>
      ))}
    </div>
  )
}
