'use client'
import { Paper, Typography } from '@mui/material'
import { useMemo, useRef } from 'react'
import { useSubscribe } from '@/hooks/useSubscribe'
import { DAY, unixNow } from '@/utils/time'
import { Notifications } from '@mui/icons-material'
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import EventList from '@/components/EventList'
import NotificationItem from '@/components/NotificationItem'
import { useAccountStore } from '@/contexts/AccountContext'

const renderNotificationItem = (item: NDKEvent, props: any) => (
  <NotificationItem
    key={item.deduplicationKey()}
    event={item}
    limitedHeight
    {...(props || {})}
  />
)

export default function Page() {
  const signing = useAccountStore((state) => state.signing)
  const user = useAccountStore((state) => state.user)
  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
  )
  const filter = useMemo(() => {
    if (signing) return
    if (!user?.pubkey) return
    return {
      kinds: [NDKKind.Text, NDKKind.Reaction, NDKKind.Zap, NDKKind.Repost],
      limit: 50,
      '#p': [user.pubkey],
      until: unixNow() + DAY,
    }
  }, [signing, user?.pubkey])
  const [data, fetchMore, newItems, showNewItems] = useSubscribe(filter)

  return (
    <>
      <Paper
        className="flex gap-2 items-center px-3 py-2 sticky top-[58px] z-10"
        square
      >
        <Notifications className="m-2" />
        <Typography variant="h6">Notifications</Typography>
      </Paper>
      <EventList
        parentRef={scrollRef}
        events={data}
        newItems={newItems}
        onShowNewItems={showNewItems}
        onFetchMore={fetchMore}
        renderEventItem={renderNotificationItem}
        excludedMe
      />
    </>
  )
}
