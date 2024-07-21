'use client'
import { FC, PropsWithChildren, useEffect } from 'react'
import {
  NDKEvent,
  NDKKind,
  NDKList,
  NDKNip07Signer,
  NDKPrivateKeySigner,
  NDKSubscriptionCacheUsage,
  NDKUser,
} from '@nostr-dev-kit/ndk'
import { nip19 } from 'nostr-tools'
import { nanoid } from 'nanoid'
import { hasNip7Extension } from '@/utils/nostr'
import { useNDK, useNostrStore } from './NostrContext'
import { create } from 'zustand'
import { useSnackbar } from '@/components/SnackbarAlert'
import { persist, createJSONStorage } from 'zustand/middleware'

export type SignInType = 'nip7' | 'nsec' | 'npub'

export interface FollowListItem {
  type: 'tag' | 'list' | 'bounds'
  id: string
  name: string
  value: any
}

export interface AccountProps {
  user?: NDKUser
  readOnly: boolean
  signing: boolean
  muteList: string[]
  follows: NDKUser[]
  followLists: FollowListItem[]
  initUser: () => Promise<void>
  updateFollows: (user: NDKUser) => Promise<void>
  setFollowLists: (followLists: FollowListItem[]) => void
  signIn: (type: SignInType, key?: string) => Promise<NDKUser | void>
  signOut: () => void
  setFollows: (follows: NDKUser[]) => void
  setMuteList: (muteList: string[]) => void
  follow: (newFollow: NDKUser) => Promise<void>
  unfollow: (unfollowUser: NDKUser) => Promise<void>
  followHashtag: (hashtag: string) => Promise<void>
  unfollowHashtag: (hashtag: string) => Promise<void>
}

export const useAccountStore = create<AccountProps>()((set, get) => ({
  user: undefined,
  readOnly: true,
  muteList: [],
  follows: [],
  signing: true,
  followLists: [],
  initUser: async () => {
    const { signIn } = get()
    try {
      const { session } = useSessionStore.getState()
      if (session?.pubkey && session.type) {
        await new Promise((resolve) => {
          setTimeout(() => {
            signIn(
              session.type!,
              session.type === 'nsec' ? session?.nsec : session?.pubkey,
            ).then(resolve)
          }, 500)
        })
        return
      }
    } finally {
      set((state) => ({ ...state, signing: false }))
    }
  },
  updateFollows: async (user: NDKUser) => {
    const { ndk } = useNostrStore.getState()
    const follows: Set<NDKUser> = new Set()
    const contactListEvent = await ndk.fetchEvent(
      {
        kinds: [3],
        authors: [user.pubkey],
      },
      { subId: nanoid(8), cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY },
    )
    if (contactListEvent) {
      const pubkeys = new Set<string>()
      contactListEvent.tags.forEach((tag) => {
        if (tag[0] === 'p') {
          try {
            pubkeys.add(tag[1])
          } catch (e) {}
        }
      })
      pubkeys.forEach((pubkey) => {
        const user = new NDKUser({ hexpubkey: pubkey })
        user.ndk = ndk
        follows.add(user)
      })
    }
    const _follows = Array.from(follows)
    follows.forEach((item) => {
      ndk.cacheAdapter?.fetchProfile?.(item.pubkey)
    })
    set((state) => ({ ...state, follows: _follows }))
  },
  setFollowLists: (followLists: FollowListItem[]) =>
    set((state) => ({ ...state, followLists })),
  signIn: async (type: SignInType, key?: string) => {
    const { showSnackbar } = useSnackbar.getState()
    const { ndk, getUser } = useNostrStore.getState()
    const { updateFollows } = get()
    try {
      const { setSession } = useSessionStore.getState()
      let user: NDKUser | undefined
      set((state) => ({ ...state, signing: true }))
      let pubkey: string | undefined
      let readOnly = true
      if (type === 'nip7') {
        if (!hasNip7Extension()) {
          return showSnackbar('Extension not found')
        }
        readOnly = false
        ndk.signer = new NDKNip07Signer()
        const signerUser = await ndk.signer?.user()
        if (signerUser) {
          pubkey = signerUser.pubkey
          // user = await getUser(signerUser.pubkey)
          // setReadOnly(false)
        }
      } else if (type === 'nsec') {
        readOnly = false
        let secret = key
        if (key?.startsWith('nsec')) {
          const nsecProfile = nip19.decode(key)
          if (nsecProfile.type !== 'nsec') throw new Error('Invalid nsec')
          secret = nsecProfile.data
        }
        ndk.signer = new NDKPrivateKeySigner(secret)
        const signerUser = await ndk.signer?.user()
        if (signerUser) {
          pubkey = signerUser.pubkey
          readOnly = false
        }
      } else if (type === 'npub' && key) {
        readOnly = true
        pubkey = key
        ndk.signer = undefined
      }
      if (pubkey) {
        user = await getUser(pubkey)
      }
      if (user) {
        if (!ndk.activeUser) {
          ndk.activeUser = user
        }
        await new Promise<void>((resolve) => {
          if (ndk.pool.connectedRelays().length === 0) {
            ndk.pool.once('connect', () => resolve())
          } else {
            resolve()
          }
        })
        setSession({
          pubkey: user.pubkey,
          type,
          ...(type === 'nsec' ? { nsec: key } : undefined),
        })
        // await connectToUserRelays(user)
        await updateFollows(user)
        set((state) => ({ ...state, user, readOnly }))
        return user
      }
    } catch (err: any) {
      showSnackbar(err.message, {
        slotProps: { alert: { severity: 'error' } },
      })
    } finally {
      set((state) => ({ ...state, signing: false }))
    }
  },
  signOut: () => {
    const { removeSession } = useSessionStore.getState()
    const { ndk } = useNostrStore.getState()
    ndk.signer = undefined
    removeSession()
    set((state) => ({ ...state, user: undefined, readOnly: true }))
  },
  setFollows: (follows: NDKUser[]) => set((state) => ({ ...state, follows })),
  setMuteList: (muteList: string[]) => set((state) => ({ ...state, muteList })),
  follow: async (newFollow: NDKUser) => {
    const { user, follows } = get()
    const { ndk } = useNostrStore.getState()
    if (!user) return
    const followsSet = new Set<NDKUser>(follows)
    const followUser = ndk.getUser({ hexpubkey: newFollow.pubkey })
    if (followsSet.has(followUser)) {
      return
    }
    followsSet.add(followUser)
    const event = new NDKEvent(ndk)
    event.kind = 3
    followsSet.forEach((follow) => {
      event.tag(follow)
    })
    await event.publish()
    set((state) => ({ ...state, follows: Array.from(followsSet) }))
  },
  unfollow: async (unfollowUser: NDKUser) => {
    const { ndk } = useNostrStore.getState()
    const { follows } = get()
    if (!follows.length) return
    const event = new NDKEvent(ndk)
    event.kind = 3
    const followsSet = new Set(follows)
    const exists = follows.find((d) => d.pubkey === unfollowUser.pubkey)
    exists && followsSet.delete(exists)
    followsSet.forEach((d) => {
      event.tag(d)
    })
    await event.publish()
    set((state) => ({ ...state, follows: Array.from(followsSet) }))
  },
  followHashtag: async (hashtag: string) => {
    const { ndk } = useNostrStore.getState()
    const { followLists, user } = get()
    if (!user) return
    const hashtagLow = hashtag.toLowerCase()
    const tags = followLists.filter((d) => d.type === 'tag').map((d) => d.id)
    const followsSet = new Set(tags)
    followsSet.add(hashtagLow)
    const event = new NDKEvent(ndk)
    event.kind = 30001
    event.pubkey = user.pubkey
    event.tags.push(['d', 'follow'])
    followsSet.forEach((tag) => {
      event.tags.push(['t', tag])
    })
    await event.publish()
    set((prev) => ({
      followLists: [
        ...prev.followLists,
        { type: 'tag', id: hashtagLow, name: hashtagLow, value: hashtagLow },
      ],
    }))
  },
  unfollowHashtag: async (hashtag: string) => {
    const { ndk } = useNostrStore.getState()
    const { followLists, user } = get()
    if (!user) return
    const hashtagLow = hashtag.toLowerCase()
    const tags = followLists.filter((d) => d.type === 'tag').map((d) => d.id)
    const followsSet = new Set(tags)
    followsSet.delete(hashtagLow)
    const event = new NDKEvent(ndk)
    event.kind = 30001
    event.pubkey = user.pubkey
    event.tags.push(['d', 'follow'])
    followsSet.forEach((tag) => {
      event.tags.push(['t', tag])
    })
    await event.publish()
    set((prev) => ({
      followLists: prev.followLists.filter(
        (d) => d.type !== 'tag' || d.id !== hashtagLow,
      ),
    }))
  },
}))

