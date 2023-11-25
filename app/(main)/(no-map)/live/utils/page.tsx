'use client'
import { useUser } from '@/hooks/useAccount'
import { useEvent } from '@/hooks/useEvent'
import { useNDK, useStreamRelaySet } from '@/hooks/useNostr'
import { WEEK, unixNow } from '@/utils/time'
import {
  Box,
  Button,
  Chip,
  Divider,
  TextField,
  Typography,
} from '@mui/material'
import { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import Link from 'next/link'
import {
  FormEvent,
  FormEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { nip19 } from 'nostr-tools'
import { useSubscribe } from '@/hooks/useSubscribe'

const twitchRegex = /(?:https:\/\/)?clips\.twitch\.tv\/(\S+)/i
const youtubeRegex = /(?:https:\/\/)?clips\.youtube\.com\/(\S+)/i

let timeoutHandler: NodeJS.Timeout
export default function Page() {
  const ndk = useNDK()
  const user = useUser()
  const since = useMemo(() => unixNow() - WEEK, [])
  const filter = useMemo<NDKFilter | undefined>(() => {
    return {
      kinds: [30311 as NDKKind],
      authors: user?.hexpubkey ? [user.hexpubkey] : [],
      since,
    }
  }, [since, user])
  const relaySet = useStreamRelaySet()
  const [items] = useSubscribe(filter, true, relaySet)
  const ev = useRef(items[0])
  ev.current = items[0]

  const createEvent = useCallback(() => {
    if (!ndk || !ev.current) return
    const ndkEvent = new NDKEvent(ndk)
    ndkEvent.content = ev.current.content
    ndkEvent.kind = ev.current.kind
    ndkEvent.author = ev.current.author
    ndkEvent.tags = ev.current.tags
    return ndkEvent
  }, [ndk])

  const updateLiveStats = useCallback(
    async (ev: NDKEvent) => {
      try {
        const imageUrl = getImageUrl(ev)
        console.debug('updateLiveStats', 'status', ev.tagValue('status'))
        if (ev.tagValue('status') !== 'live') return
        const stats = await fetchStats(ev).catch((err) => console.error(err))
        console.debug('updateLiveStats', 'stats', stats)
        if (!stats) return
        let currentPaticipants = ev.tagValue('current_participants') || '0'
        // if (currentPaticipants === stats.viewers?.toString()) return
        currentPaticipants = stats.viewers?.toString()
        const ndkEvent = createEvent()
        if (!ndkEvent) return
        ndkEvent.removeTag('current_participants')
        ndkEvent.tags.push(['current_participants', currentPaticipants])
        ev.removeTag('current_participants')
        ev.tags.push(['current_participants', currentPaticipants])
        if (imageUrl && imageUrl !== ev.tagValue('image')) {
          // const time = unixNow()
          console.debug('updateLiveStats', 'imageUrl', imageUrl)
          ndkEvent.removeTag('image')
          ndkEvent.tags.push(['image', imageUrl])
          ev.removeTag('image')
          ev.tags.push(['image', imageUrl])
        }
        await ndkEvent.publish(relaySet)
      } catch (err) {}
    },
    [createEvent, relaySet],
  )

  const triggerInterval = useCallback(async () => {
    clearTimeout(timeoutHandler)
    console.debug('triggerInterval', ev.current)
    if (ev.current) {
      await updateLiveStats(ev.current)
      timeoutHandler = setTimeout(() => {
        triggerInterval()
      }, 60000)
    } else {
      timeoutHandler = setTimeout(() => {
        triggerInterval()
      }, 5000)
    }
  }, [updateLiveStats])

  useEffect(() => {
    triggerInterval()
    return () => {
      clearTimeout(timeoutHandler)
    }
  }, [triggerInterval])

  const handleUpdate = useCallback<(name: string) => FormEventHandler>(
    (name: string) => async (evt: FormEvent<HTMLFormElement>) => {
      evt.preventDefault()
      if (!ev.current) return
      const form = new FormData(evt.currentTarget)
      const value = form.get(name)?.toString()
      if (!value) return
      const ndkEvent = createEvent()
      if (!ndkEvent) return
      if (ndkEvent.tagValue('status') === 'ended') {
        ev.current.removeTag(name)
        ndkEvent.removeTag(name)
      }
      ev.current.removeTag(name)
      ev.current.tags.push([name, value])
      ndkEvent.removeTag(name)
      ndkEvent.tags.push([name, value])
      await ndkEvent.publish(relaySet)
    },
    [createEvent, relaySet],
  )

  const isLive = ev.current?.tagValue('status') === 'live'
  const tags = ev.current?.getMatchingTags('t') || []
  const id = ev.current?.tagValue('d')
  const naddr = useMemo(
    () =>
      nip19.naddrEncode({
        identifier: id || '',
        kind: 30311,
        pubkey: ev.current?.pubkey || '',
      }),
    [id],
  )
  return (
    <>
      <Box className="flex-1 flex flex-col p-4">
        {ev.current ? (
          <>
            <Typography component={Link} href={'/' + naddr} target="_blank">
              View stream
            </Typography>
            <Typography variant="h6" fontWeight="bold">
              {ev.current?.tagValue('title')}
            </Typography>
            <Typography>{ev.current?.tagValue('summary')}</Typography>
            <Box className="flex mt-2 gap-2">
              <Chip
                color={isLive ? 'primary' : 'secondary'}
                label={isLive ? 'LIVE' : 'ENDED'}
              />
              {isLive && (
                <Chip
                  variant="outlined"
                  label={
                    (ev.current?.tagValue('current_participants') || 0) +
                    ' viewers'
                  }
                />
              )}
              {tags.map(([_, tag], i) => {
                return <Chip key={i} label={tag} />
              })}
            </Box>
            {isLive ? (
              <Box component="form" onSubmit={handleUpdate('streaming')}>
                <Divider className="!my-4" />
                <TextField
                  fullWidth
                  margin="dense"
                  size="small"
                  name="streaming"
                  autoComplete="off"
                  label="Streaming URL"
                  placeholder="https://..."
                  defaultValue={ev.current?.tagValue('streaming')}
                  InputProps={{
                    sx: { pr: 0 },
                    endAdornment: (
                      <Button type="submit" variant="contained">
                        Update
                      </Button>
                    ),
                  }}
                />
              </Box>
            ) : undefined}
            {!isLive ? (
              <Box component="form" onSubmit={handleUpdate('recording')}>
                <Divider className="!my-4" />
                <TextField
                  fullWidth
                  margin="dense"
                  size="small"
                  name="recording"
                  autoComplete="off"
                  label="Recording URL"
                  placeholder="https://..."
                  defaultValue={ev.current?.tagValue('recording')}
                  InputProps={{
                    sx: { pr: 0 },
                    endAdornment: (
                      <Button type="submit" variant="contained">
                        Update
                      </Button>
                    ),
                  }}
                />
              </Box>
            ) : undefined}
          </>
        ) : (
          <Typography>No Live Event.</Typography>
        )}
      </Box>
    </>
  )
}

const getAPIUrl = (ev: NDKEvent) => {
  const streamingUrl = ev?.tagValue('streaming')
  if (!streamingUrl) return
  const url = new URL(streamingUrl)
  if (twitchRegex.test(streamingUrl)) {
    return
  } else if (youtubeRegex.test(streamingUrl)) {
    return
  } else if (streamingUrl.endsWith('.m3u8')) {
    const streamKey = streamingUrl?.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    )?.[0]
    return `${url.protocol}//${url.host}/api/v3/widget/process/restreamer-ui:ingest:${streamKey}`
  }
}

const getImageUrl = (ev: NDKEvent) => {
  const streamingUrl = ev?.tagValue('streaming')
  if (!streamingUrl) return
  if (twitchRegex.test(streamingUrl)) {
    return
  } else if (youtubeRegex.test(streamingUrl)) {
    return
  } else if (streamingUrl.endsWith('.m3u8')) {
    return streamingUrl.replace('.m3u8', '.jpg')
  }
}

const fetchStats = async (ev: NDKEvent) => {
  const apiUrl = getAPIUrl(ev)
  console.debug('fetchStats', 'apiUrl', apiUrl)
  if (!apiUrl) return
  try {
    const result = await fetch(apiUrl)
    const jsonResult = await result.json()
    return {
      viewers: jsonResult.current_sessions,
      uptime: jsonResult.uptime,
    }
  } catch (err) {
    console.log(err)
  }
}
