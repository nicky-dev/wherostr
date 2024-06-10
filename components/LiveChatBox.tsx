'use client'
import { useSubscribe } from '@/hooks/useSubscribe'
import { DAY, unixNow } from '@/utils/time'
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material'
import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKZapInvoice,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import classNames from 'classnames'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { nip19 } from 'nostr-tools'
import { useAccount, useMuting, useUser } from '@/hooks/useAccount'
import { ViewportListRef } from 'react-viewport-list'
import ProfileAvatar from './ProfileAvatar'
import { useUserProfile } from '@/hooks/useUserProfile'
import { amountFormat } from '@/constants/app'
import numeral from 'numeral'
import {
  CommentOutlined,
  ElectricBolt,
  ElectricBoltOutlined,
  ThumbUp,
  ThumbUpOutlined,
} from '@mui/icons-material'
import TextNote from './TextNote'
import EventList from './EventList'
import { isComment } from '@/utils/event'
import { useNDK } from '@/hooks/useNostr'
import { AppContext, EventActionType } from '@/contexts/AppContext'

const MessageActionBar = ({
  event,
  relatedEvents,
  comment = true,
  react = true,
  zap = true,
}: {
  event: NDKEvent
  relatedEvents?: NDKEvent[]
  comment?: boolean
  react?: boolean
  zap?: boolean
}) => {
  const ndk = useNDK()
  const { setEventAction } = useContext(AppContext)
  const user = useUser()
  const author = useUserProfile(event.pubkey)
  const [muteList] = useMuting()
  const [reacted, setReacted] = useState<'+' | '-' | undefined>()
  const [{ liked, disliked }, setReaction] = useState({
    liked: 0,
    disliked: 0,
  })
  const data = useMemo(() => {
    const reacts: NDKEvent[] = []
    const zaps: (
      | NDKZapInvoice
      | {
          amount: number
        }
    )[] = []
    const comments: NDKEvent[] = []
    setReacted(undefined)
    relatedEvents?.forEach((item) => {
      if (muteList.includes(item.pubkey)) return
      switch (item.kind) {
        case NDKKind.Text:
          if (isComment(item, event, true)) {
            comments.push(item)
          }
          break
        case NDKKind.Reaction:
          if (item.pubkey === user?.hexpubkey) {
            setReacted(item.content === '-' ? '-' : '+')
          }
          reacts.push(item)
          break
        case NDKKind.Zap:
          zaps.push(zapInvoiceFromEvent(item) || { amount: 0 })
          break
      }
    })
    return {
      comments,
      reacts,
      zaps,
    }
  }, [event, muteList, relatedEvents, user?.hexpubkey])
  useEffect(() => {
    if (!data) return
    const reaction = data.reacts.reduce(
      (a, b) => {
        if (b.content !== '-') {
          a.liked += 1
        } else {
          a.disliked += 1
        }
        return a
      },
      { liked: 0, disliked: 0 },
    )
    setReaction(reaction)
  }, [data])
  const likeAmount = useMemo(
    () => (liked ? numeral(liked).format(amountFormat) : undefined),
    [liked],
  )
  const { commentAmount, zapAmount } = useMemo(() => {
    const zapSummary = data?.zaps.reduce(
      (sum, { amount }) => sum + amount / 1000,
      0,
    )
    return {
      commentAmount: data?.comments.length
        ? numeral(data.comments.length).format(amountFormat)
        : undefined,
      zapAmount: zapSummary
        ? numeral(zapSummary).format(amountFormat)
        : undefined,
    }
  }, [data])
  const handleClickReact = useCallback(
    (reaction: '+' | '-') => async () => {
      const newEvent = new NDKEvent(ndk)
      newEvent.kind = NDKKind.Reaction
      newEvent.content = reaction
      newEvent.tags = [
        ['e', event.id, event.relay?.url || ''].filter((item) => !!item),
      ]
      setReacted(reaction)
      setReaction({
        liked: liked + (reaction === '+' ? 1 : 0),
        disliked: disliked + (reaction === '-' ? 1 : 0),
      })
      await newEvent.publish()
    },
    [event, ndk, liked, disliked],
  )
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
    <Box className="text-contrast-secondary flex items-center gap-2 opacity-70">
      {comment && (
        <Tooltip title="Comment" disableInteractive>
          <IconButton
            color="inherit"
            size="small"
            onClick={handleClickAction(EventActionType.Comment)}
          >
            <CommentOutlined fontSize="small" />
            {!!commentAmount && (
              <Typography className="!w-7 text-left" variant="caption">
                {commentAmount}
              </Typography>
            )}
          </IconButton>
        </Tooltip>
      )}
      {react && (
        <Tooltip title="Like" disableInteractive>
          <IconButton
            color="inherit"
            size="small"
            onClick={reacted === '+' ? undefined : handleClickReact('+')}
          >
            {reacted === '+' ? (
              <ThumbUp className="!text-secondary" fontSize="small" />
            ) : (
              <ThumbUpOutlined fontSize="small" />
            )}
            {!!likeAmount && (
              <Typography className="!w-7 text-left" variant="caption">
                {likeAmount}
              </Typography>
            )}
          </IconButton>
        </Tooltip>
      )}
      {zap && (author?.profile?.lud16 || author?.profile?.lud06) && (
        <Tooltip title="Zap" disableInteractive>
          <Box>
            <IconButton
              color="inherit"
              size="small"
              onClick={handleClickAction(EventActionType.Zap)}
            >
              <ElectricBoltOutlined fontSize="small" />
              {!!zapAmount && (
                <Typography className="!w-7 text-left" variant="caption">
                  {zapAmount}
                </Typography>
              )}
            </IconButton>
          </Box>
        </Tooltip>
      )}
    </Box>
  )
}

