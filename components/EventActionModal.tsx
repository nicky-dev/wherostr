'use client'
import '@getalby/bitcoin-connect-react'
import ProfileChip from '@/components/ProfileChip'
import ShortTextNoteCard from '@/components/ShortTextNoteCard'
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Card,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import {
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
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
import { useForm } from 'react-hook-form'
import { tryParseNostrLink, transformText } from '@snort/system'
import numeral from 'numeral'
import { requestProvider } from 'webln'
import { useEvents } from '@/hooks/useEvent'
import { CreateEventForm } from './CreateEventForm'
import { LoadingButton } from '@mui/lab'
import { useFollowing, useMuting, useUser } from '@/hooks/useAccount'
import { isComment } from '@/utils/event'
import { useNDK } from '@/hooks/useNostr'

const amountFormat = '0,0.[0]a'

const ZapEventForm = ({ event }: { event: NDKEvent }) => {
  const ndk = useNDK()
  const { setEventAction, showSnackbar } = useContext(AppContext)
  const { register, handleSubmit, setValue, watch } = useForm()
  const [loading, setLoading] = useState(false)
  const _amountValue = watch('amount')

  const maxWeight = useMemo(
    () =>
      event
        .getMatchingTags('zap')
        .reduce((a, [, , , w]) => (a += Number(w)), 0),
    [event],
  )

  const zaps = useMemo(() => {
    const zaps = event.getMatchingTags('zap')
    const zapsplit: { pubkey: string; weight: number; amount: number }[] = []
    zaps.forEach(([, p, , w]) => {
      const weight = Number(w)
      const amount = (1 - weight / maxWeight) * Number(_amountValue || 0)
      zapsplit.push({ pubkey: p, weight, amount })
    })
    return zapsplit
  }, [event, _amountValue, maxWeight])

  const _handleSubmit = useCallback(
    async (data: any) => {
      try {
        setLoading(true)
        const { amount, comment } = data
        const zapsplit = zaps.slice()
        if (!zapsplit.length) {
          zapsplit.push({
            pubkey: event.isReplaceable()
              ? event.tagValue('p') || event.pubkey
              : event.pubkey,
            amount,
            weight: 1,
          })
        }

        let totalAmount = 0
        await Promise.all(
          zapsplit.map(async (zap) => {
            const pr = await event.zap(
              Math.floor(zap.amount) * 1000,
              comment || undefined,
              undefined,
              ndk.getUser({ hexpubkey: zap.pubkey }),
            )
            if (pr) {
              await (await requestProvider()).sendPayment(pr)
              totalAmount += Math.floor(zap.amount)
            }
          }),
        )
        showSnackbar(`Zapped ${totalAmount} sats`, {
          slotProps: {
            alert: {
              severity: 'success',
            },
          },
        })
        setEventAction(undefined)
      } finally {
        setLoading(false)
      }
    },
    [event, ndk, zaps, setEventAction, showSnackbar],
  )
  const amountValue = useMemo(
    () =>
      _amountValue
        ? numeral(_amountValue).format(amountFormat).toUpperCase()
        : '?',
    [_amountValue],
  )
  const amountOptions = useMemo(
    () => [
      5, 20, 50, 100, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000,
      1_000_000,
    ],
    [],
  )
  const handleClickAmount = useCallback(
    (amount: Number) => () => {
      setValue('amount', amount)
    },
    [setValue],
  )

  return (
    <form onSubmit={handleSubmit(_handleSubmit)}>
      <Box className="mt-3 grid gap-3 grid-cols-1">
        {!!zaps.length && (
          <Box className="flex gap-4 justify-center">
            {zaps.map((d) => {
              return (
                <Box key={d.pubkey} className="relative scale-125">
                  <ProfileChip
                    hexpubkey={d.pubkey}
                    showName={false}
                    clickable={false}
                  />
                  <Avatar className="!absolute top-0 left-0 !bg-disabled-dark opacity-75">
                    <Typography variant="body2" fontWeight="bold" color="white">
                      {d.amount
                        ? numeral(Math.floor(d.amount)).format(amountFormat)
                        : d.weight}
                    </Typography>
                  </Avatar>
                </Box>
              )
            })}
          </Box>
        )}
        <Box className="relative max-h-80 border-2 border-secondary-dark rounded-2xl overflow-hidden">
          <ShortTextNoteCard
            event={event}
            action={false}
            relatedNoteVariant="link"
          />
          <Box className="absolute top-0 left-0 w-full h-full min-h-[320px] bg-gradient-to-t from-[#000000] to-50%" />
          <Box className="absolute right-0 bottom-0 border-t-2 border-l-2 border-secondary-dark p-2 rounded-tl-2xl text-primary bg-secondary-dark">
            <ElectricBolt />
          </Box>
        </Box>
        <TextField
          disabled={loading}
          placeholder="Comment"
          variant="outlined"
          fullWidth
          autoComplete="off"
          {...register('comment')}
        />
        <Box className="flex gap-2 flex-wrap justify-center">
          {amountOptions.map((amount, index) => (
            <Button
              disabled={loading}
              key={index}
              color="secondary"
              variant="outlined"
              startIcon={<ElectricBolt className="!text-primary" />}
              onClick={handleClickAmount(amount)}
            >
              {numeral(amount).format(amountFormat).toUpperCase()}
            </Button>
          ))}
        </Box>
        <TextField
          disabled={loading}
          placeholder="Amount"
          variant="outlined"
          type="number"
          fullWidth
          required
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment className="!text-primary" position="start">
                <ElectricBolt />
              </InputAdornment>
            ),
            endAdornment: <InputAdornment position="end">sats</InputAdornment>,
            inputProps: {
              min: 1,
            },
          }}
          {...register('amount', {
            required: true,
            valueAsNumber: true,
            min: 1,
          })}
        />
        <Box className="flex justify-end">
          <LoadingButton
            loading={loading}
            variant="contained"
            type="submit"
            loadingPosition="start"
            startIcon={<ElectricBolt />}
          >
            {`Zap ${amountValue} sats`}
          </LoadingButton>
        </Box>
      </Box>
    </form>
  )
}

