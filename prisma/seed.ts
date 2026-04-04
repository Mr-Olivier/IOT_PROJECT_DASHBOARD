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

// How many historical readings to generate per node (spread over last 7 days)
const READINGS_PER_NODE = 168 // one per hour for 7 days

function randomBetween(min: number, max: number, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function generateReadings(nodeId: string) {
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const intervalMs = sevenDaysMs / READINGS_PER_NODE

  return Array.from({ length: READINGS_PER_NODE }, (_, i) => {
    const timestamp = new Date(now - sevenDaysMs + i * intervalMs)
    // Simulate realistic sensor values with slight variation
    const hourOfDay = timestamp.getHours()
    const tempBase = hourOfDay >= 10 && hourOfDay <= 16 ? 32 : 24 // hotter midday
    return {
      nodeId,
      timestamp,
      soilMoisture: randomBetween(25, 75),
      temperature: randomBetween(tempBase - 3, tempBase + 3),
      humidity: randomBetween(45, 85),
      reservoirLevel: randomBetween(60, 95),
      ph: randomBetween(5.5, 7.5, 2),
    }
  })
}

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

  // Get node IDs
  const nodes = await prisma.sensorNode.findMany({ where: { slug: { in: NODES.map((n) => n.slug) } } })

  // Insert readings for each node
  for (const node of nodes) {
    const readings = generateReadings(node.id)
    await prisma.sensorReading.createMany({ data: readings, skipDuplicates: true })
    console.log(`📊 Inserted ${readings.length} readings for ${node.name}`)
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

  console.log('\n✨ Done! Use this API key to send readings:')
  console.log(`   API Key: ${API_KEY}`)
  console.log('\n📡 Example curl command:')
  console.log(`   curl -X POST http://localhost:3000/api/ingest \\`)
  console.log(`     -H "Content-Type: application/json" \\`)
  console.log(`     -H "x-api-key: ${API_KEY}" \\`)
  console.log(`     -d '{"nodeId":"node-1","timestamp":"${new Date().toISOString()}","soilMoisture":42,"temperature":28.5,"humidity":65,"reservoirLevel":80,"ph":6.8}'`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
// seed update
