'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useFollowing } from '@/hooks/useAccount'
import { EventActionOptions, EventActionType } from '@/contexts/AppContext'
import { useSubscribe } from '@/hooks/useSubscribe'
import { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { useMap } from '@/hooks/useMap'
import { DAY, unixNow } from '@/utils/time'
import { useEventMarkers } from '@/hooks/useEventMakers'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context'

const fullExtentGeohash = '0123456789bcdefghjkmnpqrstuvwxyz'.split('')
export const MapController = ({
  q,
  pathname = '/',
}: {
  q?: string
  pathname?: string
}) => {
  const map = useMap()
  const [follows] = useFollowing()
  const { user, signing } = useAccount()
  const [mapLoaded, setMapLoaded] = useState(false)
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  const feedType = useMemo(() => {
    if (user) {
      if (!q || q === 'following' || q === 'conversation') {
        return 'following'
      }
    }
    return 'global'
  }, [user, q])

  useEffect(() => {
    if (!map) return
    const handler = (evt: maplibregl.MapLibreEvent) => {
      setMapLoaded(true)
    }
    map.on('style.load', handler)
    return () => {
      map.off('style.load', handler)
    }
  }, [map])

  const authorsOrTags = useMemo(() => {
    if (user?.pubkey && follows && feedType === 'following') {
      return { authors: follows.map((d) => d.hexpubkey).concat([user?.pubkey]) }
    }
  }, [user?.pubkey, follows, feedType])

  const filter = useMemo<NDKFilter | undefined>(() => {
    if (signing) return
    return {
      ...authorsOrTags,
      kinds: [NDKKind.Text],
      until: unixNow() + DAY,
      '#g': fullExtentGeohash,
    } as NDKFilter
  }, [signing, authorsOrTags])

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
