'use client'
import { MapView } from '@/components/MapView'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useFollowing } from '@/hooks/useAccount'
import { useAction } from '@/hooks/useApp'
import { EventActionType } from '@/contexts/AppContext'
import { useSubscribe } from '@/hooks/useSubscribe'
import { fetchProfile, profilePin } from '@/hooks/useUserProfile'
import Geohash from 'latlon-geohash'
import { useNDK } from '@/hooks/useNostr'
import { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { svgPin } from '@/constants/app'
import { useMap } from '@/hooks/useMap'
import { Marker } from 'maplibre-gl'
import { DAY, unixNow } from '@/utils/time'

const markers: Record<string, Marker> = {}
const fullExtentGeohash = '0123456789bcdefghjkmnpqrstuvwxyz'.split('')
export default function Page() {
  return (
    <>
      <MapView className="fixed inset-0" />
      <MapController />
    </>
  )
}

const MapController = () => {
  const ndk = useNDK()
  const map = useMap()
  const { setEventAction } = useAction()
  const [follows] = useFollowing()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, signing } = useAccount()
  const [mapLoaded, setMapLoaded] = useState(false)
  const q = searchParams.get('q')
  const queryRef = useRef(q)
  queryRef.current = q

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
    if (signing || !mapLoaded) return
    return {
      ...authorsOrTags,
      kinds: [NDKKind.Text],
      until: unixNow() + DAY,
      '#g': fullExtentGeohash,
    } as NDKFilter
  }, [signing, mapLoaded, authorsOrTags])

  const [data] = useSubscribe(filter, true)

  const clickHandler = (event: NDKEvent) => {
    router.replace(`${pathname}?q=${queryRef.current || ''}`, {
      scroll: false,
    })
    setEventAction({
      type: EventActionType.View,
      event,
      options: {
        comments: true,
      },
    })
  }

  const features = useMemo(() => {
    if (!filter) return []
    return data
      .map((event) => {
        const geohashes = event.getMatchingTags('g')
        if (!geohashes.length) return
        geohashes.sort((a, b) => b[1].length - a[1].length)
        if (!geohashes[0]) return
        const { lat, lon } = Geohash.decode(geohashes[0][1])
        if (!lat || !lon) return
        const nostrEvent = event.rawEvent()
        const geojson = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          id: event.id,
          event,
          properties: nostrEvent,
        }
        return geojson
      })
      .filter((event) => !!event)
  }, [data, filter])

  const generatePin = useCallback(
    async (pubkey: string) => {
      try {
        const profile = await fetchProfile(pubkey, ndk)
        if (profile?.image && !map?.hasImage(pubkey)) {
          return profilePin
            .replaceAll('{URL}', profile.image)
            .replaceAll('{ID}', pubkey)
        }
      } catch (err) {
        return svgPin
      }
    },
    [ndk, map],
  )

  useEffect(() => {
    if (!map || !mapLoaded) return
    Object.keys(markers).forEach((key) => markers[key].remove())
    const tasks = Promise.allSettled(
      features
        .slice()
        .sort((a, b) => a!.properties.created_at - b!.properties.created_at)
        .map(async (feat) => {
          if (!feat) return
          if (markers[feat.id]) {
            markers[feat.id].remove()
            return markers[feat.id]
          }
          if (!feat?.properties.pubkey) return
          const [lng, lat] = feat.geometry.coordinates
          let marker = new Marker({
            anchor: 'bottom',
            className: 'cursor-pointer',
          })
            .setLngLat([lng, lat])
            .addTo(map)
          marker.getElement().onclick = () => clickHandler(feat.event)
          const pin = await generatePin(feat?.properties.pubkey)
          if (pin) {
            marker.getElement().innerHTML = pin
            marker.addClassName('cursor-pointer')
            marker.setOffset([-2, 4])
          }
          marker.getElement().onclick = () => clickHandler(feat.event)
          markers[feat.id] = marker
          return marker
        }),
    )
    tasks.then((newMarkers) => {
      Object.keys(markers).forEach((key) => markers[key].remove())
      newMarkers.forEach((newMarker) => {
        if (newMarker.status === 'fulfilled' && newMarker.value) {
          newMarker.value.remove()
          newMarker.value.addTo(map)
        }
      })
    })
  }, [generatePin, map, mapLoaded, features])

  return null
}
