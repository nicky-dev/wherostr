'use client'
import EventList from '@/components/EventList'
import { useSubscribe } from '@/hooks/useSubscribe'
import { DAY, unixNow } from '@/utils/time'
import { NDKFilter } from '@nostr-dev-kit/ndk'
import { useParams } from 'next/navigation'
import { useMemo, useRef } from 'react'
// import Geohash from 'latlon-geohash'

export default function Page() {
  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
  )
  const { geohash } = useParams()
  // const ll = useMemo(
  //   () => (typeof geohash === 'string' ? Geohash.decode(geohash) : undefined),
  //   [geohash],
  // )
  const filter = useMemo<NDKFilter | undefined>(() => {
    if (typeof geohash !== 'string') return
    return {
      '#g': [geohash],
      until: unixNow() + DAY,
    }
  }, [geohash])

  const [events, fetchMore, newItems, showNewItems] = useSubscribe(filter)

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
