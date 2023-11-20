'use client'
import EventList from '@/components/EventList'
import FeedFilterMenu from '@/components/FeedFilterMenu'
import { FollowHashtagButton } from '@/components/FollowHashtagButton'
import { svgPin } from '@/constants/app'
import { EventActionType } from '@/contexts/AppContext'
import { useAccount, useFollowing } from '@/hooks/useAccount'
import { useAction } from '@/hooks/useApp'
import { useEvent } from '@/hooks/useEvent'
import { useMap } from '@/hooks/useMap'
import { useNDK } from '@/hooks/useNostr'
import { useSubscribe } from '@/hooks/useSubscribe'
import { fetchProfile, profilePin } from '@/hooks/useUserProfile'
import { extractQuery } from '@/utils/extractQuery'
import { WEEK, unixNow } from '@/utils/time'
import { CropFree, List, LocationOn, Search, Tag } from '@mui/icons-material'
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { NDKFilter, NDKKind, NostrEvent } from '@nostr-dev-kit/ndk'
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import buffer from '@turf/buffer'
import Geohash from 'latlon-geohash'
import { LngLat, LngLatBounds, Marker } from 'maplibre-gl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Filter from './Filter'

const markers: Record<string, Marker> = {}
export default function Feed() {
  const ndk = useNDK()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const map = useMap()
  const { user, signing } = useAccount()
  const { setEventAction } = useAction()
  const [follows] = useFollowing()
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const theme = useTheme()
  const xlUp = useMediaQuery(theme.breakpoints.up('lg'))
  const mdUp = useMediaQuery(theme.breakpoints.up('md'))
  const showMap = searchParams.get('map') === '1'
  const q = useMemo(() => searchParams.get('q') || '', [searchParams])
  const queryRef = useRef(searchParams.get('q'))
  queryRef.current = searchParams.get('q')

  const handleClickShowSearch = useCallback(() => setShowSearch(true), [])
  const handleBlurSearchBox = useCallback(() => setShowSearch(false), [])

  const feedType = useMemo(() => {
    if (user) {
      if (!q || q === 'following' || q === 'conversation') {
        return 'following'
      }
    }
    return 'global'
  }, [user, q])

  const showComments = useMemo(() => q === 'conversation', [q])
  const query = useMemo(() => extractQuery(q), [q])
  const [listEvent] = useEvent(query?.naddrDesc ? query.naddr : undefined)
  const loadingList = useMemo(
    () => query?.naddrDesc && !listEvent,
    [query?.naddrDesc, listEvent],
  )
  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
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
    if (user?.pubkey && follows && feedType === 'following') {
      return { authors: follows.map((d) => d.hexpubkey).concat([user?.pubkey]) }
    }
  }, [user?.pubkey, follows, listEvent, feedType])

  const filter = useMemo<NDKFilter | undefined>(() => {
    if (signing || loadingList) return
    if (geohashFilter) return geohashFilter
    return {
      ...(tags ? tags : authors),
      kinds: [NDKKind.Text, NDKKind.Repost],
      since: unixNow() - WEEK,
      limit: 100,
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
          properties: nostrEvent,
        }
        return geojson
      })
      .filter((event) => !!event)
  }, [events])

  const clickHandler = (
    ev: maplibregl.MapMouseEvent & {
      features?: maplibregl.MapGeoJSONFeature[] | undefined
    } & Object,
  ) => {
    const feat = ev?.features?.[0]?.properties as NostrEvent
    const event = events.find((ev) => ev.id === feat.id)
    if (!event) return
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

  useEffect(() => {
    if (!map) return
    const handler = (evt: maplibregl.MapLibreEvent) => {
      setMapLoaded(true)
    }
    map.on('style.load', handler)
    map.on('click', 'nostr-event', clickHandler)
    return () => {
      map.off('style.load', handler)
      map.off('click', clickHandler)
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    try {
      const source = map.getSource('nostr-event') as any
      if (!source) return
      source?.setData({
        type: 'FeatureCollection',
        features,
      })
    } catch (err) {}
  }, [map, features])

  useEffect(() => {
    if (!map) return
    const basePadding = 32
    const left = xlUp ? 640 : mdUp ? 640 : 0
    map.easeTo({
      padding: {
        left: left + basePadding,
        right: basePadding,
        top: basePadding,
        bottom: basePadding,
      },
      animate: false,
      easeId: 'mainpane',
    })
  }, [map, mdUp, xlUp])

  useEffect(() => {
    if (!map || !mapLoaded) return
    try {
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { duration: 1000, maxZoom: 15 })
      }
    } catch (err) {}
  }, [map, mapLoaded, bounds])

  const generatePin = useCallback(
    async (pubkey: string) => {
      // const div = document.createElement('div')
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
    const tasks = Promise.all(
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
            clickHandler({ features: [feat as any] } as any)
          const pin = await generatePin(feat?.properties.pubkey)
          if (pin) {
            marker.getElement().innerHTML = pin
            marker.addClassName('cursor-pointer')
            marker.setOffset([-2, 4])
          }
          marker.getElement().onclick = () =>
            clickHandler({ features: [feat as any] } as any)
          markers[feat.id] = marker
          return marker
        }),
    )
    tasks.then((newMarkers) => {
      Object.keys(markers).forEach((key) => markers[key].remove())
      newMarkers.forEach((newMarker) => {
        newMarker?.remove()
        newMarker?.addTo(map)
      })
    })
  }, [generatePin, map, mapLoaded, features])

  return (
    <>
      <Paper
        className="flex gap-3 items-center px-3 py-2 justify-end sticky top-[58px] z-10"
        square
      >
        {!showSearch && (
          <Box className="absolute inset-0 flex items-center">
            {!query ? (
              <Box className="flex flex-1 justify-center">
                <FeedFilterMenu user={user} variant="contained" />
              </Box>
            ) : (
              <Box mx="auto">
                {query.tags?.map((d) => (
                  <Chip
                    icon={<Tag />}
                    key={d}
                    label={d}
                    onDelete={() =>
                      router.replace(
                        `${pathname}?q=${query.tags
                          ?.filter((tag) => tag !== d)
                          .map((d) => `t:${d}`)
                          .join(';')}&map=${showMap ? '1' : ''}`,
                      )
                    }
                  />
                ))}
                {query.bhash ? (
                  <Chip
                    icon={<CropFree />}
                    key={query.bhash?.join(', ')}
                    label={query.bhash?.join(', ')}
                    onClick={() => {
                      if (!query.bbox) return
                      const polygon = buffer(bboxPolygon(query.bbox), 5, {
                        units: 'kilometers',
                      })
                      const [x1, y1, x2, y2] = bbox(polygon)
                      router.replace(`${pathname}?q=${q}&map=1`, {
                        scroll: false,
                      })
                      setTimeout(() => {
                        map?.fitBounds([x1, y1, x2, y2], {
                          duration: 1000,
                          maxZoom: 16,
                        })
                      }, 300)
                    }}
                    onDelete={() => router.replace(`${pathname}?q=`)}
                  />
                ) : undefined}
                {query.geohash ? (
                  <Chip
                    icon={<LocationOn />}
                    key={query.geohash}
                    label={query.geohash}
                    onClick={() => {
                      if (!query.lnglat) return
                      const [lng, lat] = query.lnglat
                      const lnglat = new LngLat(lng, lat)
                      router.replace(`${pathname}?q=${q}&map=1`, {
                        scroll: false,
                      })
                      setTimeout(() => {
                        map?.fitBounds(LngLatBounds.fromLngLat(lnglat, 1000), {
                          duration: 1000,
                          maxZoom: 16,
                        })
                      }, 300)
                    }}
                    onDelete={() => router.replace(`${pathname}?q=`)}
                  />
                ) : undefined}
                {query.naddrDesc ? (
                  <Chip
                    icon={<List />}
                    clickable={false}
                    label={
                      !loadingList ? (
                        listEvent?.tagValue('title')
                      ) : (
                        <CircularProgress size={16} color="inherit" />
                      )
                    }
                    onDelete={
                      !loadingList
                        ? () => router.replace(`${pathname}?q=`)
                        : undefined
                    }
                  />
                ) : undefined}
              </Box>
            )}
          </Box>
        )}
        {showSearch ? (
          <Filter
            className="flex-1"
            user={user}
            InputProps={{
              onBlur: handleBlurSearchBox,
              autoFocus: true,
            }}
          />
        ) : (
          <IconButton
            className="absolute right-0 flex items-center"
            onClick={handleClickShowSearch}
          >
            <Search />
          </IconButton>
        )}
      </Paper>
      {!!query?.tags?.[0] && (
        <Box className="flex gap-3 items-center px-3 py-2 justify-between">
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
