'use client'
import { NDKEvent, NDKTag } from '@nostr-dev-kit/ndk'
import { Box, Chip, Hidden, Paper, Toolbar, Typography } from '@mui/material'
import { LiveVideoPlayer } from './LiveVideoPlayer'
import { LiveChat } from './LiveChat'
import { useCallback, useMemo, useState } from 'react'
import ProfileChip from './ProfileChip'
import { ElectricBolt, Share, SubscriptionsSharp } from '@mui/icons-material'
import { LiveStreamTime } from './LiveStreamTime'
import ResponsiveButton from './ResponsiveButton'
import { useUserProfile } from '@/hooks/useUserProfile'
import StatusBadge from './StatusBadge'
import { EventActionType, useAppStore } from '@/contexts/AppContext'
import { StreamButton } from './StreamButton'
import { DeleteButton } from './DeleteEventButton'
import { v4 as uuidv4 } from 'uuid'
import TextNote from './TextNote'
import { useAccountStore } from '@/contexts/AccountContext'

export interface LiveActivityItem {
  id: string
  author: string
  pubkey: string
  title: string
  summary?: string
  image?: string
  starts?: number
  ends?: number
  status?: 'live' | 'ended'
  viewers?: string
  streaming?: string
  recording?: string
  tags: NDKTag[]
}

const LiveActivity = ({
  naddr,
  event,
}: {
  naddr: string
  event?: NDKEvent
}) => {
  const setEventAction = useAppStore((state) => state.setEventAction)
  const user = useAccountStore((state) => state.user)
  const follows = useAccountStore((state) => state.follows)
  const follow = useAccountStore((state) => state.follow)
  const [loading, setLoading] = useState(false)
  const liveItem = useLiveActivityItem(event)
  const autoplay = useMemo(() => liveItem.status === 'live', [liveItem.status])
  const author = useUserProfile(liveItem.pubkey)
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
    <Box className="grid gap-2 lg:gap-4 lg:p-4 flex-1 overflow-visible grid-cols-1 lg:grid-cols-[auto_440px] bg-[inherit]">
      <Box className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:w-0 gap-2">
        <Paper
          component={LiveVideoPlayer}
          className="relative overflow-hidden flex-auto lg:flex-none flex items-center justify-center"
          sx={{ aspectRatio: '16/9' }}
          stream={liveItem.recording || liveItem.streaming}
          autoPlay={autoplay}
          poster={liveItem.image}
        />
        <Box className="mx-2 flex flex-none flex-col overflow-visible items-stretch">
          <Box className="flex flex-1 items-stretch md:items-start overflow-hidden flex-col-reverse md:flex-row lg:flex-initial">
            <Hidden mdDown>
              <Box className="flex-1 overflow-hidden mr-2">
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  noWrap
                  overflow="hidden"
                  textOverflow="ellipsis"
                >
                  {liveItem.title}
                </Typography>
              </Box>
            </Hidden>
            <Box className="flex items-center gap-2">
              <ProfileChip hexpubkey={author?.pubkey} showNip5={false} />
              <Box className="flex-1 md:flex-auto" component="span" />
              {liveItem.pubkey &&
                !follows.find((d) => d.pubkey === liveItem.pubkey) && (
                  <ResponsiveButton
                    loading={loading}
                    loadingPosition="start"
                    color="inherit"
                    variant="outlined"
                    size="small"
                    startIcon={<SubscriptionsSharp />}
                    onClick={async () => {
                      if (!author) return
                      try {
                        setLoading(true)
                        await follow(author)
                      } finally {
                        setLoading(false)
                      }
                    }}
                  >
                    Follow
                  </ResponsiveButton>
                )}
              <ResponsiveButton
                color="inherit"
                variant="outlined"
                size="small"
                startIcon={<Share />}
                onClick={handleClickAction(EventActionType.Quote)}
              >
                Share
              </ResponsiveButton>
              <ResponsiveButton
                color="primary"
                variant="contained"
                size="small"
                startIcon={<ElectricBolt />}
                onClick={handleClickAction(EventActionType.Zap)}
              >
                Zap
              </ResponsiveButton>
            </Box>
          </Box>
          <Hidden lgDown>
            {!!liveItem.summary && (
              <TextNote
                textVariant="subtitle2"
                skipEmbedLink
                event={{ content: liveItem.summary }}
              />
            )}
            <Box className="flex flex-wrap gap-2 mt-2 items-center">
              <StatusBadge status={liveItem.status} />
              {liveItem.status === 'live' && (
                <>
                  {typeof liveItem.viewers !== 'undefined' && (
                    <Chip
                      sx={{ fontWeight: 'bold' }}
                      variant="outlined"
                      label={`${liveItem.viewers} viewers`}
                    />
                  )}
                  <Chip
                    sx={{ fontWeight: 'bold' }}
                    variant="outlined"
                    label={<LiveStreamTime starts={liveItem.starts} />}
                  />
                </>
              )}
              {liveItem.tags.map(([_, tag], i) => {
                return <Chip key={i} label={tag} />
              })}
            </Box>
          </Hidden>
          {user?.pubkey === liveItem.author && (
            <Box my={1} gap={1} display="flex">
              <StreamButton
                label="Edit"
                mode="edit"
                data={event}
                size="small"
              />
              <DeleteButton event={event} />
            </Box>
          )}
        </Box>
      </Box>
      <Paper className="overflow-hidden relative flex flex-col lg:mb-4">
        <Hidden lgDown>
          <Toolbar className="!min-h-[48px]">
            <Typography variant="h6" fontWeight="bold">
              Live Chat
            </Typography>
            {/* <Box flex={1} />
            <Typography
              component="a"
              color="primary"
              sx={{ textDecoration: 'underline' }}
              href={`https://zap.stream/chat/${naddr}?chat=true`}
              target="_blank"
              variant="caption"
            >
              zap.stream
            </Typography> */}
          </Toolbar>
        </Hidden>
        <LiveChat naddr={naddr} event={liveItem} />
      </Paper>
    </Box>
  )
}

export default LiveActivity

export const useLiveActivityItem = (event?: NDKEvent) => {
  const liveItem = useMemo<LiveActivityItem>(() => {
    if (!event)
      return {
        id: uuidv4(),
        author: '',
        pubkey: '',
        tags: [],
        title: '',
      }
    const id = event?.tagValue('d') || ''
    const pubkey = event?.tagValue('p') || event?.pubkey || ''
    const title = event?.tagValue('title') || ''
    const summary = event?.tagValue('summary')
    const image = event?.tagValue('image')
    const starts = Number(event?.tagValue('starts'))
    const ends = Number(event?.tagValue('ends'))
    const status = event?.tagValue('status') === 'live' ? 'live' : 'ended'
    const viewers = event?.tagValue('current_participants')
    const streaming = event?.tagValue('streaming')
    const recording = event?.tagValue('recording')
    const tags = event?.getMatchingTags('t') || []
    return {
      id,
      author: event?.pubkey || '',
      pubkey,
      title,
      summary,
      image,
      starts,
      ends,
      status,
      viewers,
      streaming,
      recording,
      tags,
    }
  }, [event])
  return liveItem
}
