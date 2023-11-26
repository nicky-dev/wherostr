import { NDKEvent } from '@nostr-dev-kit/ndk'
import { useCallback, useEffect, useMemo } from 'react'
import { fetchProfile, profilePin } from './useUserProfile'
import { useMap } from './useMap'
import { useNDK } from './useNostr'
import { svgPin } from '@/constants/app'
import { Marker } from 'maplibre-gl'
import Geohash from 'latlon-geohash'
import { useAction } from './useApp'
import { mapClickHandler } from '@/components/MapController'

const markers: Record<string, Marker> = {}
export const useEventMarkers = (events: NDKEvent[]) => {
  const ndk = useNDK()
  const map = useMap()
  const { setEventAction } = useAction()

  const features = useMemo(() => {
    return events
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
  }, [events])

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
    if (!map || !setEventAction) return
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
          marker.getElement().onclick = () =>
            mapClickHandler({ setEventAction }, feat.event)
          const pin = await generatePin(feat?.properties.pubkey)
          if (pin) {
            marker.getElement().innerHTML = pin
            marker.addClassName('cursor-pointer')
            marker.setOffset([-2, 4])
          }
          //   marker.getElement().onclick = () =>
          //     clickHandler(feat.event, pathRef.current)
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
  }, [generatePin, setEventAction, map, features])

  return features
}
