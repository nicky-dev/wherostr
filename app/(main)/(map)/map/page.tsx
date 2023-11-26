'use client'
import { MapController } from '@/components/MapController'
import { useSearchParams } from 'next/navigation'

export default function Page() {
  const query = useSearchParams()
  const q = query.get('q') || ''
  return <MapController q={q} />
}
