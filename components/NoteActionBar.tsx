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
import { EventActionType, useAppStore } from '@/contexts/AppContext'
import {
  NDKEvent,
  NDKKind,
  NDKZapInvoice,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import numeral from 'numeral'
import { useUserProfile } from '@/hooks/useUserProfile'
import { amountFormat } from '@/constants/app'
import { isComment, isQuote } from '@/utils/event'
import { useLongPress } from 'use-long-press'
import { EmojiPicker } from './EmojiPicker'
import TextNote from './TextNote'
import { EmojiClickData } from 'emoji-picker-react'
import { useNDK } from '@/contexts/NostrContext'
import { useAccountStore } from '@/contexts/AccountContext'

const NoteActionBar = ({
  event,
  relatedEvents,
  repost = true,
  quote = true,
  comment = true,
  react = true,
  zap = true,
}: {
  event: NDKEvent
  relatedEvents?: NDKEvent[]
  repost?: boolean
  quote?: boolean
  comment?: boolean
  react?: boolean
  zap?: boolean
}) => {
  const ndk = useNDK()
  const user = useAccountStore((state) => state.user)
  const muteList = useAccountStore((state) => state.muteList)
  const setEventAction = useAppStore((state) => state.setEventAction)
  const [reacted, setReacted] = useState<NDKEvent>()
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
          if (item.pubkey === user?.pubkey) {
            setReacted(item)
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
  }, [event, muteList, relatedEvents, user?.pubkey])

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
  const { repostAmount, quoteAmount, commentAmount, zapAmount } =
    useMemo(() => {
      const zapSummary = data?.zaps.reduce(
        (sum, { amount }) => sum + amount / 1000,
        0,
      )
      return {
        repostAmount: data?.reposts.length
          ? numeral(data.reposts.length).format(amountFormat)
          : undefined,
        quoteAmount: data?.quotes.length
          ? numeral(data.quotes.length).format(amountFormat)
          : undefined,
        commentAmount: data?.comments.length
          ? numeral(data.comments.length).format(amountFormat)
          : undefined,
        zapAmount: zapSummary
          ? numeral(zapSummary).format(amountFormat)
          : undefined,
      }
    }, [data])
  const handleClickReact = useCallback(
    async (reaction: Partial<EmojiClickData>) => {
      const newEvent = new NDKEvent(ndk)
      newEvent.kind = NDKKind.Reaction
      newEvent.tags = [
        ['e', event.id, event.relay?.url || ''].filter((item) => !!item),
      ]
      if (!reaction.isCustom) {
        newEvent.content = reaction.emoji!
      } else {
        newEvent.content = `:${reaction.emoji}:`
        newEvent.tags.push(['emoji', reaction.emoji!, reaction.imageUrl!])
      }
      setReacted(newEvent)
      setReaction({
        liked: liked + (reaction.emoji !== '-' ? 1 : 0),
        disliked: disliked + (reaction.emoji === '-' ? 1 : 0),
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

  const author = useUserProfile(event.pubkey)

  const [anchorEl, setAchorEl] = useState<Element>()
  const handleClose = () => setAchorEl(undefined)
  const bind = useLongPress((evt) => {
    setAchorEl(evt.nativeEvent.target as Element)
  })

  return (
    <Box className="text-contrast-secondary grid grid-flow-col grid-rows-1 grid-cols-5 gap-1 opacity-70">
      {repost && (
        <Tooltip title="Repost" disableInteractive>
          <Button
            color="inherit"
            size="small"
            onClick={handleClickAction(EventActionType.Repost)}
            startIcon={<RepeatOutlined />}
          >
            {!!repostAmount && (
              <Typography className="!w-7 text-left" variant="caption">
                {repostAmount}
              </Typography>
            )}
          </Button>
        </Tooltip>
      )}
      {quote && (
        <Tooltip title="Quote" disableInteractive>
          <Button
            color="inherit"
            size="small"
            onClick={handleClickAction(EventActionType.Quote)}
            startIcon={<FormatQuoteOutlined />}
          >
            {!!quoteAmount && (
              <Typography className="!w-7 text-left" variant="caption">
                {quoteAmount}
              </Typography>
            )}
          </Button>
        </Tooltip>
      )}
      {comment && (
        <Tooltip title="Comment" disableInteractive>
          <Button
            color="inherit"
            size="small"
            onClick={handleClickAction(EventActionType.Comment)}
            startIcon={<CommentOutlined />}
          >
            {!!commentAmount && (
              <Typography className="!w-7 text-left" variant="caption">
                {commentAmount}
              </Typography>
            )}
          </Button>
        </Tooltip>
      )}
      {react && (
        <Tooltip title="Like" disableInteractive>
          <Button
            color="inherit"
            size="small"
            {...(!reacted ? bind() : undefined)}
            onClick={
              anchorEl || !!reacted?.content
                ? undefined
                : () => handleClickReact({ emoji: '+' })
            }
            startIcon={
              reacted?.content === '+' ? (
                <ThumbUp className="!text-secondary" />
              ) : reacted && reacted?.content !== '-' ? (
                <TextNote
                  event={reacted}
                  className="text-contrast-primary !leading-[18px]"
                />
              ) : (
                <ThumbUpOutlined />
              )
            }
          >
            {!!likeAmount && (
              <Typography className="!w-7 text-left" variant="caption">
                {likeAmount}
              </Typography>
            )}
            <EmojiPicker
              open={!!anchorEl}
              user={user}
              anchorEl={anchorEl}
              onClose={handleClose}
              onEmojiClick={(data) => {
                handleClose()
                handleClickReact(data)
                console.log('onEmojiClick:data', data)
              }}
              transformOrigin={{
                horizontal: 'center',
                vertical: 'bottom',
              }}
            />
          </Button>
        </Tooltip>
      )}
      {zap && (
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
              {!!zapAmount && (
                <Typography className="!w-7 text-left" variant="caption">
                  {zapAmount}
                </Typography>
              )}
            </Button>
          </Box>
        </Tooltip>
      )}
    </Box>
  )
}

export default NoteActionBar
