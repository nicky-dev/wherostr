import { useNDK } from '@/contexts/NostrContext'
import { NDKKind, NDKUser } from '@nostr-dev-kit/ndk'
import { useCallback } from 'react'
import usePromise from 'react-use-promise'

export const useEmoji = (user?: NDKUser) => {
  const ndk = useNDK()
  const fetchEmojiList = useCallback(async () => {
    if (!user?.pubkey) return
    return ndk.fetchEvent({
      kinds: [NDKKind.EmojiList],
      authors: [user?.pubkey],
    })
  }, [ndk, user?.pubkey])

  const fetchEmoji = useCallback(
    async (ref: string) => {
      return ndk.fetchEvent(ref)
    },
    [ndk],
  )

  return usePromise(async () => {
    const emojiList = await fetchEmojiList()
    if (!emojiList) return []
    const tags = emojiList?.getMatchingTags('a')
    const result = await Promise.allSettled(
      tags ? tags?.map(([, ref]) => fetchEmoji(ref)) : [],
    )
    return result
      .filter((d) => d.status === 'fulfilled')
      .map((d) => (d.status === 'fulfilled' ? d.value : undefined))
  }, [fetchEmojiList, fetchEmoji])
}
