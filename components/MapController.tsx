'use client'
import { useMemo, useRef } from 'react'
import { useAccount, useFollowing } from '@/hooks/useAccount'
import { EventActionOptions, EventActionType } from '@/contexts/AppContext'
import { useSubscribe } from '@/hooks/useSubscribe'
import { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { DAY, unixNow } from '@/utils/time'
import { useEventMarkers } from '@/hooks/useEventMakers'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context'
import { useFeedType } from '@/hooks/useFeedType'
import { extractQuery } from '@/utils/extractQuery'
import { useEvent } from '@/hooks/useEvent'
import { LngLat, LngLatBounds } from 'maplibre-gl'
import Geohash from 'latlon-geohash'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import bbox from '@turf/bbox'
import { nip19 } from 'nostr-tools'

const fullExtentGeohash = '0123456789bcdefghjkmnpqrstuvwxyz'.split('')
export const MapController = ({ q }: { q?: string }) => {
  const [follows] = useFollowing()
  const { user, signing } = useAccount()

  const feedType = useFeedType(q)
  const query = useMemo(() => extractQuery(q), [q])

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

  const g = useMemo(() => {
    if (signing) return
    let geohashFilter: string[] = fullExtentGeohash
    if (!query?.bbox && !query?.geohash) return geohashFilter
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
    return geohashFilter
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
    if (query?.npub) {
      const npubData = nip19.decode(query.npub)
      if (npubData.type !== 'npub') return
      return { authors: [npubData.data] }
    }
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
  }, [user?.pubkey, query?.npub, follows, listEvent, feedType])

  const filter = useMemo<NDKFilter | undefined>(() => {
    if (signing || loadingList) return
    return {
      ...(g ? { '#g': g } : undefined),
      ...(tags ? tags : authors),
      kinds: [NDKKind.Text],
      until: unixNow() - DAY,
    } as NDKFilter
  }, [signing, g, tags, authors, loadingList])

  const [data] = useSubscribe(filter, true)

  useEventMarkers(data)

  return null
}

export const mapClickHandler = (
  {
    setEventAction,
    router,
  }: {
    setEventAction: (eventAction?: EventActionOptions | undefined) => void
    router: AppRouterInstance
  },
  event: NDKEvent,
) => {
  router.push(location.pathname)
  setEventAction({
    type: EventActionType.View,
    event,
    options: {
      comments: true,
    },
  })
}
