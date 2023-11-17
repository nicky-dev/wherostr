'use client'
import '@getalby/bitcoin-connect-react'
import ProfileChip from '@/components/ProfileChip'
import ShortTextNoteCard from '@/components/ShortTextNoteCard'
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Typography,
} from '@mui/material'
import {
  FC,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ArrowBackOutlined,
  Close,
  ElectricBolt,
  ThumbUp,
} from '@mui/icons-material'
import { AccountContext } from '@/contexts/AccountContext'
import { EventActionType, AppContext } from '@/contexts/AppContext'
import {
  NDKEvent,
  NDKKind,
  NDKUser,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import numeral from 'numeral'
import { useEvents } from '@/hooks/useEvent'
import { CreateEventForm } from './CreateEventForm'
import { LoadingButton } from '@mui/lab'
import { useFollowing, useMuting, useUser } from '@/hooks/useAccount'
import { isComment, isQuote } from '@/utils/event'
import { amountFormat } from '@/constants/app'
import ZapEventForm from './ZapEventForm'
import classNames from 'classnames'
import { ViewportList } from 'react-viewport-list'

export const EventProfileCard: FC<
  PropsWithChildren & { hexpubkey: string }
> = ({ children, hexpubkey }) => {
  const [loading, setLoading] = useState(false)
  const account = useUser()
  const [follows, follow, unfollow] = useFollowing()
  const itsYou = useMemo(
    () => account?.hexpubkey === hexpubkey,
    [account?.hexpubkey, hexpubkey],
  )
  const isFollowing = follows.find((d) => d.hexpubkey === hexpubkey)
  const user = useMemo(() => new NDKUser({ hexpubkey }), [hexpubkey])
  const handleClickFollow = useCallback(async () => {
    try {
      setLoading(true)
      await follow(user)
    } finally {
      setLoading(false)
    }
  }, [follow, user])
  const handleClickUnfollow = useCallback(async () => {
    try {
      setLoading(true)
      await unfollow(user)
    } finally {
      setLoading(false)
    }
  }, [unfollow, user])
  return (
    <Card className="!rounded-none">
      <Box className="px-3 pt-3 flex items-center gap-2 text-contrast-secondary">
        {children}
        <ProfileChip hexpubkey={hexpubkey} />
        {account && !itsYou && (
          <Box className="grow flex flex-col items-end shrink-0">
            {isFollowing ? (
              <LoadingButton
                loading={loading}
                color="secondary"
                size="small"
                variant="outlined"
                onClick={handleClickUnfollow}
              >
                Unfollow
              </LoadingButton>
            ) : (
              <LoadingButton
                loading={loading}
                color="secondary"
                size="small"
                variant="contained"
                onClick={handleClickFollow}
              >
                Follow
              </LoadingButton>
            )}
          </Box>
        )}
      </Box>
      <Divider className="!mt-3" />
    </Card>
  )
}

export const ShortTextNotePane = ({
  event,
  reposts = false,
  quotes = false,
  comments = false,
  likes = false,
  zaps = false,
  viewportRef,
}: {
  event: NDKEvent
  reposts?: boolean
  quotes?: boolean
  comments?: boolean
  likes?: boolean
  zaps?: boolean
  viewportRef?: MutableRefObject<any>
}) => {
  const { eventAction, setEventAction } = useContext(AppContext)
  const [muteList] = useMuting()
  const filter = useMemo(() => {
    const kinds: NDKKind[] = []
    if (comments || quotes) {
      kinds.push(NDKKind.Text)
    }
    if (reposts) {
      kinds.push(NDKKind.Repost)
    }
    if (likes) {
      kinds.push(NDKKind.Reaction)
    }
    if (zaps) {
      kinds.push(NDKKind.Zap)
    }
    return { kinds, '#e': [event.id] }
  }, [comments, quotes, reposts, likes, zaps, event.id])

  const [relatedEvents, error, state] = useEvents(filter)

  const relatedEventElements = useMemo(() => {
    if (!relatedEvents) return
    const _reposts: NDKEvent[] = []
    const _quotes: NDKEvent[] = []
    const _comments: NDKEvent[] = []
    const _likes: NDKEvent[] = []
    const _zaps: NDKEvent[] = []
    relatedEvents.forEach((item) => {
      if (muteList.includes(item.pubkey)) return
      const { content, tags, kind } = item
      switch (kind) {
        case NDKKind.Repost:
          _reposts.push(item)
          break
        case NDKKind.Text:
          if (quotes && isQuote(item, event)) {
            _quotes.push(item)
          } else if (comments && isComment(item, event, true)) {
            _comments.push(item)
          }
          break
        case NDKKind.Reaction:
          if (content !== '-') {
            _likes.push(item)
          }
          break
        case NDKKind.Zap:
          _zaps.push(item)
          break
      }
    })
    return [..._reposts, ..._quotes, ..._comments, ..._likes, ..._zaps]
      .sort((a, b) => a.created_at! - b.created_at!)
      .map((item, index) => {
        switch (item.kind) {
          case NDKKind.Repost:
            return <EventProfileCard key={index} hexpubkey={item.pubkey} />
          case NDKKind.Reaction:
            return (
              <EventProfileCard key={index} hexpubkey={item.pubkey}>
                <Box className="px-3 w-14 text-center">
                  {item.content === '+' ? (
                    <ThumbUp color="secondary" />
                  ) : (
                    <Typography
                      className="overflow-hidden whitespace-nowrap text-ellipsis text-contrast-primary"
                      variant="h6"
                    >
                      {item.content}
                    </Typography>
                  )}
                </Box>
              </EventProfileCard>
            )
          case NDKKind.Zap:
            const zapInvoice = zapInvoiceFromEvent(item)
            if (zapInvoice?.zappee && zapInvoice.amount) {
              const amount = numeral(zapInvoice.amount / 1000).format(
                amountFormat,
              )
              return (
                <EventProfileCard key={index} hexpubkey={zapInvoice.zappee}>
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
            } else {
              return
            }
          default:
            return (
              <ShortTextNoteCard
                key={index}
                event={item}
                depth={1}
                hideContent={item.kind !== NDKKind.Text}
                indentLine
              />
            )
        }
      })
  }, [relatedEvents, muteList, quotes, event, comments])
  const handleClickAction = useCallback(
    (type: EventActionType, options?: any) => () => {
      setEventAction({
        type,
        event,
        options,
      })
    },
    [event, setEventAction],
  )
  return (
    <Box>
      <ShortTextNoteCard
        className="!shadow-none"
        event={event}
        indent={false}
        viewNoteButton={false}
      />
      {event.kind === NDKKind.Text && (
        <Paper className="sticky top-[59px] z-10">
          <Box>
            <ButtonGroup
              className="flex [&>button]:flex-1 w-full text-contrast-secondary"
              variant="text"
              color="inherit"
            >
              <Button
                className={classNames({
                  '!bg-secondary/10': !!eventAction?.options?.reposts,
                })}
                color={eventAction?.options?.reposts ? 'secondary' : undefined}
                onClick={handleClickAction(EventActionType.View, {
                  reposts: true,
                })}
              >
                Reposts
              </Button>
              <Button
                className={classNames({
                  '!bg-secondary/10': !!eventAction?.options?.quotes,
                })}
                color={eventAction?.options?.quotes ? 'secondary' : undefined}
                onClick={handleClickAction(EventActionType.View, {
                  quotes: true,
                })}
              >
                Quotes
              </Button>
              <Button
                className={classNames({
                  '!bg-secondary/10': !!eventAction?.options?.comments,
                })}
                color={eventAction?.options?.comments ? 'secondary' : undefined}
                onClick={handleClickAction(EventActionType.View, {
                  comments: true,
                })}
              >
                Comments
              </Button>
              <Button
                className={classNames({
                  '!bg-secondary/10': !!eventAction?.options?.likes,
                })}
                color={eventAction?.options?.likes ? 'secondary' : undefined}
                onClick={handleClickAction(EventActionType.View, {
                  likes: true,
                })}
              >
                Reactions
              </Button>
              <Button
                className={classNames({
                  '!bg-secondary/10': !!eventAction?.options?.zaps,
                })}
                color={eventAction?.options?.zaps ? 'secondary' : undefined}
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
      )}
      {relatedEventElements ? (
        relatedEventElements.length ? (
          <ViewportList
            viewportRef={viewportRef}
            items={relatedEventElements}
            withCache
          >
            {(element) => element}
          </ViewportList>
        ) : (
          <Typography
            color="text.secondary"
            className="flex flex-1 justify-center items-end !py-2 italic"
          >
            No more content.
          </Typography>
        )
      ) : (
        <Box p={1} textAlign="center">
          <CircularProgress color="inherit" />
        </Box>
      )}
    </Box>
  )
}

const EventActionModal = () => {
  const viewportRef = useRef(null)
  const { user } = useContext(AccountContext)
  const { eventAction, backToPreviosModalAction, clearActions } =
    useContext(AppContext)
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
          event && (
            <ShortTextNotePane
              event={event}
              viewportRef={viewportRef}
              {...(eventAction?.options || {})}
            />
          )
        )
      default:
        return undefined
    }
  }, [eventAction])
  const title = useMemo(() => {
    const { type } = eventAction || {}
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
        return 'Note'
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
          <Paper className="sticky top-0 z-10 !rounded-none">
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
