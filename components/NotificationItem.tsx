'use client'
import NoteActionBar from '@/components/NoteActionBar'
import ProfileChip from '@/components/ProfileChip'
import TextNote, { QuotedEvent } from '@/components/TextNote'
import TimeFromNow from '@/components/TimeFromNow'
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ChevronRightOutlined,
  Comment,
  ElectricBolt,
  FormatQuote,
  Repeat,
  ThumbUp,
  TravelExploreOutlined,
} from '@mui/icons-material'
import { NDKEvent, NDKKind, zapInvoiceFromEvent } from '@nostr-dev-kit/ndk'
import {
  EventExt,
  Fragment,
  ParsedFragment,
  transformText,
} from '@snort/system'
import { EventActionType, AppContext } from '@/contexts/AppContext'
import { extractLngLat } from '@/utils/extractLngLat'
import { MapContext } from '@/contexts/MapContext'
import { LngLatBounds } from 'maplibre-gl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import NoteMenu from './NoteMenu'
import classNames from 'classnames'
import { amountFormat } from '@/constants/app'
import numeral from 'numeral'

const NotificationItem = ({
  className,
  event,
  action = true,
  relatedNoteVariant = 'fraction',
  depth = 0,
  hideContent = false,
  indent = true,
  viewNoteButton = true,
  limitedHeight = false,
  relatedEvents,
}: {
  className?: string
  event: NDKEvent
  action?: boolean
  relatedNoteVariant?: 'full' | 'fraction' | 'link'
  depth?: number
  hideContent?: boolean
  indent?: boolean
  viewNoteButton?: boolean
  limitedHeight?: boolean
  relatedEvents?: NDKEvent[]
}) => {
  const pathname = usePathname()
  const query = useSearchParams()
  const router = useRouter()
  const { map } = useContext(MapContext)

  const contentRef = useRef(null)
  const [overLimitedHeight, setOverLimitedHeight] = useState<
    boolean | undefined
  >(undefined)

  useEffect(() => {
    if (limitedHeight) {
      if (!contentRef.current) return
      const resizeObserver = new ResizeObserver(() => {
        setOverLimitedHeight((contentRef?.current as any)?.clientHeight > 480)
      })
      resizeObserver.observe(contentRef.current)
      return () => resizeObserver.disconnect()
    } else {
      setOverLimitedHeight(undefined)
    }
  }, [limitedHeight])

  const createdDate = useMemo(
    () => (event.created_at ? new Date(event.created_at * 1000) : undefined),
    [event],
  )

  const fromNote = useMemo(() => {
    if (event && depth === 0) {
      const thread = EventExt.extractThread(event as any)
      if (!thread && event.kind === 6) {
        const tagE = event.getMatchingTags('e')
        const [key, value, relay, marker] =
          tagE.find(([_1, _2, _3, desc]) => desc === 'mention') || []
        return value
          ? {
              key,
              value,
              relay,
              marker,
            }
          : undefined
      }
      return thread?.replyTo || thread?.root || thread?.mentions.at(-1)
    }
  }, [event, depth])

  const { setEventAction } = useContext(AppContext)
  const lnglat = useMemo(() => extractLngLat(event), [event])
  const hexpubkey = useMemo(() => {
    if (event.kind === NDKKind.Zap) {
      const zap = zapInvoiceFromEvent(event)
      return zap?.zappee || event.pubkey
    } else if (event.kind === 30311) {
      let hostPubkey
      const pTags = event.getMatchingTags('p')
      if (pTags.length) {
        hostPubkey = pTags[0][1]
        for (const item of pTags) {
          if (item[3]?.toLowerCase() === 'host') {
            hostPubkey = item[1]
            break
          }
        }
      }
      return hostPubkey || event.pubkey
    } else {
      return event.pubkey
    }
  }, [event])
  const handleClickViewNote = useCallback(() => {
    const _event = event.kind === NDKKind.Text ? event : fromNote?.value
    if (_event) {
      const options: any = {}
      if (event.kind !== NDKKind.Text) {
        switch (event.kind) {
          case NDKKind.Zap:
            options.zaps = true
            break
          case NDKKind.Reaction:
            options.likes = true
            break
          case NDKKind.Repost:
            options.reposts = true
            break
          case NDKKind.Text:
            if (fromNote?.marker === 'mention') {
              options.quotes = true
              break
            }
          default:
            options.comments = true
            break
        }
      } else {
        options.comments = true
      }
      setEventAction({
        type: EventActionType.View,
        event: _event,
        options,
      })
    }
  }, [event, fromNote, setEventAction])

  const difficulty = useMemo(() => {
    const diff = event.getMatchingTags('nonce').at(0)?.[2]
    if (!diff) return
    const match = event.id.match(/^0+(\d|[a-f])/)?.[0]
    if (!match) return
    const nonceDiff = Number(diff)
    const idDiff = match.split('0').reduce((a, b) => {
      if (!b) {
        a += 4
      } else {
        a +=
          Number('0x' + b)
            .toString(2)
            .padStart(4, '0')
            .match(/^0+/)?.[0].length || 0
      }
      return a
    }, 0)
    if (idDiff < nonceDiff) return
    return idDiff
  }, [event])

  return (
    <Card className={className} square>
      <Box className="px-3 pt-3 flex items-center gap-2">
        <NotificationTypeIcon event={event} type={fromNote?.marker} />
        <Box className="flex-1 flex items-center gap-2 text-contrast-secondary">
          <ProfileChip hexpubkey={hexpubkey} />
          {createdDate && (
            <Box className="grow flex flex-col items-end shrink-0">
              <Typography variant="caption">
                {difficulty && (
                  <>
                    <Tooltip title={event.id} disableInteractive>
                      <Typography variant="caption" fontWeight="bold">
                        PoW-{difficulty}
                      </Typography>
                    </Tooltip>
                    <Box component="span" className="mx-1" />
                  </>
                )}
                <TimeFromNow date={createdDate} />
              </Typography>
            </Box>
          )}
          {action && (
            <>
              {!!lnglat && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setTimeout(() => {
                      map?.fitBounds(LngLatBounds.fromLngLat(lnglat), {
                        duration: 1000,
                        maxZoom: 16,
                      })
                    }, 300)
                    const q = query.get('q') || ''
                    router.replace(`${pathname}?q=${q}&map=1`, {
                      scroll: false,
                    })
                  }}
                >
                  <TravelExploreOutlined className="text-contrast-secondary" />
                </IconButton>
              )}
              <NoteMenu event={event} />
              {viewNoteButton && (
                <IconButton size="small" onClick={handleClickViewNote}>
                  <ChevronRightOutlined className="text-contrast-secondary" />
                </IconButton>
              )}
            </>
          )}
        </Box>
      </Box>
      {!hideContent && (
        <Box className="flex min-h-[12px]">
          <Box
            className={classNames('flex justify-center pl-3', {
              'w-[60px]': indent,
            })}
          />
          {event?.kind === NDKKind.Text ? (
            <CardContent className="flex-1 !pl-0 !pr-3 !pt-3 !pb-0 overflow-hidden">
              <Box
                className={classNames({
                  'max-h-[400px] overflow-hidden relative rounded-b-2xl':
                    limitedHeight &&
                    (overLimitedHeight || overLimitedHeight === undefined),
                })}
              >
                <Box ref={contentRef}>
                  <TextNote
                    event={event}
                    relatedNoteVariant={relatedNoteVariant}
                  />
                </Box>
                {overLimitedHeight && (
                  <Box className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-disabled-dark to-100% flex justify-center items-end pb-3">
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      onClick={handleClickViewNote}
                    >
                      Show more...
                    </Button>
                  </Box>
                )}
              </Box>
              {action && (
                <Box className="mt-3">
                  <NoteActionBar event={event} relatedEvents={relatedEvents} />
                </Box>
              )}
            </CardContent>
          ) : (
            fromNote?.value && (
              <CardContent className="flex-1 !pl-0 !pr-3 !py-0 overflow-hidden">
                <QuotedEvent
                  id={fromNote?.value}
                  relatedNoteVariant={relatedNoteVariant}
                  icon={
                    event.kind === NDKKind.Repost ? <Repeat /> : <Comment />
                  }
                />
              </CardContent>
            )
          )}
        </Box>
      )}
      <Divider className="!mt-3" />
    </Card>
  )
}