const MessageItem = ({
  className,
  event,
  relatedEvents,
}: {
  className?: string
  event: NDKEvent
  relatedEvents?: NDKEvent[]
}) => {
  const zapInvoice = zapInvoiceFromEvent(event)
  const zapAmount = useMemo(
    () =>
      zapInvoice
        ? numeral(zapInvoice.amount / 1000).format(amountFormat)
        : undefined,
    [zapInvoice],
  )
  const hexpubkey = useMemo(
    () => zapInvoice?.zappee || event.pubkey,
    [event.pubkey, zapInvoice?.zappee],
  )
  const user = useUserProfile(hexpubkey)
  const displayName = useMemo(
    () =>
      user?.profile?.displayName ||
      user?.profile?.name ||
      user?.profile?.username ||
      user?.npub?.substring(0, 12),
    [user],
  )
  const action = useMemo(() => event.kind === 1311, [event.kind])
  const account = useUser()
  const itsYou = useMemo(
    () => account?.hexpubkey === hexpubkey,
    [account?.hexpubkey, hexpubkey],
  )
  const createdDate = useMemo(() => {
    if (!event.created_at) {
      return undefined
    }
    const currentDate = new Date()
    const createAt = new Date(event.created_at * 1000)
    if (
      currentDate.getFullYear() !== createAt.getFullYear() ||
      currentDate.getMonth() !== createAt.getMonth() ||
      currentDate.getDate() !== createAt.getDate()
    ) {
      return createAt.toLocaleDateString('en-us', {
        year:
          currentDate.getFullYear() !== createAt.getFullYear()
            ? 'numeric'
            : undefined,
        month: 'short',
        day: 'numeric',
      })
    }
  }, [event])
  const createdTime = useMemo(() => {
    if (!event.created_at) {
      return undefined
    }
    const createAt = new Date(event.created_at * 1000)
    return createAt.toLocaleTimeString('en-us', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [event])
  return (
    <Box className={classNames('flex flex-col gap-1', className)}>
      <Box className="flex gap-2 justify-start items-start">
        {!itsYou && <ProfileAvatar hexpubkey={hexpubkey} avatarSize={32} />}
        <Box className="flex-1 overflow-x-hidden">
          {!itsYou && (
            <Typography
              className="text-contrast-secondary grow-0 shrink-0 overflow-hidden whitespace-nowrap text-ellipsis block"
              variant="body2"
            >
              {displayName}
            </Typography>
          )}
          <Box
            className={classNames('flex gap-2 items-end', {
              'flex-row-reverse': itsYou,
            })}
          >
            {zapInvoice ? (
              <Box
                className={classNames(
                  'rounded-2x border-2 border-primary rounded-2xl px-3 py-2 inline-block',
                  itsYou ? '!rounded-tr-none' : '!rounded-tl-none mt-1',
                )}
              >
                <Typography
                  className="align-middle flex items-center text-contrast-secondary"
                  variant="body2"
                >
                  Zapped
                  <ElectricBolt className="mx-1" color="primary" />
                  <span className="mr-2 text-primary font-bold">
                    {zapAmount}
                  </span>
                  sats
                </Typography>
                {!!event.content && (
                  <TextNote
                    className="pt-1"
                    event={event}
                    textVariant="body2"
                  />
                )}
              </Box>
            ) : (
              !!event.content && (
                <Box
                  className={classNames(
                    'bg-contrast-primary/10 rounded-2xl px-3 py-2 inline-block overflow-hidden',
                    itsYou ? '!rounded-tr-none' : '!rounded-tl-none mt-1',
                  )}
                >
                  <TextNote event={event} textVariant="body2" />
                </Box>
              )
            )}
            {createdTime && (
              <Box className="shrink-0 text-contrast-secondary opacity-70 flex flex-col pb-1">
                {createdDate && (
                  <Typography className="!text-[10px]">
                    {createdDate}
                  </Typography>
                )}
                <Typography className="!text-[10px]">{createdTime}</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      {/* {action && (
        <Box className={classNames(itsYou ? 'flex justify-end' : 'ml-10')}>
          <MessageActionBar event={event} relatedEvents={relatedEvents} />
        </Box>
      )} */}
    </Box>
  )
}

const LiveChatBox = ({
  className,
  naddr,
}: {
  className?: string
  naddr?: string
}) => {
  const scrollRef = useRef<ViewportListRef>(null)
  const viewportRef = useRef(null)
  const { user, signing } = useAccount()
  const decodedAddress = useMemo(() => {
    try {
      return typeof naddr === 'string' ? nip19.decode(naddr) : undefined
    } catch (err) {}
  }, [naddr])
  const hexpubkey = useMemo(
    () =>
      decodedAddress?.type === 'naddr' &&
      decodedAddress.data.kind === 30311 &&
      decodedAddress.data.pubkey,
    [decodedAddress],
  )
  const identifier = useMemo(
    () =>
      decodedAddress?.type === 'naddr' &&
      decodedAddress.data.kind === 30311 &&
      decodedAddress.data.identifier,
    [decodedAddress],
  )
  const filter = useMemo<NDKFilter | undefined>(() => {
    if (signing || !hexpubkey || !identifier) return
    return {
      kinds: [NDKKind.Zap, 1311 as any],
      '#a': [`30311:${hexpubkey}:${identifier}`],
      limit: 100,
      until: unixNow() + DAY,
    }
  }, [hexpubkey, identifier, signing])
  const options = useMemo(
    () => ({
      sortDesc: false,
    }),
    [],
  )
  const [events] = useSubscribe(filter, true, undefined, options)
  const renderEventItem = useCallback(
    (item: NDKEvent, props: any) => (
      <MessageItem
        key={item.deduplicationKey()}
        className="py-2"
        event={item}
        relatedEvents={props.relatedEvents}
      />
    ),
    [],
  )
  return (
    <Box className={classNames('w-full h-full relative', className)}>
      {decodedAddress?.type === 'naddr' &&
      decodedAddress?.data.kind === 30311 ? (
        <>
          <Box className="flex absolute inset-0 items-end">
            <Box
              ref={viewportRef}
              className="max-h-full w-full overflow-y-auto"
            >
              <EventList
                className="px-2"
                parentRef={viewportRef}
                scrollRef={scrollRef}
                events={events}
                renderEventItem={renderEventItem}
                keepBottom
              />
            </Box>
          </Box>
        </>
      ) : (
        <Typography className="py-2 px-3 text-center" variant="h6">
          Invalid live activity address
        </Typography>
      )}
    </Box>
  )
}

export default LiveChatBox
