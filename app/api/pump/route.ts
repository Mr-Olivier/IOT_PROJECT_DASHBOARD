import { NextRequest, NextResponse } from 'next/server'
import { getPumpState, recordPumpEvent } from '@/lib/pump'

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true
  const auth = req.headers.get('authorization')
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const event = await getPumpState()
  if (!event) {
    return NextResponse.json({ state: 'unknown' })
  }

  const elapsedMs = Date.now() - new Date(event.timestamp).getTime()
  return NextResponse.json({
    state: event.action as 'on' | 'off',
    source: event.source,
    elapsedMs,
    timestamp: event.timestamp,
  })
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { action?: string; nodeId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { action, nodeId } = body
  if (action !== 'on' && action !== 'off') {
    return NextResponse.json(
      { error: 'action must be "on" or "off"' },
      { status: 400 }
    )
  }

  const esp32Url = process.env.ESP32_PUMP_URL
  if (!esp32Url) {
    await recordPumpEvent({
      nodeId,
      source: 'manual',
      action,
      triggeredBy: 'user',
      success: false,
      errorMsg: 'ESP32_PUMP_URL is not configured',
    })
    return NextResponse.json(
      { error: 'ESP32_PUMP_URL is not configured' },
      { status: 502 }
    )
  }

  try {
    const esp32Res = await fetch(esp32Url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    if (!esp32Res.ok) {
      const errMsg = `ESP32 returned ${esp32Res.status}`
      await recordPumpEvent({
        nodeId,
        source: 'manual',
        action,
        triggeredBy: 'user',
        success: false,
        errorMsg: errMsg,
      })
      return NextResponse.json({ error: errMsg }, { status: 502 })
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Failed to reach ESP32'
    await recordPumpEvent({
      nodeId,
      source: 'manual',
      action,
      triggeredBy: 'user',
      success: false,
      errorMsg: errMsg,
    })
    return NextResponse.json({ error: errMsg }, { status: 502 })
  }

  await recordPumpEvent({
    nodeId,
    source: 'manual',
    action,
    triggeredBy: 'user',
    success: true,
  })

  const event = await getPumpState()
  if (!event) {
    return NextResponse.json({ state: 'unknown' })
  }

  const elapsedMs = Date.now() - new Date(event.timestamp).getTime()
  return NextResponse.json({
    state: event.action as 'on' | 'off',
    source: event.source,
    elapsedMs,
    timestamp: event.timestamp,
  })
}
