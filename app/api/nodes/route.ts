import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getActiveNodes, registerNode, isNodeOffline } from '@/lib/nodes'
import { getLatestReading } from '@/lib/readings'

export async function GET() {
  try {
    const nodes = await getActiveNodes()
    const now = new Date()

    const nodesWithStatus = await Promise.all(
      nodes.map(async (node) => {
        const latest = await getLatestReading(node.id)
        const isOffline = latest
          ? isNodeOffline(latest.timestamp, now)
          : true
        return { ...node, isOffline }
      })
    )

    return NextResponse.json({ nodes: nodesWithStatus })
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'validation', fields: { _root: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const { slug, name, zone, location } = body as {
    slug?: string
    name?: string
    zone?: string
    location?: string
  }

  if (!slug || !name) {
    return NextResponse.json(
      { error: 'validation', fields: { ...(slug ? {} : { slug: 'required' }), ...(name ? {} : { name: 'required' }) } },
      { status: 400 }
    )
  }

  try {
    const apiKey = crypto.randomBytes(32).toString('hex')
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    const node = await registerNode({ slug, name, zone, location, apiKeyHash })

    return NextResponse.json({ node, apiKey }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
