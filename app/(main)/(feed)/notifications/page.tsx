'use client'
import { useTheme } from '@mui/material'
import { useSearchParams } from 'next/navigation'
import { useMemo, useRef } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useAction } from '@/hooks/useApp'
import { useSubscribe } from '@/hooks/useSubscribe'
import { DAY, unixNow } from '@/utils/time'
import NotificationList from '@/components/NotificationList'

export default function Page() {
  const { signing, user } = useAccount()
  const { eventAction, profileAction, setEventAction } = useAction()
  const theme = useTheme()
  const searchParams = useSearchParams()
  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
  )
  const filter = useMemo(() => {
    if (signing) return
    if (!user?.pubkey) return
    return {
      kinds: [7, 1, 9735, 6],
      limit: 20,
      '#p': [user.pubkey],
      until: unixNow() + DAY,
    }
  }, [signing, user?.pubkey])
  const [data, fetchMore, newItems, showNewItems] = useSubscribe(filter)

  return (
    <NotificationList
      parentRef={scrollRef}
      events={data}
      newItems={newItems}
      onShowNewItems={showNewItems}
      onFetchMore={fetchMore}
      showComments
    />
  )
}
