import { Box, Chip, IconButton, Paper } from '@mui/material'
import { FC, useCallback, useMemo, useState } from 'react'
import FeedFilterMenu, { FeedFilterMenuProps, FeedType } from './FeedFilterMenu'
import { ExtractQueryResult } from '@/utils/extractQuery'
import { useFollowList, useUser } from '@/hooks/useAccount'
import {
  CropFree,
  List,
  LocationOn,
  Person,
  Search,
  Tag,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import bbox from '@turf/bbox'
import { useMap } from '@/hooks/useMap'
import { LngLat, LngLatBounds } from 'maplibre-gl'
import Filter from './Filter'
import { nip19 } from 'nostr-tools'
import ProfileChip from './ProfileChip'
import ProfileAvatar from './ProfileAvatar'

interface FeedToolbarProps {
  feedType: FeedType
  query?: ExtractQueryResult
  pathname?: string
  filterMenuProps?: FeedFilterMenuProps
}
export const FeedToolbar: FC<FeedToolbarProps> = ({
  feedType,
  query,
  pathname = '/',
  filterMenuProps,
}) => {
  const user = useUser()
  const router = useRouter()
  const map = useMap()
  const [showSearch, setShowSearch] = useState(false)
  const [followLists] = useFollowList()

  const handleClickShowSearch = useCallback(() => setShowSearch(true), [])
  const handleBlurSearchBox = useCallback(() => setShowSearch(false), [])

  const listTitle = useMemo(() => {
    return followLists.find((v) => v.value === query?.naddr)?.name
  }, [followLists, query?.naddr])

  const hexpubkey = useMemo(() => {
    if (!query?.npub) return
    const result = nip19.decode(query?.npub)
    if (result.type !== 'npub') return
    return result.data
  }, [query?.npub])

  return (
    <Paper
      className="flex gap-2 items-center px-3 py-2 justify-end sticky top-[58px] z-10"
      square
    >
      {!showSearch && (
        <Box className="absolute inset-0 flex items-center">
          {!query ? (
            <Box className="flex flex-1 justify-center">
              <FeedFilterMenu
                {...filterMenuProps}
                user={user}
                variant="contained"
                feedType={feedType}
                pathname={pathname}
              />
            </Box>
          ) : (
            <Box mx="auto">
              {query?.tags?.map((d) => (
                <Chip
                  icon={<Tag />}
                  key={d}
                  label={d}
                  onDelete={() => router.push('/')}
                />
              ))}
              {query?.bhash ? (
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
                    router.replace(`${pathname}?map=1`, {
                      scroll: false,
                    })
                    setTimeout(() => {
                      map?.fitBounds([x1, y1, x2, y2], {
                        duration: 1000,
                        maxZoom: 16,
                      })
                    }, 300)
                  }}
                  onDelete={() => router.push('/')}
                />
              ) : undefined}
              {query?.geohash ? (
                <Chip
                  icon={<LocationOn />}
                  key={query.geohash}
                  label={query.geohash}
                  onClick={() => {
                    if (!query.lnglat) return
                    const [lng, lat] = query.lnglat
                    const lnglat = new LngLat(lng, lat)
                    router.replace(`${pathname}?map=1`, {
                      scroll: false,
                    })
                    setTimeout(() => {
                      map?.fitBounds(LngLatBounds.fromLngLat(lnglat, 1000), {
                        duration: 1000,
                        maxZoom: 16,
                      })
                    }, 300)
                  }}
                  onDelete={() => router.push(pathname)}
                />
              ) : undefined}
              {query?.naddr ? (
                <Chip
                  icon={<List />}
                  clickable={false}
                  label={listTitle || 'Unknown'}
                  onDelete={() => router.push(pathname)}
                />
              ) : undefined}
              {hexpubkey ? (
                <Chip
                  avatar={
                    <ProfileAvatar hexpubkey={hexpubkey} avatarSize={24} />
                  }
                  label={query.npub}
                  onDelete={() => router.push(pathname)}
                />
              ) : undefined}
            </Box>
          )}
        </Box>
      )}
      {showSearch ? (
        <Filter
          className="flex-1"
          pathname={pathname}
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
  )
}
