'use client'
import ProfileChip from '@/components/ProfileChip'
import ShortTextNoteCard from '@/components/ShortTextNoteCard'
import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  IconButton,
  Paper,
  Typography,
} from '@mui/material'
import {
  MutableRefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ArrowBackOutlined, Close } from '@mui/icons-material'
import {
  EventActionType,
  EventAction,
  useAppStore,
} from '@/contexts/AppContext'
import { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { CreateEventForm } from './CreateEventForm'
import { isComment, isQuote } from '@/utils/event'
import ZapEventForm from './ZapEventForm'
import classNames from 'classnames'
import EventList from './EventList'
import { DAY, unixNow } from '@/utils/time'
import { useSubscribe } from '@/hooks/useSubscribe'
import { textKinds } from '@/constants/app'
import { useAccountStore } from '@/contexts/AccountContext'

export const ShortTextNotePane = ({
  event,
  viewportRef,
}: {
  event: NDKEvent
  viewportRef?: MutableRefObject<any>
}) => {
  const eventAction = useAppStore((state) => state.eventAction)
  const [eventActionState, setEventActionState] = useState<EventAction>({
    type: EventActionType.Comment,
    options: { comments: true },
    ...eventAction,
  })

  const relatedEventsfilter = useMemo<NDKFilter | undefined>(
    () =>
      event.kind && textKinds.includes(event.kind)
        ? {
            kinds: [
              NDKKind.Repost,
              NDKKind.Text,
              NDKKind.Zap,
              NDKKind.Reaction,
            ],
            '#e': [event.id],
            until: unixNow() + DAY,
          }
        : undefined,
    [event],
  )
  const relatedEventsOptions = useMemo(
    () => ({
      sortDesc: false,
    }),
    [],
  )
  const [relatedEvents] = useSubscribe(
    relatedEventsfilter,
    true,
    undefined,
    relatedEventsOptions,
  )

  const filteredRelatedEvents = useMemo(() => {
    if (!relatedEvents?.length) return []
    const _reposts: NDKEvent[] = []
    const _quotes: NDKEvent[] = []
    const _comments: NDKEvent[] = []
    const _likes: NDKEvent[] = []
    const _zaps: NDKEvent[] = []
    const { reposts, quotes, comments, likes, zaps } =
      eventActionState?.options || {}
    relatedEvents.forEach((item) => {
      const { content, kind } = item
      switch (kind) {
        case NDKKind.Repost:
          if (reposts) {
            _reposts.push(item)
          }
          break
        case NDKKind.Text:
          if (quotes && isQuote(item, event)) {
            _quotes.push(item)
          } else if (comments && isComment(item, event, true)) {
            _comments.push(item)
          }
          break
        case NDKKind.Reaction:
          if (likes && content !== '-') {
            _likes.push(item)
          }
          break
        case NDKKind.Zap:
          if (zaps) {
            _zaps.push(item)
          }
          break
      }
    })
    return [..._reposts, ..._quotes, ..._comments, ..._likes, ..._zaps]
  }, [event, eventActionState?.options, relatedEvents])

  const handleClickAction = useCallback(
    (type: EventActionType, options?: any) => () => {
      setEventActionState({
        type,
        event,
        options,
      })
    },
    [event],
  )

  return (
    <Box>
      <ShortTextNoteCard
        className="!shadow-none"
        event={event}
        indent={false}
        viewNoteButton={false}
        relatedEvents={relatedEvents}
      />
      {event.kind && textKinds.includes(event.kind) ? (
        <>
          <Paper className="sticky top-[59px] z-10">
            <Box>
              <ButtonGroup
                className="flex [&>button]:flex-1 w-full text-contrast-secondary"
                variant="text"
                color="inherit"
              >
                <Button
                  className={classNames({
                    '!bg-secondary/10': !!eventActionState?.options?.reposts,
                  })}
                  color={
                    eventActionState?.options?.reposts ? 'secondary' : undefined
                  }
                  onClick={handleClickAction(EventActionType.View, {
                    reposts: true,
                  })}
                >
                  Reposts
                </Button>
                <Button
                  className={classNames({
                    '!bg-secondary/10': !!eventActionState?.options?.quotes,
                  })}
                  color={
                    eventActionState?.options?.quotes ? 'secondary' : undefined
                  }
                  onClick={handleClickAction(EventActionType.View, {
                    quotes: true,
                  })}
                >
                  Quotes
                </Button>
                <Button
                  className={classNames({
                    '!bg-secondary/10': !!eventActionState?.options?.comments,
                  })}
                  color={
                    eventActionState?.options?.comments
                      ? 'secondary'
                      : undefined
                  }
                  onClick={handleClickAction(EventActionType.View, {
                    comments: true,
                  })}
                >
                  Comments
                </Button>
                <Button
                  className={classNames({
                    '!bg-secondary/10': !!eventActionState?.options?.likes,
                  })}
                  color={
                    eventActionState?.options?.likes ? 'secondary' : undefined
                  }
                  onClick={handleClickAction(EventActionType.View, {
                    likes: true,
                  })}
                >
                  Reactions
                </Button>
                <Button
                  className={classNames({
                    '!bg-secondary/10': !!eventActionState?.options?.zaps,
                  })}
                  color={
                    eventActionState?.options?.zaps ? 'secondary' : undefined
                  }
                  onClick={handleClickAction(EventActionType.View, {
                    zaps: true,
                  })}
                >
                  Zaps
                </Button>
              </ButtonGroup>
            </Box>
            <Divider />
          </Paper>
          {filteredRelatedEvents.length ? (
            <EventList
              events={filteredRelatedEvents}
              depth={1}
              parentRef={viewportRef}
            />
          ) : (
            <Typography
              color="text.secondary"
              className="flex flex-1 justify-center items-end !py-2 italic bg-[inherit]"
            >
              No more content.
            </Typography>
          )}
        </>
      ) : null}
    </Box>
  )
}

const EventActionModal = () => {
  const viewportRef = useRef(null)
  const user = useAccountStore((state) => state.user)
  const eventAction = useAppStore((state) => state.eventAction)
  const backToPreviosModalAction = useAppStore(
    (state) => state.backToPreviosModalAction,
  )
  const clearActions = useAppStore((state) => state.clearActions)
  const handleClickBack = useCallback(() => {
    backToPreviosModalAction('event')
  }, [backToPreviosModalAction])
  const handleClickCloseModal = useCallback(
    () => clearActions(),
    [clearActions],
  )
  const renderAction = useCallback(() => {
    const { type, event } = eventAction || {}
    switch (type) {
      case EventActionType.Create:
      case EventActionType.Repost:
      case EventActionType.Quote:
      case EventActionType.Comment:
        return (
          <CreateEventForm
            type={type}
            relatedEvents={event ? [event] : undefined}
          />
        )
      case EventActionType.Zap:
        return event && <ZapEventForm event={event} />
      case EventActionType.View:
        return (
          event && <ShortTextNotePane event={event} viewportRef={viewportRef} />
        )
      default:
        return undefined
    }
  }, [eventAction])
  const title = useMemo(() => {
    const { type, event } = eventAction || {}
    switch (type) {
      case EventActionType.Create:
        return 'Create'
      case EventActionType.Repost:
        return 'Repost'
      case EventActionType.Quote:
        return 'Quote'
      case EventActionType.Comment:
        return 'Comment'
      case EventActionType.Zap:
        return 'Zap'
      case EventActionType.View:
        if (event?.kind === NDKKind.Text) {
          return 'Note'
        } else if (event?.kind === NDKKind.Article) {
          return 'Article'
        } else if (event?.kind === 1311) {
          return 'Chat'
        }
      default:
        return undefined
    }
  }, [eventAction])
  return (
    eventAction && (
      <Box className="relative max-h-full flex rounded-2xl overflow-hidden p-0.5 bg-gradient-primary">
        <Paper
          ref={viewportRef}
          className="w-full overflow-y-auto !rounded-2xl"
        >
          <Paper className="sticky top-0 z-10" square>
            <Box className="flex items-center p-3 shadow gap-2">
              <IconButton size="small" onClick={handleClickBack}>
                <ArrowBackOutlined />
              </IconButton>
              <Typography className="flex-1" variant="h6">
                {title}
              </Typography>
              <IconButton size="small" onClick={handleClickCloseModal}>
                <Close />
              </IconButton>
            </Box>
            <Divider />
          </Paper>
          {eventAction.type !== EventActionType.View && (
            <ProfileChip
              className="pt-3 px-3"
              hexpubkey={user?.hexpubkey}
              clickable={false}
            />
          )}
          <Box
            className={
              eventAction.type !== EventActionType.View
                ? 'pb-3 px-3'
                : undefined
            }
          >
            {renderAction()}
          </Box>
        </Paper>
      </Box>
    )
  )
}

export default EventActionModal
