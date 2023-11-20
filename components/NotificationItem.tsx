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
  ArrowRightAlt,
  Bolt,
  ChevronRightOutlined,
  Comment,
  FormatQuote,
  Repeat,
  ThumbUp,
  TravelExploreOutlined,
} from '@mui/icons-material'
import { NDKEvent, NDKKind, zapInvoiceFromEvent } from '@nostr-dev-kit/ndk'
import { NostrContext } from '@/contexts/NostrContext'
import { EventExt, transformText } from '@snort/system'
import { EventActionType, AppContext } from '@/contexts/AppContext'
import { extractLngLat } from '@/utils/extractLngLat'
import { MapContext } from '@/contexts/MapContext'
import { LngLatBounds } from 'maplibre-gl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import NoteMenu from './NoteMenu'
import classNames from 'classnames'
import { useEvent } from '@/hooks/useEvent'

const NotificationItem = ({
  className,
  event,
  action = true,
  relatedNoteVariant = 'fraction',
  depth = 0,
  hideContent = false,
  indent = true,
  indentLine,
  viewNoteButton = true,
  limitedHeight = false,
}: {
  className?: string
  event: NDKEvent
  action?: boolean
  relatedNoteVariant?: 'full' | 'fraction' | 'link'
  depth?: number
  hideContent?: boolean
  indent?: boolean
  indentLine?: boolean
  viewNoteButton?: boolean
  limitedHeight?: boolean
}) => {
  const pathname = usePathname()
  const query = useSearchParams()
  const router = useRouter()
  const { ndk } = useContext(NostrContext)
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

  const refTag = event.getMatchingTags('e')?.at(-1)
  const refId = refTag?.[1]
  const refType = refTag?.[3]
  const [refEvent] = useEvent(refId)

  const fromNote = useMemo(() => {
    if (event && depth === 0) {
      const thread = EventExt.extractThread(event as any)
      return thread?.root || thread?.replyTo
    }
  }, [event, depth])

  const { setEventAction } = useContext(AppContext)
  const handleClickRootNote = useCallback(async () => {
    if (ndk && refId) {
      if (refId) {
        setEventAction({
          type: EventActionType.View,
          event: refId,
          options: {
            comments: true,
          },
        })
      }
    }
  }, [ndk, refId, setEventAction])

  const lnglat = useMemo(() => extractLngLat(event), [event])
  const hexpubkey = useMemo(() => {
    if (event.kind === NDKKind.Zap) {
      const zap = zapInvoiceFromEvent(event)
      console.log('zap', zap)
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
    const _event = event.kind === NDKKind.Text ? event : refEvent
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
            if (refType === 'mention') {
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
  }, [event, refEvent, refType, setEventAction])

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

  console.log('refEvent', { event, refEvent, refId, refType })

  return (
    <Card className={className} square>
      <Box className="px-3 pt-3 flex items-center gap-3">
        <NotificationTypeIcon event={event} type={refType} />
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
              {depth === 0 && refId && (
                <Typography
                  className="cursor-pointer"
                  variant="caption"
                  color="secondary"
                  onClick={handleClickRootNote}
                >
                  {event.kind === 6 ? (
                    <>
                      <Repeat className="mr-1" fontSize="small" />
                      reposted note
                    </>
                  ) : event.kind === 1 ? (
                    <>
                      <ArrowRightAlt className="mr-1" fontSize="small" />
                      commented note
                    </>
                  ) : event.kind === 7 ? (
                    <>
                      <ArrowRightAlt className="mr-1" fontSize="small" />
                      reacted note
                    </>
                  ) : null}
                </Typography>
              )}
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
          <Box className={`flex justify-center ${indent ? 'w-20' : 'w-3'}`}>
            {indentLine && (
              <Box className="h-full w-[2px] bg-[rgba(255,255,255,0.12)]" />
            )}
          </Box>
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
                  <NoteActionBar event={event} />
                </Box>
              )}
            </CardContent>
          ) : (
            refEvent && (
              <CardContent className="flex-1 !pl-0 !pr-3 !py-0 overflow-hidden">
                <QuotedEvent
                  id={refEvent.id}
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
        return (
          <Typography variant="h6">
            <Bolt color="primary" />
          </Typography>
        )
      case NDKKind.Reaction:
        const reactionContent = transformText(event.content, event.tags)[0]
        return reactionContent.type === 'custom_emoji' ? (
          <img
            className="inline-block max-h-[1.5em] max-w-[1.5em]"
            alt="emoji"
            src={reactionContent.content}
          />
        ) : reactionContent.content === '+' ? (
          <ThumbUp color="secondary" />
        ) : (
          <Typography
            className="overflow-hidden whitespace-nowrap text-ellipsis text-contrast-primary"
            variant="h6"
          >
            {reactionContent.content}
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
