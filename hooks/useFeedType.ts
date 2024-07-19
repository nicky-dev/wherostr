import { useMemo } from 'react'
import { FeedType } from '@/components/FeedFilterMenu'
import { useAccountStore } from '@/contexts/AccountContext'

export const useFeedType = (q?: string) => {
  const user = useAccountStore((state) => state.user)
  const feedType = useMemo<FeedType>(() => {
    if (user) {
      if (!q || q === 'following') {
        return 'following'
      } else if (q === 'conversation') {
        return 'conversation'
      }
    }
    return 'global'
  }, [user, q])
  return feedType
}