export const AccountContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const ndk = useNDK()
  const { user, initUser, setFollowLists } = useAccountStore()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (user) return
    initUser()
  }, [user])

  useEffect(() => {
    if (!user?.pubkey) return
    const fn = async () => {
      const events = await ndk.fetchEvents(
        [
          {
            kinds: [NDKKind.CategorizedPeopleList],
            authors: [user.pubkey],
            '#d': ['mute'],
            limit: 1,
          },
        ],
        { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST, subId: nanoid(8) },
      )
      events.forEach((ev) => {
        const list = NDKList.from(ev)
        list.items.forEach((item) => {
          ndk.mutedIds.set(item[1], item[0])
        })
      })
    }
    fn()
  }, [user?.pubkey])

  useEffect(() => {
    if (!user?.pubkey) return setFollowLists([])
    const fn = async () => {
      const events = await ndk.fetchEvents(
        [
          {
            kinds: [30001 as NDKKind],
            authors: [user?.pubkey],
            '#d': ['follow'],
            limit: 1,
          },
          {
            kinds: [NDKKind.CategorizedPeopleList],
            authors: [user?.pubkey],
          },
        ],
        { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST, subId: nanoid(8) },
      )

      let tagList: NDKEvent | undefined
      let peopleList: FollowListItem[] = []
      events?.forEach((ev) => {
        if (ev.kind === 30001) {
          tagList = ev
        } else if (ev.kind) {
          const value = ev.getMatchingTags('p')
          if (!value.length) return
          const name = ev.tagValue('title')
          if (!name) return
          const id = ev.tagValue('d')
          if (!id) return
          const naddr = nip19.naddrEncode({
            identifier: id,
            kind: ev.kind,
            pubkey: ev.pubkey,
          })
          peopleList.push({ type: 'list', id, name, value: naddr })
        }
      })
      const tags =
        tagList?.getMatchingTags('t').map<FollowListItem>(([, tag]) => {
          const tagLower = tag.toLowerCase()
          return { type: 'tag', id: tagLower, name: tagLower, value: tagLower }
        }) || []
      setFollowLists(peopleList.concat(tags))
    }
    fn()
  }, [user?.pubkey])

  return children
}

export interface SessionItem {
  type?: SignInType
  pubkey?: string
  nsec?: string
  pin?: string
}

export interface SessionStore {
  session?: SessionItem
  setSession: (session: SessionItem) => void
  removeSession: () => void
}

const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      session: undefined,
      setSession: (session: SessionItem) => set({ session }),
      removeSession: () => set({}),
    }),
    {
      name: 'session', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    },
  ),
)
