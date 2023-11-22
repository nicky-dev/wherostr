'use client'
import { Box, Button, Tooltip, Typography } from '@mui/material'
import {
  RepeatOutlined,
  CommentOutlined,
  FormatQuoteOutlined,
  ThumbUp,
  ThumbUpOutlined,
  ElectricBoltOutlined,
} from '@mui/icons-material'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { EventActionType, AppContext } from '@/contexts/AppContext'
import {
  NDKEvent,
  NDKKind,
  NDKZapInvoice,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import numeral from 'numeral'
import { useNDK } from '@/hooks/useNostr'
import { useMuting, useUser } from '@/hooks/useAccount'
import { useUserProfile } from '@/hooks/useUserProfile'
import { amountFormat } from '@/constants/app'
import { isComment, isQuote } from '@/utils/event'

const NoteActionBar = ({
  event,
  relatedEvents,
}: {
  event: NDKEvent
  relatedEvents?: NDKEvent[]
}) => {
  const ndk = useNDK()
  const user = useUser()
  const [muteList] = useMuting()
  const { setEventAction } = useContext(AppContext)
  const [reacted, setReacted] = useState<'+' | '-' | undefined>()
  const [{ liked, disliked }, setReaction] = useState({
    liked: 0,
    disliked: 0,
  })

  const data = useMemo(() => {
    const reposts: NDKEvent[] = []
    const reacts: NDKEvent[] = []
    const zaps: (
      | NDKZapInvoice
      | {
          amount: number
        }
    )[] = []
    const quotes: NDKEvent[] = []
    const comments: NDKEvent[] = []
    setReacted(undefined)
    relatedEvents?.forEach((item) => {
      if (muteList.includes(item.pubkey)) return
      switch (item.kind) {
        case NDKKind.Text:
          if (isQuote(item, event)) {
            quotes.push(item)
          } else if (isComment(item, event, true)) {
            comments.push(item)
          }
          break
        case NDKKind.Repost:
          reposts.push(item)
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
      quotes,
      comments,
      reposts,
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
  const likeAmount = useMemo(() => numeral(liked).format(amountFormat), [liked])
  const { repostAmount, quoteAmount, commentAmount, zapAmount } = useMemo(
    () => ({
      repostAmount: numeral(data?.reposts.length).format(amountFormat),
      quoteAmount: numeral(data?.quotes.length).format(amountFormat),
      commentAmount: numeral(data?.comments.length).format(amountFormat),
      zapAmount: numeral(
        data?.zaps.reduce((sum, { amount }) => sum + amount / 1000, 0),
      ).format(amountFormat),
    }),
    [data],
  )
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
      // console.log('relaySet', relaySet)
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

  const author = useUserProfile(event.pubkey)

  return (
    <Box className="text-contrast-secondary grid grid-flow-col grid-rows-1 grid-cols-5 gap-1">
      <Tooltip title="Repost" disableInteractive>
        <Button
          color="inherit"
          size="small"
          onClick={handleClickAction(EventActionType.Repost)}
          startIcon={<RepeatOutlined />}
        >
          <Typography className="!w-7 text-left" variant="caption">
            {repostAmount}
          </Typography>
        </Button>
      </Tooltip>
      <Tooltip title="Quote" disableInteractive>
        <Button
          color="inherit"
          size="small"
          onClick={handleClickAction(EventActionType.Quote)}
          startIcon={<FormatQuoteOutlined />}
        >
          <Typography className="!w-7 text-left" variant="caption">
            {quoteAmount}
          </Typography>
        </Button>
      </Tooltip>
      <Tooltip title="Comment" disableInteractive>
        <Button
          color="inherit"
          size="small"
          onClick={handleClickAction(EventActionType.Comment)}
          startIcon={<CommentOutlined />}
        >
          <Typography className="!w-7 text-left" variant="caption">
            {commentAmount}
          </Typography>
        </Button>
      </Tooltip>
      <Tooltip title="Like" disableInteractive>
        <Button
          color="inherit"
          size="small"
          onClick={reacted === '+' ? undefined : handleClickReact('+')}
          startIcon={
            reacted === '+' ? (
              <ThumbUp className="!text-secondary" />
            ) : (
              <ThumbUpOutlined />
            )
          }
        >
          <Typography className="!w-7 text-left" variant="caption">
            {likeAmount}
          </Typography>
        </Button>
      </Tooltip>
      <Tooltip title="Zap" disableInteractive>
        <Box>
          <Button
            className="w-full"
            color="inherit"
            disabled={!author?.profile?.lud16 && !author?.profile?.lud06}
            size="small"
            onClick={handleClickAction(EventActionType.Zap)}
            startIcon={<ElectricBoltOutlined />}
          >
            <Typography className="!w-7 text-left" variant="caption">
              {zapAmount}
            </Typography>
          </Button>
        </Box>
      </Tooltip>
    </Box>
  )
}

export default NoteActionBar
