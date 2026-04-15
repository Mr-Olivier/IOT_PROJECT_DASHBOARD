'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Invisible component that calls router.refresh() on an interval,
 * causing the server page to re-fetch fresh DB data.
 */
export default function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  return null
}
