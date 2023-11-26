import { useMemo } from 'react'
import { useUser } from './useAccount'
import { FeedType } from '@/components/FeedFilterMenu'

export const useFeedType = (q?: string) => {
  const user = useUser()
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
