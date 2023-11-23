'use client'
import Geohash from 'latlon-geohash'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'

export default function Page() {
  const { geohash } = useParams()
  const ll = useMemo(
    () => (typeof geohash === 'string' ? Geohash.decode(geohash) : undefined),
    [geohash],
  )
  return <div>{ll ? JSON.stringify(ll) : undefined}</div>
}
