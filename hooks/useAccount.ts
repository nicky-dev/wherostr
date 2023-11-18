'use client'
import { AccountContext, AccountProps } from '@/contexts/AccountContext'
import { NDKEvent, NDKKind, NDKUser } from '@nostr-dev-kit/ndk'
import { useCallback, useContext, useMemo } from 'react'
import { useNDK } from './useNostr'

export const useUser = () => {
  const { user } = useContext(AccountContext)
  return useMemo(() => user, [user])
}
export const useAccount = () => {
  const { user, signing, readOnly, signIn, signOut } =
    useContext(AccountContext)
  return useMemo(() => {
    return { user, signing, readOnly, signIn, signOut }
  }, [user, signing, readOnly, signIn, signOut])
}

export const useFollowing = () => {
  const { follows, follow, unfollow } = useContext(AccountContext)
  return useMemo<[NDKUser[], AccountProps['follow'], AccountProps['unfollow']]>(
    () => [follows, follow, unfollow],
    [follows, follow, unfollow],
  )
}

export const useFollowList = () => {
  const { followLists, followHashtag, unfollowHashtag } =
    useContext(AccountContext)
  return useMemo<
    [
      AccountProps['followLists'],
      AccountProps['followHashtag'],
      AccountProps['unfollowHashtag'],
    ]
  >(
    () => [followLists, followHashtag, unfollowHashtag],
    [followLists, followHashtag, unfollowHashtag],
  )
}

export const useMuting = () => {
  const ndk = useNDK()
  const { muteList, setMuteList } = useContext(AccountContext)
  const mute = useCallback(
    async (muteUser: NDKUser) => {
      const event = new NDKEvent(ndk)
      event.kind = NDKKind.MuteList
      const muteSet = new Set(muteList)
      muteSet.forEach((d) => {
        event.tag(ndk.getUser({ pubkey: d }))
      })
      event.tag(muteUser)
      muteSet.add(muteUser.pubkey)
      await event.publish()
      setMuteList(Array.from(muteSet))
    },
    [ndk, muteList, setMuteList],
  )

  return useMemo<[AccountProps['muteList'], typeof mute]>(() => {
    return [muteList || [], mute]
  }, [muteList, mute])
}
