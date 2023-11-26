'use client'
import { useSubscribe } from '@/hooks/useSubscribe'
import {
  Box,
  Card,
  CardHeader,
  CardMedia,
  Chip,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { FC, useCallback, useMemo, useRef } from 'react'
import ReactTimeago from 'react-timeago'
import { nip19 } from 'nostr-tools'
import Link from 'next/link'
import { WEEK, unixNow } from '@/utils/time'
import { useUserDisplayName, useUserProfile } from '@/hooks/useUserProfile'
import { useStreamRelaySet } from '@/hooks/useNostr'
import StatusBadge from '@/components/StatusBadge'
import { ViewportList } from 'react-viewport-list'
import ProfileChip from '@/components/ProfileChip'
import { useMuting } from '@/hooks/useAccount'

export default function Page() {
  const theme = useTheme()
  const xlUp = useMediaQuery(theme.breakpoints.up('xl'))
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'))
  const mdUp = useMediaQuery(theme.breakpoints.up('md'))
  const smUp = useMediaQuery(theme.breakpoints.up('sm'))
  const since = useMemo(() => unixNow() - WEEK, [])
  const [muteList] = useMuting()
  const liveFilter = useMemo(() => {
    return {
      kinds: [30311 as NDKKind],
      since,
    } as NDKFilter
  }, [since])
  const relaySet = useStreamRelaySet()
  const [liveEvent] = useSubscribe(liveFilter, true, relaySet)

  const liveItems = useMemo(() => {
    const items = liveEvent
      .filter(
        (item) =>
          !muteList.includes(item.tagValue('p') || item.pubkey) &&
          item.tagValue('status') === 'live' &&
          item.tagValue('starts') &&
          item.tagValue('streaming'),
      )
      .slice()
      .sort(
        (a, b) => Number(b.tagValue('starts')) - Number(a.tagValue('starts')),
      )
    return items
  }, [liveEvent, muteList])

  const endedItems = useMemo(() => {
    const items = liveEvent
      .filter(
        (item) =>
          !muteList.includes(item.tagValue('p') || item.pubkey) &&
          item.tagValue('status') === 'ended' &&
          item.tagValue('recording'),
      )
      .slice()
      .sort(
        (a, b) =>
          Number(b.tagValue('ends') || b.created_at) -
          Number(a.tagValue('ends') || a.created_at),
      )
    return items
  }, [liveEvent, muteList])

  const ref = useRef<HTMLElement | null>(
    typeof window !== 'undefined' ? window.document.body : null,
  )
  ref.current = typeof window !== 'undefined' ? window.document.body : null

  const colsNum = useMemo(() => {
    if (xlUp) {
      return 5
    } else if (lgUp) {
      return 4
    } else if (mdUp) {
      return 3
    } else if (smUp) {
      return 2
    } else {
      return 1
    }
  }, [xlUp, lgUp, mdUp, smUp])

  const renderItems = useCallback(
    (item: NDKEvent, i: number, all: NDKEvent[]) => {
      if (i % colsNum === 0) {
        return (
          <Box
            key={item.deduplicationKey()}
            className="grid grid-cols-1 mb-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-8 sm:m-4 md:m-8"
          >
            {all.slice(i, i + colsNum).map((d) => (
              <CardEvent key={d.id} ev={d} />
            ))}
          </Box>
        )
      }
    },
    [colsNum],
  )

  return (
    <Box p={2} flex={1} overflow="visible" className="bg-[inherit]">
      <Typography variant="h4">Live</Typography>
      <Divider />
      <ViewportList
        items={liveItems}
        viewportRef={ref}
        withCache
        axis="y"
        overscan={1}
      >
        {renderItems}
      </ViewportList>
      <Box my={8} />
      <Typography variant="h4">Ended</Typography>
      <Divider />
      <ViewportList
        items={endedItems}
        viewportRef={ref}
        withCache
        axis="y"
        overscan={2}
      >
        {renderItems}
      </ViewportList>
    </Box>
  )
}

const CardEvent: FC<{
  ev: NDKEvent
}> = ({ ev }) => {
  const id = ev.tagValue('d') || ''
  const pubkey = ev.tagValue('p') || ev.pubkey
  const title = ev.tagValue('title')
  const summary = ev.tagValue('summary')
  const image = ev.tagValue('image')
  const starts = Number(ev.tagValue('starts') || ev.created_at)
  const ends = Number(ev.tagValue('ends') || ev.created_at)
  const isLive = ev.tagValue('status') === 'live'
  const viewers = ev.tagValue('current_participants')
  const nostrLink = useMemo(
    () =>
      nip19.naddrEncode({
        identifier: id,
        kind: ev.kind!,
        pubkey: ev.pubkey,
      }),
    [ev.kind, ev.pubkey, id],
  )
  const user = useUserProfile(pubkey)
  const displayName = useUserDisplayName(user)
  return (
    <Card>
      <CardMedia
        component={Link}
        href={`/${nostrLink}`}
        sx={{
          backgroundImage: `url(${image})`,
          aspectRatio: '16/9',
          position: 'relative',
        }}
      >
        <Box
          position="absolute"
          right={8}
          top={8}
          display="flex"
          flexDirection="column"
          alignItems="flex-end"
        >
          <StatusBadge status={isLive ? 'live' : 'ended'} />
          {isLive && typeof viewers !== 'undefined' ? (
            <>
              <Box my={0.5} />
              <Chip
                size="small"
                color="default"
                label={viewers + ' viewers'}
                sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}
              />
            </>
          ) : null}
        </Box>
      </CardMedia>
      <CardHeader
        avatar={<ProfileChip hexpubkey={pubkey} showName={false} />}
        title={title}
        subheader={
          <Box component="span" display="flex" flexDirection="column">
            <Typography variant="caption">{displayName}</Typography>
            <Typography variant="caption">
              {!isLive && 'Streamed '}
              <ReactTimeago date={new Date((isLive ? starts : ends) * 1000)} />
            </Typography>
          </Box>
        }
        titleTypographyProps={{
          noWrap: true,
        }}
        subheaderTypographyProps={{
          variant: 'caption',
          noWrap: true,
        }}
        classes={{
          content: 'overflow-hidden',
        }}
      />
    </Card>
  )
}
