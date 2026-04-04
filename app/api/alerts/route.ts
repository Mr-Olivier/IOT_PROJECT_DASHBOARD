import { NextRequest, NextResponse } from 'next/server'
import { getAlertHistory } from '@/lib/alerts'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const nodeId = searchParams.get('nodeId') ?? undefined
  const acknowledgedParam = searchParams.get('acknowledged')
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')

  const acknowledged =
    acknowledgedParam !== null ? acknowledgedParam === 'true' : undefined
  const limit = limitParam !== null ? parseInt(limitParam, 10) : undefined
  const offset = offsetParam !== null ? parseInt(offsetParam, 10) : undefined

  const [alerts, total] = await Promise.all([
    getAlertHistory({ nodeId, acknowledged, limit, offset }),
    prisma.alert.count({
      where: {
        ...(nodeId !== undefined && { nodeId }),
        ...(acknowledged !== undefined && { acknowledged }),
      },
    }),
  ])

  return NextResponse.json({ alerts, total })
}