const EventProfileCard: FC<PropsWithChildren & { hexpubkey: string }> = ({
  children,
  hexpubkey,
}) => {
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
                loadingPosition="start"
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
                loadingPosition="start"
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
}: {
  event: NDKEvent
  reposts?: boolean
  quotes?: boolean
  comments?: boolean
  likes?: boolean
  zaps?: boolean
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
          const linkFound =
            transformText(content, tags).filter(
              ({ type, content }) =>
                type === 'link' &&
                (content.startsWith('nostr:nevent1') ||
                  content.startsWith('nostr:note1')) &&
                tryParseNostrLink(content)?.id === event.id,
            ).length > 0

          const iscomment = isComment(item)
          const e = item.getMatchingTags('e')
          if (
            comments &&
            iscomment &&
            !linkFound &&
            e.at(-1)?.[1] === event.id
          ) {
            _comments.push(item)
          } else if (
            comments &&
            iscomment &&
            !linkFound &&
            e.at(0)?.[3] === 'reply'
          ) {
            _comments.push(item)
          } else if (quotes) {
            if (linkFound) {
              _quotes.push(item)
            }
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
      .map((item) => {
        switch (item.kind) {
          case NDKKind.Repost:
            return <EventProfileCard hexpubkey={item.pubkey} />
          case NDKKind.Reaction:
            return (
              <EventProfileCard hexpubkey={item.pubkey}>
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
                <EventProfileCard hexpubkey={zapInvoice.zappee}>
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
                key={item.id}
                event={item}
                depth={1}
                hideContent={item.kind !== NDKKind.Text}
                indentLine
              />
            )
        }
      })
  }, [comments, event.id, quotes, relatedEvents, muteList])
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
      <ShortTextNoteCard event={event} indent={false} viewNoteButton={false} />
      {event.kind === NDKKind.Text && (
        <>
          <Box>
            <ButtonGroup
              className="flex [&>button]:flex-1 w-full text-contrast-secondary"
              variant="text"
              color="inherit"
            >
              <Button
                color={eventAction?.options?.reposts ? 'secondary' : undefined}
                onClick={handleClickAction(EventActionType.View, {
                  reposts: true,
                })}
              >
                Reposts
              </Button>
              <Button
                color={eventAction?.options?.quotes ? 'secondary' : undefined}
                onClick={handleClickAction(EventActionType.View, {
                  quotes: true,
                })}
              >
                Quotes
              </Button>
              <Button
                color={eventAction?.options?.comments ? 'secondary' : undefined}
                onClick={handleClickAction(EventActionType.View, {
                  comments: true,
                })}
              >
                Comments
              </Button>
              <Button
                color={eventAction?.options?.likes ? 'secondary' : undefined}
                onClick={handleClickAction(EventActionType.View, {
                  likes: true,
                })}
              >
                Reactions
              </Button>
              <Button
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
        </>
      )}
      {relatedEventElements ? (
        relatedEventElements.length ? (
          relatedEventElements
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
  const { user } = useContext(AccountContext)
  const { eventAction, setEventAction, backToPreviosEventAction } =
    useContext(AppContext)
  const handleClickBack = useCallback(() => {
    backToPreviosEventAction()
  }, [backToPreviosEventAction])
  const handleClickCloseModal = useCallback(() => {
    setEventAction(undefined)
  }, [setEventAction])
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
        <Paper className="w-full overflow-y-auto !rounded-2xl">
          <Paper className="sticky top-0 z-10">
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
