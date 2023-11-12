import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import EventList from '@/components/EventList'
import Filter from '@/components/Filter'
import { EventActionType, AppContext } from '@/contexts/AppContext'
import { MapContext } from '@/contexts/MapContext'
import Geohash from 'latlon-geohash'
import {
  Box,
  Chip,
  Divider,
  Paper,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { LngLat, LngLatBounds } from 'maplibre-gl'
import { NDKFilter, NDKKind, NostrEvent } from '@nostr-dev-kit/ndk'
import { CropFree, LocationOn, Tag } from '@mui/icons-material'
import { useSubscribe } from '@/hooks/useSubscribe'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import UserBar from './UserBar'
import classNames from 'classnames'
import { WEEK, unixNow } from '@/utils/time'
import { useAccount, useFollowing } from '@/hooks/useAccount'
import DrawerMenu from './DrawerMenu'
import { extractQuery } from '@/utils/extractQuery'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import bbox from '@turf/bbox'
import FeedFilterMenu from './FeedFilterMenu'
import pin from '@/public/pin.svg'
import { fetchProfile, profilePin, toDataURL } from '@/hooks/useUserProfile'

const MainPane = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { map } = useContext(MapContext)
  const { user, signing } = useAccount()
  const [follows] = useFollowing()
  const { profileAction, eventAction, setEventAction } = useContext(AppContext)
  const [mapLoaded, setMapLoaded] = useState(false)
  const theme = useTheme()
  const xlUp = useMediaQuery(theme.breakpoints.up('lg'))
  const mdUp = useMediaQuery(theme.breakpoints.up('md'))
  const mdDown = useMediaQuery(theme.breakpoints.down('md'))
  const showMap = searchParams.get('map') === '1'
  const q = useMemo(() => searchParams.get('q') || '', [searchParams])
  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
  )
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

  const authorsOrTags = useMemo(() => {
    const tags = query?.tags
      ? new Set(query?.tags.map((d) => d.trim().toLowerCase()))
      : undefined

    if (!!tags?.size) {
      return { '#t': Array.from(tags) }
    }
    if (follows && feedType === 'following') {
      return { authors: follows.map((d) => d.hexpubkey) }
    }
  }, [follows, query?.tags, feedType])

  const filter = useMemo<NDKFilter | undefined>(() => {
    if (signing) return
    if (geohashFilter) return geohashFilter
    return {
      ...authorsOrTags,
      kinds: [NDKKind.Text, NDKKind.Repost],
      since: unixNow() - WEEK,
      limit: 200,
    } as NDKFilter
  }, [signing, geohashFilter, authorsOrTags])

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

  const mouseEnterHandler = useCallback((ev: maplibregl.MapMouseEvent) => {
    const style = ev.target.getCanvas().style
    style.cursor = 'pointer'
  }, [])

  const mouseOutHandler = useCallback((ev: maplibregl.MapMouseEvent) => {
    const style = ev.target.getCanvas().style
    style.cursor = ''
  }, [])

  const clickHandler = useCallback(
    (
      ev: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[] | undefined
      } & Object,
    ) => {
      const feat = ev?.features?.[0]?.properties as NostrEvent
      const event = events.find((ev) => ev.id === feat.id)
      if (!event) return
      router.replace(`${pathname}?q=${q || ''}`)
      setEventAction({
        type: EventActionType.View,
        event,
        options: {
          comments: true,
        },
      })
    },
    [events, pathname, q, router, setEventAction],
  )

  useEffect(() => {
    if (!map) return
    const handler = (evt: maplibregl.MapLibreEvent) => {
      setMapLoaded(true)
    }
    map.on('style.load', handler)
    map.on('mouseenter', 'nostr-event', mouseEnterHandler)
    map.on('mouseout', 'nostr-event', mouseOutHandler)
    map.on('click', 'nostr-event', clickHandler)
    return () => {
      map.off('style.load', handler)
      map.off('mouseenter', mouseEnterHandler)
      map.off('mouseout', mouseOutHandler)
      map.off('click', clickHandler)
    }
  }, [map, clickHandler, mouseEnterHandler, mouseOutHandler])

  useEffect(() => {
    if (!map || !mapLoaded) return
    if (map.getLayer('nostr-event')) {
      map.removeLayer('nostr-event')
    }
    if (map.getSource('nostr-event')) {
      map.removeSource('nostr-event')
    }

    if (!map.hasImage('pin')) {
      const img = new Image()
      img.onload = () => map.addImage('pin', img)
      img.src = pin.src
    }

    map.addSource('nostr-event', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
    map.addLayer({
      id: 'nostr-event',
      type: 'symbol',
      source: 'nostr-event',
      layout: {
        // 'icon-image': ['get', 'pubkey'],
        'icon-image': 'pin',
        'icon-size': 0.25,
        'icon-offset': [0, -64],
      },
    })
  }, [mapLoaded, map])

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

  const showEvents = useMemo(
    () => !!events?.length && (!mdDown || !showMap),
    [events, mdDown, showMap],
  )
  const showOnlyMap = useMemo(() => mdDown && showMap, [mdDown, showMap])

  const showPanel = useMemo(
    () => profileAction || eventAction || showEvents || !showOnlyMap,
    [profileAction, eventAction, showEvents, showOnlyMap],
  )

  useEffect(() => {
    if (!map) return
    const basePadding = 32
    const left = xlUp ? 640 : mdUp ? 640 : 0
    if (showPanel) {
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
    } else {
      map.easeTo({
        padding: {
          left: basePadding,
          right: basePadding,
          top: basePadding,
          bottom: basePadding,
        },
        animate: false,
        easeId: 'mainpane',
      })
    }
  }, [map, showPanel, mdUp, xlUp])

  useEffect(() => {
    if (!map || !mapLoaded) return
    try {
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { duration: 1000, maxZoom: 15 })
      }
    } catch (err) {}
  }, [map, mapLoaded, bounds])

  // const addProfilePin = useCallback(
  //   async (user: NDKUser) => {
  //     const profile = await fetchProfile(user)
  //     if (profile?.image && !map?.hasImage(user.pubkey)) {
  //       const dataUrl = await toDataURL(profile?.image).catch()
  //       if (dataUrl) {
  //         const img = new Image()
  //         img.onload = () => map?.addImage(user.pubkey, img)
  //         img.crossOrigin = 'anonymous'
  //         img.src = `data:image/svg+xml;utf8,${encodeURIComponent(
  //           profilePin.replace('{PROFILE_URL}', profile?.image),
  //         )}`
  //       }
  //     }
  //   },
  //   [map],
  // )

  return (
    <Paper
      className={classNames(
        'relative w-full md:w-[640px] flex flex-col !rounded-none min-h-full will-change-transform',
        {
          // 'min-h-full': !showOnlyMap,
          // 'h-[66px] overflow-hidden': showOnlyMap,
        },
      )}
    >
      <Paper className="!sticky top-0 z-10">
        <Toolbar className="gap-3 items-center !px-3 !min-h-[64px]">
          {user?.hexpubkey ? (
            <DrawerMenu hexpubkey={user.hexpubkey} />
          ) : (
            <UserBar />
          )}

          {!query ? (
            <Box className="flex flex-1 justify-center">
              <FeedFilterMenu user={user} />
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
            </Box>
          )}
          <Filter className="grow" user={user} />
        </Toolbar>
        <Box className="w-full h-0.5 shrink-0 bg-gradient-primary" />
      </Paper>
      {/* <Tabs
        variant="fullWidth"
        value={tabValue}
        onChange={(_, value) => {
          setShowComments(value === 'conversations')
          setTabValue(value)
        }}
      >
        <Tab label="Notes" value="notes" />
        <Tab label="Conversations" value="conversations" />
      </Tabs> */}
      <Divider />
      <EventList
        parentRef={scrollRef}
        events={events}
        onFetchMore={fetchMore}
        newItems={newItems}
        onShowNewItems={showNewItems}
        showComments={!!query || showComments}
      />
    </Paper>
  )
}

export default MainPane
