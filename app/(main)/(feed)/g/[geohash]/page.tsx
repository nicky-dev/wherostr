'use client'
import EventList from '@/components/EventList'
import { useMap } from '@/hooks/useMap'
import { useSubscribe } from '@/hooks/useSubscribe'
import { DAY, unixNow } from '@/utils/time'
import { NDKFilter } from '@nostr-dev-kit/ndk'
import Geohash from 'latlon-geohash'
import { LngLat, LngLatBounds } from 'maplibre-gl'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'

export default function Page() {
  const map = useMap()
  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
  )
  const { geohash } = useParams()
  const filter = useMemo<NDKFilter | undefined>(() => {
    if (typeof geohash !== 'string') return
    return {
      '#g': [geohash],
      until: unixNow() + DAY,
    }
  }, [geohash])

  const [events, fetchMore, newItems, showNewItems] = useSubscribe(filter)

  const ll = useMemo(
    () => (typeof geohash === 'string' ? Geohash.decode(geohash) : undefined),
    [geohash],
  )

  useEffect(() => {
    if (!map || !ll) return
    setTimeout(() => {
      map.fitBounds(LngLatBounds.fromLngLat(new LngLat(ll.lon, ll.lat), 1000), {
        duration: 1000,
        maxZoom: 16,
      })
    }, 1000)
  }, [map, ll])

  return (
    <EventList
      parentRef={scrollRef}
      events={events}
      onFetchMore={fetchMore}
      newItems={newItems}
      onShowNewItems={showNewItems}
    />
  )
}
