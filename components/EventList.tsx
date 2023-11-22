'use client'
import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import {
  FC,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import ShortTextNoteCard from '@/components/ShortTextNoteCard'
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
import { SubscribeResult, useSubscribe } from '@/hooks/useSubscribe'
import { ArrowUpward, ElectricBolt, ThumbUp } from '@mui/icons-material'
import classNames from 'classnames'
import { isComment } from '@/utils/event'
import ProfileAvatar from './ProfileAvatar'
import _ from 'lodash'
import { useMuting } from '@/hooks/useAccount'
import { EventProfileCard } from './EventProfileCard'
import numeral from 'numeral'
import { amountFormat } from '@/constants/app'
import { transformText } from '@snort/system'
import { DAY, unixNow } from '@/utils/time'

export interface EventListProps {
  className?: string
  events?: NDKEvent[]
  parentRef?: RefObject<HTMLElement> | null
  onFetchMore?: SubscribeResult[1]
  newItems?: SubscribeResult[2]
  onShowNewItems?: SubscribeResult[3]
  showComments?: boolean
  depth?: number
  renderEventItem?: (event: NDKEvent, props: any) => JSX.Element | undefined
}

const EventList: FC<EventListProps> = ({
  className,
  events = [],
  parentRef = null,
  newItems = [],
  onFetchMore,
  onShowNewItems,
  showComments,
  depth = 0,
  renderEventItem,
}) => {
  const noteRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<ViewportListRef>(null)
  const [muteList] = useMuting()
  const [scrollEnd, setScrollEnd] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [hasNext, setHasNext] = useState(true)

  const notes = useMemo(() => {
    return events.filter((d) => {
      if (showComments && d.kind === NDKKind.Repost) return false
      if (muteList.includes(d.author.hexpubkey)) return false
      return showComments || showComments === undefined || !isComment(d)
    })
  }, [showComments, events, muteList])
  const relatedEventsfilter = useMemo<NDKFilter | undefined>(() => {
    return notes.length
      ? ({
          kinds: [NDKKind.Repost, NDKKind.Text, NDKKind.Zap, NDKKind.Reaction],
          '#e': notes
            .filter(
              ({ kind }) => kind === NDKKind.Text || kind === NDKKind.Article,
            )
            .map(({ id }) => id),
          until: unixNow() + DAY,
        } as NDKFilter)
      : undefined
  }, [notes])
  const [relatedEvents] = useSubscribe(relatedEventsfilter, true)
  const getRelatedEvents = useCallback(
    (event: NDKEvent) =>
      relatedEvents.filter((item) =>
        item.getMatchingTags('e').some(([_1, id]) => id === event.id),
      ),
    [relatedEvents],
  )
  const _renderEventItem = useCallback(
    (item: NDKEvent) => {
      const key = item.deduplicationKey()
      if (renderEventItem) {
        return renderEventItem(item, {
          key,
          relatedEvents:
            item.kind === NDKKind.Text || item.kind === NDKKind.Article
              ? getRelatedEvents(item)
              : [],
        })
      }
      if (item.kind === NDKKind.Repost && depth !== 0) {
        return <EventProfileCard key={key} hexpubkey={item.pubkey} />
      } else if (item.kind === NDKKind.Reaction) {
        const { type, content } = transformText(item.content, item.tags)[0]
        return (
          <EventProfileCard key={key} hexpubkey={item.pubkey}>
            <Box className="px-3 w-14 text-center">
              {type === 'custom_emoji' ? (
                <img
                  className="inline-block max-h-[1.5em] max-w-[1.5em]"
                  alt="emoji"
                  src={content}
                />
              ) : content === '+' ? (
                <ThumbUp color="secondary" />
              ) : (
                <Typography
                  className="overflow-hidden whitespace-nowrap text-ellipsis text-contrast-primary"
                  variant="h6"
                >
                  {content}
                </Typography>
              )}
            </Box>
          </EventProfileCard>
        )
      } else if (item.kind === NDKKind.Zap) {
        const zapInvoice = zapInvoiceFromEvent(item)
        if (zapInvoice?.zappee && zapInvoice.amount) {
          const amount = numeral(zapInvoice.amount / 1000).format(amountFormat)
          return (
            <EventProfileCard key={key} hexpubkey={zapInvoice.zappee}>
              <Box className="flex justify-center">
                <ElectricBolt
                  className="mr-1"
                  color="primary"
                  fontSize="small"
                />
                <Typography
                  className="w-8 !font-bold"
                  variant="body2"
                  color="primary"
                >
                  {amount}
                </Typography>
              </Box>
            </EventProfileCard>
          )
        }
      } else {
        return (
          <ShortTextNoteCard
            key={key}
            event={item}
            depth={depth}
            hideContent={depth > 0 && item.kind === NDKKind.Repost}
            limitedHeight
            relatedEvents={
              item.kind === NDKKind.Text || item.kind === NDKKind.Article
                ? getRelatedEvents(item)
                : []
            }
          />
        )
      }
    },
    [depth, getRelatedEvents, renderEventItem],
  )

  const newNotes = useMemo(() => {
    return newItems.filter((d) => {
      if (showComments && d.kind === NDKKind.Repost) return false
      if (muteList.includes(d.author.hexpubkey)) return false
      return showComments || showComments === undefined || !isComment(d)
    })
  }, [showComments, newItems, muteList])

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
              label={`${newNotes.length} new item${
                newNotes.length > 1 ? 's' : ''
              }`}
              deleteIcon={<ArrowUpward />}
              onClick={handleShowNewItems}
              onDelete={handleShowNewItems}
            />
          </Box>
        </Slide>
        {(!!notes.length || !!onFetchMore) && (
          <ViewportList
            ref={scrollRef}
            viewportRef={parentRef || noteRef}
            items={notes}
            onViewportIndexesChange={onViewportIndexesChange}
            withCache
          >
            {_renderEventItem}
          </ViewportList>
        )}
      </Paper>
      {fetching && <LinearProgress sx={{ minHeight: 4 }} />}
      {!!onFetchMore && (
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
      )}
    </>
  )
}

export default EventList
