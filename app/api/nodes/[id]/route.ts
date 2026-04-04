import { NextRequest, NextResponse } from 'next/server'
import { updateNode, decommissionNode } from '@/lib/nodes'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'validation', fields: { _root: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const { name, zone, decommission } = body as {
    name?: string
    zone?: string
    decommission?: boolean
  }

  try {
    const node = decommission
      ? await decommissionNode(id)
      : await updateNode(id, { name, zone })

    return NextResponse.json({ node })
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
