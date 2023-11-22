'use client'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import {
  FC,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AvatarGroup,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Slide,
  Typography,
} from '@mui/material'
import { ViewportList, ViewportListRef } from 'react-viewport-list'
import { SubscribeResult } from '@/hooks/useSubscribe'
import { ArrowUpward } from '@mui/icons-material'
import classNames from 'classnames'
import ProfileAvatar from './ProfileAvatar'
import _ from 'lodash'
import { useMuting, useUser } from '@/hooks/useAccount'
import NotificationItem from './NotificationItem'

export interface NotificationListProps {
  className?: string
  events?: NDKEvent[]
  parentRef?: RefObject<HTMLElement> | null
  onFetchMore?: SubscribeResult[1]
  newItems?: SubscribeResult[2]
  onShowNewItems?: SubscribeResult[3]
}

const renderNotificationItem = (item: NDKEvent) => (
  <NotificationItem key={item.deduplicationKey()} event={item} limitedHeight />
)

const NotificationList: FC<NotificationListProps> = ({
  className,
  events = [],
  parentRef = null,
  newItems = [],
  onFetchMore,
  onShowNewItems,
}) => {
  const user = useUser()
  const noteRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<ViewportListRef>(null)
  const [muteList] = useMuting()
  const [scrollEnd, setScrollEnd] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [hasNext, setHasNext] = useState(true)

  const notes = useMemo(() => {
    return events.filter((d) => {
      if (user?.pubkey === d.author.hexpubkey) return false
      if (muteList.includes(d.author.hexpubkey)) return false
      return true
    })
  }, [events, user?.pubkey, muteList])

  const newNotes = useMemo(() => {
    return newItems.filter((d) => {
      if (user?.pubkey === d.author.hexpubkey) return false
      if (muteList.includes(d.author.hexpubkey)) return false
      return true
    })
  }, [newItems, user?.pubkey, muteList])

  const totalEvent = useMemo(() => notes.length || 0, [notes.length])

  useEffect(() => {
    if (totalEvent > 0) {
      setHasNext(true)
    }
  }, [totalEvent])

  const onViewportIndexesChange = useCallback(
    async ([current, next]: [number, number]) => {
      const percent = ((next + 1) / totalEvent) * 100
      setScrollEnd(percent === 100)
      if (fetching || !hasNext) return
      if (percent < 90) return
      setFetching(true)
      const items = await onFetchMore?.()
      setFetching(false)
      setHasNext(!!items?.length)
    },
    [hasNext, fetching, totalEvent, onFetchMore],
  )

  const pubkeys = useMemo(() => {
    const obj = _.keyBy(newNotes, 'pubkey')
    return Object.keys(obj)
  }, [newNotes])
  const avatars = useMemo(() => {
    return (
      <AvatarGroup
        max={8}
        sx={{
          border: 'none',
          bgcolor: 'transparent !important',
          width: 'auto !important',
          height: 'auto !important',
        }}
        slotProps={{
          additionalAvatar: { sx: { width: 24, height: 24, display: 'none' } },
        }}
      >
        {pubkeys.map((key) => (
          <ProfileAvatar
            sx={{ width: 24, height: 24 }}
            key={key}
            hexpubkey={key}
          />
        ))}
      </AvatarGroup>
    )
  }, [pubkeys])

  const handleShowNewItems = useCallback(() => {
    onShowNewItems?.()
    if (!scrollRef.current) return
    scrollRef.current?.scrollToIndex({
      index: 0,
      offset: -196,
      alignToTop: true,
      delay: 300,
    })
  }, [onShowNewItems])

  return (
    <>
      <Paper
        ref={!parentRef ? noteRef : undefined}
        className={classNames('relative', className)}
      >
        <Slide in={!!newNotes.length} unmountOnExit>
          <Box className="sticky z-[1] top-[72px] left-0 right-0 text-center opacity-80 mt-2">
            <Chip
              avatar={avatars}
              color="secondary"
              label={`${newNotes.length} new note${
                newNotes.length > 1 ? 's' : ''
              }`}
              deleteIcon={<ArrowUpward />}
              onClick={handleShowNewItems}
              onDelete={handleShowNewItems}
            />
          </Box>
        </Slide>
        <ViewportList
          ref={scrollRef}
          viewportRef={parentRef || noteRef}
          items={notes}
          onViewportIndexesChange={onViewportIndexesChange}
          withCache
        >
          {renderNotificationItem}
        </ViewportList>
      </Paper>
      {fetching && <LinearProgress sx={{ minHeight: 4 }} />}
      <Slide
        in={scrollEnd && !hasNext}
        direction="up"
        appear={false}
        unmountOnExit
        mountOnEnter
      >
        <Typography
          color="text.secondary"
          className="flex flex-1 justify-center items-end !py-2 italic bg-[inherit]"
        >
          No more content.
        </Typography>
      </Slide>
    </>
  )
}

export default NotificationList
