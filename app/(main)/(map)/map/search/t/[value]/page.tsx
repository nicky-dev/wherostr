'use client'

import { MapController } from '@/components/MapController'
import { useParams } from 'next/navigation'

export default function Page() {
  const { value } = useParams()
  return <MapController q={`t:${value}`} />
}
