'use client'

import { useParams } from 'next/navigation'
import { useMemo, useRef } from 'react'
import { nip19 } from 'nostr-tools'
import { unixNow } from '@/utils/time'
import { NDKKind } from '@nostr-dev-kit/ndk'
import { useSubscribe } from '@/hooks/useSubscribe'
import { Divider, Paper } from '@mui/material'
import { ProfileCardFull } from '@/components/ProfileCard'
import EventList from '@/components/EventList'
import { useEventMarkers } from '@/hooks/useEventMakers'
import { FeedToolbar } from '@/components/FeedToolbar'

export default function Page() {
  const { value } = useParams()
  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
  )
  const query = useMemo(() => ({ npub: value.toString() }), [value])
  const hexpubkey = useMemo(() => {
    const result = nip19.decode(query.npub)
    if (result.type === 'nprofile') {
      return result.data.pubkey
    }
    if (result.type === 'npub') {
      return result.data
    }
    return
  }, [query])

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

  useEventMarkers(events)

  return (
    <>
      <Paper className="sticky top-0 z-10" square>
        <FeedToolbar query={query} />
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
