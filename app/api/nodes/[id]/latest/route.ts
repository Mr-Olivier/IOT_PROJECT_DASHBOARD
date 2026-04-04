import { NextResponse } from 'next/server'
import { getLatestReading } from '@/lib/readings'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id: nodeId } = params

  try {
    const reading = await getLatestReading(nodeId)
    return NextResponse.json({ reading: reading ?? null })
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
