import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'pump-config.json')

async function readConfig(): Promise<{ autoEnabled: boolean }> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { autoEnabled: true }
  }
}

async function writeConfig(config: { autoEnabled: boolean }): Promise<void> {
  const dir = path.dirname(CONFIG_PATH)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export async function GET(_req: NextRequest) {
  const config = await readConfig()
  return NextResponse.json({ autoEnabled: config.autoEnabled })
}

export async function PATCH(req: NextRequest) {
  let body: { enabled?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json(
      { error: '"enabled" must be a boolean' },
      { status: 400 }
    )
  }

  const config = { autoEnabled: body.enabled }
  await writeConfig(config)
  return NextResponse.json({ autoEnabled: config.autoEnabled })
}
