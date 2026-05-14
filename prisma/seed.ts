import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// The plain-text API key you'll use in curl / ESP32 code
const API_KEY = 'aquasense-demo-key-123'
const API_KEY_HASH = crypto.createHash('sha256').update(API_KEY).digest('hex')

// Nodes to create
const NODES = [
  { slug: 'node-1', name: 'Field Node A', zone: 'Zone 1 — North Field' },
  { slug: 'node-2', name: 'Field Node B', zone: 'Zone 2 — South Field' },
]


async function main() {
  console.log('🌱 Seeding AquaSense demo data...\n')

  // Upsert nodes
  for (const n of NODES) {
    await prisma.sensorNode.upsert({
      where: { slug: n.slug },
      update: { name: n.name, zone: n.zone, apiKeyHash: API_KEY_HASH, isActive: true },
      create: { slug: n.slug, name: n.name, zone: n.zone, apiKeyHash: API_KEY_HASH, isActive: true },
    })
    console.log(`✅ Node created: ${n.name} (slug: ${n.slug})`)
  }

  // Seed some thresholds (global)
  const thresholdData = [
    { metric: 'soilMoisture', minValue: 0, maxValue: 100 },
    { metric: 'temperature', minValue: 0, maxValue: 50 },
    { metric: 'ph', minValue: 4.0, maxValue: 9.0 },
    { metric: 'reservoirLevel', minValue: 0, maxValue: null },
  ]

  for (const t of thresholdData) {
    await prisma.threshold.upsert({
      where: { id: `global-${t.metric}` },
      update: t,
      create: { id: `global-${t.metric}`, ...t },
    })
  }
  console.log('⚙️  Global thresholds seeded')

  console.log('\n✨ Nodes and thresholds ready.')
  console.log(`   API Key: ${API_KEY}`)
  console.log('\n▶  Next step — seed 100,000 historical readings (March 5 → April 7 2026):')
  console.log('   node prisma/seed_historical.js')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())