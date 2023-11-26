'use client'

import { useParams } from 'next/navigation'
import { MapController } from '@/components/MapController'

export default function Page() {
  const { value } = useParams()
  return <MapController q={'p:' + value} />
}