export default NotificationItem

const NotificationTypeIcon = ({
  event,
  type,
}: {
  event: NDKEvent
  type?: string
}) => {
  const typeIcon = useMemo(() => {
    switch (event.kind) {
      case NDKKind.Zap:
        const zapInvoice = zapInvoiceFromEvent(event)

        const amount = numeral((zapInvoice?.amount || 0) / 1000).format(
          amountFormat,
        )

        return (
          <Box className="flex flex-col items-center">
            <ElectricBolt className="mr-1" color="primary" fontSize="small" />
            <Typography
              className="w-8 !font-bold"
              variant="body2"
              color="primary"
            >
              {amount}
            </Typography>
          </Box>
        )
      case NDKKind.Reaction:
        const reactionContent = transformText(event.content, event.tags)[0]
        return reactionContent?.type === 'custom_emoji' ? (
          <img
            className="inline-block max-h-[1.5em] max-w-[1.5em]"
            alt="emoji"
            src={reactionContent.content}
          />
        ) : reactionContent?.content === '+' ? (
          <ThumbUp color="secondary" />
        ) : (
          <Typography
            className="overflow-hidden whitespace-nowrap text-ellipsis text-contrast-primary"
            variant="h6"
          >
            {reactionContent?.content}
          </Typography>
        )
      case NDKKind.Repost:
        return (
          <Typography variant="h6">
            <Repeat />
          </Typography>
        )
      case NDKKind.Text:
        if (type === 'mention') {
          return (
            <Typography variant="h6">
              <FormatQuote />
            </Typography>
          )
        }
        return (
          <Typography variant="h6">
            <Comment />
          </Typography>
        )
    }
  }, [event, type])

  return <Box className="w-10 text-center">{typeIcon}</Box>
}

function extractCustomEmoji(fragments: Fragment[], tags: Array<Array<string>>) {
  return fragments
    .map((f) => {
      if (typeof f === 'string') {
        if (f === ':heart-eyes:') console.log(f)
        return f.split(/:(.*):/g).map((i) => {
          if (f === ':heart-eyes:') console.log(i)
          const t = tags.find((a) => a[0] === 'emoji' && a[1] === i)
          if (t) {
            return {
              type: 'custom_emoji',
              content: t[2],
            } as ParsedFragment
          } else {
            return i
          }
        })
      }
      return f
    })
    .flat()
    .filter((a) => a)
    .map((a) => unwrap(a)) as Array<ParsedFragment>
}

export function unwrap<T>(v: T | undefined | null): T {
  if (v === undefined || v === null) {
    throw new Error('missing value')
  }
  return v
}
