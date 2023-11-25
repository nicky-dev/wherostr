'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { useMemo, useRef } from 'react'
import { nip19 } from 'nostr-tools'
import { unixNow } from '@/utils/time'
import { NDKKind } from '@nostr-dev-kit/ndk'
import { useSubscribe } from '@/hooks/useSubscribe'
import { useUserProfile } from '@/hooks/useUserProfile'
import { Box, Divider, IconButton, Paper, Typography } from '@mui/material'
import { ProfileCardFull } from '@/components/ProfileCard'
import EventList from '@/components/EventList'
import ProfileValidBadge from '@/components/ProfileValidBadge'
import { ArrowBackOutlined } from '@mui/icons-material'

export default function Page() {
  const router = useRouter()
  const { value } = useParams()
  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
  )
  const hexpubkey = useMemo(() => {
    if (typeof value !== 'string') return
    const result = nip19.decode(value)
    if (result.type === 'nprofile') {
      return result.data.pubkey
    }
    if (result.type === 'npub') {
      return result.data
    }
    return
  }, [value])

  const filter = useMemo(() => {
    if (!hexpubkey) return
    return {
      kinds: [NDKKind.Text, NDKKind.Repost],
      authors: [hexpubkey],
      until: unixNow(),
      limit: 30,
    }
  }, [hexpubkey])

  const [events, fetchMore] = useSubscribe(filter)

  const user = useUserProfile(hexpubkey)
  const displayName = useMemo(
    () =>
      user?.profile?.displayName ||
      user?.profile?.name ||
      user?.profile?.username ||
      user?.npub.substring(0, 12),
    [user],
  )

  return (
    <>
      <Paper className="sticky top-0 z-10" square>
        <Box className="flex items-center p-3 shadow gap-2">
          <IconButton size="small" onClick={() => router.back()}>
            <ArrowBackOutlined />
          </IconButton>
          <Box className="flex-1 flex items-center">
            <Typography
              className="overflow-hidden whitespace-nowrap text-ellipsis"
              variant="h6"
            >
              {displayName}
            </Typography>
            <ProfileValidBadge className="ml-2" user={user} />
          </Box>
        </Box>
        <Divider />
      </Paper>
      <ProfileCardFull hexpubkey={hexpubkey} />
      <Divider />
      <EventList
        events={events}
        onFetchMore={fetchMore}
        showComments={true}
        parentRef={scrollRef}
      />
    </>
  )
}
