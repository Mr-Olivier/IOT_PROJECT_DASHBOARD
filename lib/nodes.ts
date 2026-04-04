import { prisma } from '@/lib/prisma'

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export function isNodeOffline(lastTimestamp: Date, now: Date): boolean {
  return now.getTime() - lastTimestamp.getTime() > OFFLINE_THRESHOLD_MS
}

export function getActiveNodes() {
  return prisma.sensorNode.findMany({
    where: { isActive: true },
  })
}

export function getNodeById(id: string) {
  return prisma.sensorNode.findUnique({
    where: { id },
  })
}

export function registerNode(payload: {
  slug: string
  name: string
  zone?: string
  location?: string
  apiKeyHash: string
}) {
  return prisma.sensorNode.create({
    data: payload,
  })
}

export function updateNode(
  id: string,
  patch: { name?: string; zone?: string; isActive?: boolean }
) {
  return prisma.sensorNode.update({
    where: { id },
    data: patch,
  })
}

export function decommissionNode(id: string) {
  return prisma.sensorNode.update({
    where: { id },
    data: { isActive: false },
  })
}
