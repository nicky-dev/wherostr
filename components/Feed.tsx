'use client'
import EventList from '@/components/EventList'
import { FollowHashtagButton } from '@/components/FollowHashtagButton'
import { useAccount, useFollowing } from '@/hooks/useAccount'
import { useEvent } from '@/hooks/useEvent'
import { useMap, useMapLoaded } from '@/hooks/useMap'
import { useSubscribe } from '@/hooks/useSubscribe'
import { extractQuery } from '@/utils/extractQuery'
import { DAY, unixNow } from '@/utils/time'
import { Box, Typography } from '@mui/material'
import { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import buffer from '@turf/buffer'
import Geohash from 'latlon-geohash'
import { LngLat, LngLatBounds } from 'maplibre-gl'
import { useEffect, useMemo, useRef } from 'react'
import { useEventMarkers } from '@/hooks/useEventMakers'
import { FeedToolbar } from './FeedToolbar'
import { useFeedType } from '@/hooks/useFeedType'

export default function Feed({
  q,
  pathname = '/',
}: {
  q?: string
  pathname?: string
}) {
  const map = useMap()
  const mapLoaded = useMapLoaded()
  const { user, signing } = useAccount()
  const [follows] = useFollowing()
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
  )

  const feedType = useFeedType(q)
  const query = useMemo(() => extractQuery(q), [q])

  const showComments = useMemo(() => feedType === 'conversation', [feedType])

  const [listEvent] = useEvent(query?.naddrDesc ? query.naddr : undefined)
  const loadingList = useMemo(
    () => query?.naddrDesc && !listEvent,
    [query?.naddrDesc, listEvent],
  )
  const bounds = useMemo(() => {
    if (query?.geohash) {
      const { lat, lon } = Geohash.decode(query?.geohash)
      return LngLatBounds.fromLngLat(new LngLat(lon, lat), 1000)
    }
    return new LngLatBounds(query?.bbox)
  }, [query?.bbox, query?.geohash])

  const geohashFilter = useMemo(() => {
    if (signing) return
    if (!query?.bbox && !query?.geohash) return
    let geohashFilter: string[] = []
    if (query.bbox) {
      const polygon = buffer(bboxPolygon(query.bbox), 5, {
        units: 'kilometers',
      })
      const bounds = bbox(polygon)
      const bboxhash1 = Geohash.encode(bounds[1], bounds[0], 1)
      const bboxhash2 = Geohash.encode(bounds[3], bounds[2], 1)
      const bboxhash3 = Geohash.encode(bounds[1], bounds[2], 1)
      const bboxhash4 = Geohash.encode(bounds[3], bounds[0], 1)
      geohashFilter = Array.from(
        new Set([bboxhash1, bboxhash2, bboxhash3, bboxhash4]),
      )
    } else if (query?.geohash) {
      geohashFilter = [query.geohash]
    }
    return {
      kinds: [NDKKind.Text, NDKKind.Repost],
      until: unixNow() + DAY,
      '#g': geohashFilter,
    }
  }, [signing, query?.bbox, query?.geohash])

  const tags = useMemo(() => {
    const tags = query?.tags
      ? new Set(query?.tags.map((d) => d.trim().toLowerCase()))
      : undefined
    if (!!tags?.size) {
      return { '#t': Array.from(tags) }
    }
  }, [query?.tags])

  const authors = useMemo(() => {
    if (listEvent) {
      const tags = listEvent.getMatchingTags('p')
      return { authors: tags.map(([, pubkey]) => pubkey) }
    }
    if (
      user?.pubkey &&
      follows &&
      (feedType === 'following' || feedType === 'conversation')
    ) {
      return { authors: follows.map((d) => d.hexpubkey).concat([user?.pubkey]) }
    }
  }, [user?.pubkey, follows, listEvent, feedType])

  const filter = useMemo<NDKFilter | undefined>(() => {
    if (signing || loadingList) return
    if (geohashFilter) return geohashFilter
    return {
      ...(tags ? tags : authors),
      kinds: [NDKKind.Text, NDKKind.Repost],
      since: unixNow() - DAY,
      limit: 50,
    } as NDKFilter
  }, [signing, geohashFilter, tags, authors, loadingList])

  const [data, fetchMore, newItems, showNewItems] = useSubscribe(filter)

  const events = useMemo(() => {
    if (!filter) return []
    if (!bounds.isEmpty()) {
      return data.filter((d) => {
        const geohashes = d.getMatchingTags('g')
        if (!geohashes.length) return
        geohashes.sort((a, b) => b[1].length - a[1].length)
        if (!geohashes[0]) return
        const { lat, lon } = Geohash.decode(geohashes[0][1])
        if (!bounds.contains({ lat, lon })) return
        return true
      })
    }
    return data
  }, [bounds, filter, data])

  useEffect(() => {
    if (!map || !mapLoaded) return
    try {
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { duration: 1000, maxZoom: 15 })
      }
    } catch (err) {}
  }, [map, mapLoaded, bounds])

  useEventMarkers(events)

  return (
    <>
      <FeedToolbar feedType={feedType} query={query} pathname={pathname} />
      {!!query?.tags?.[0] && (
        <Box className="flex gap-2 items-center px-3 py-2 justify-between">
          <Typography variant="h6">#{query.tags[0]}</Typography>
          <Box className="flex-1" />
          <FollowHashtagButton hashtag={query.tags[0]} />
        </Box>
      )}
      <EventList
        parentRef={scrollRef}
        events={events}
        onFetchMore={fetchMore}
        newItems={newItems}
        onShowNewItems={showNewItems}
        showComments={!!query || showComments}
      />
    </>
  )
}
