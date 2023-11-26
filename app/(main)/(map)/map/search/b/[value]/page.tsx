'use client'

import { MapController } from '@/components/MapController'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'

export default function Page() {
  const { value } = useParams()

  const q = useMemo(
    () => (typeof value === 'string' ? decodeURIComponent(value) : ''),
    [value],
  )
  if (!q) return

  return <MapController q={`b:${q}`} />
}
