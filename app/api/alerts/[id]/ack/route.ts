import { NextRequest, NextResponse } from 'next/server'
import { acknowledgeAlert } from '@/lib/alerts'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const existing = await prisma.alert.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  await acknowledgeAlert(id)
  return NextResponse.json({ success: true })
}
