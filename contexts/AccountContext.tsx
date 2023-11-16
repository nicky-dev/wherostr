'use client'
import {
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  NDKEvent,
  NDKKind,
  NDKNip07Signer,
  NDKPrivateKeySigner,
  NDKRelay,
  NDKRelayStatus,
  NDKSubscriptionCacheUsage,
  NDKUser,
} from '@nostr-dev-kit/ndk'
import { NostrContext } from '@/contexts/NostrContext'
import { useAction } from '@/hooks/useApp'
import { nip19 } from 'nostr-tools'
import usePromise from 'react-use-promise'
import { nanoid } from 'nanoid'

export type SignInType = 'nip7' | 'nsec' | 'npub'

export interface FollowListItem {
  type: 'tag' | 'people' | 'bounds'
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
  signIn: (type: SignInType, key?: string) => Promise<NDKUser | void>
  signOut: () => Promise<void>
  setFollows: Dispatch<SetStateAction<NDKUser[]>>
  setMuteList: Dispatch<SetStateAction<string[]>>
  follow: (newFollow: NDKUser) => Promise<void>
  unfollow: (unfollowUser: NDKUser) => Promise<void>
}

export const AccountContext = createContext<AccountProps>({
  user: undefined,
  readOnly: true,
  muteList: [],
  follows: [],
  signing: true,
  followLists: [],
  signIn: async () => {},
  signOut: async () => {},
  setFollows: () => {},
  setMuteList: () => {},
  follow: async () => {},
  unfollow: async () => {},
})

export const AccountContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { ndk, getUser } = useContext(NostrContext)
  const { showSnackbar } = useAction()
  const [readOnly, setReadOnly] = useState(true)
  const [signing, setSigning] = useState<boolean>(true)
  const [user, setUser] = useState<NDKUser>()
  const [follows, setFollows] = useState<NDKUser[]>([])
  const [followLists, setFollowLists] = useState<FollowListItem[]>([])
  const [muteList, setMuteList] = useState<string[]>([])
  const nostrRef = useRef<typeof window.nostr>(
    typeof window !== 'undefined' ? window.nostr : undefined,
  )
  nostrRef.current = typeof window !== 'undefined' ? window.nostr : undefined
  const hasNip7Extension = useCallback(() => {
    return !!nostrRef.current
  }, [nostrRef])

  const updateFollows = useCallback(
    async (user: NDKUser) => {
      const follows: Set<NDKUser> = new Set()
      const contactListEvent = await ndk.fetchEvent(
        {
          kinds: [3],
          authors: [user.hexpubkey],
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
      setFollows(Array.from(follows))
    },
    [ndk],
  )

  const follow = useCallback(
    async (newFollow: NDKUser) => {
      if (!user) return
      const followsSet = new Set(follows)
      const followUser = ndk.getUser({ hexpubkey: newFollow.hexpubkey })
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
      setFollows(Array.from(followsSet))
    },
    [user, follows, ndk],
  )

  const unfollow = useCallback(
    async (unfollowUser: NDKUser) => {
      if (!follows.length) return
      const event = new NDKEvent(ndk)
      event.kind = 3
      const followsSet = new Set(follows)
      const exists = follows.find((d) => d.hexpubkey === unfollowUser.hexpubkey)
      exists && followsSet.delete(exists)
      followsSet.forEach((d) => {
        event.tag(d)
      })
      await event.publish()
      setFollows(Array.from(followsSet))
    },
    [follows, ndk],
  )

  const signIn = useCallback(
    async (type: SignInType, key?: string) => {
      try {
        let user: NDKUser | undefined
        setSigning(true)
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
            pubkey = signerUser.hexpubkey
            // user = await getUser(signerUser.hexpubkey)
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
            pubkey = signerUser.hexpubkey
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
          localStorage.setItem(
            'session',
            JSON.stringify({
              pubkey: user.hexpubkey,
              type,
              ...(type === 'nsec' ? { nsec: key } : undefined),
            }),
          )
          await connectToUserRelays(user)
          await updateFollows(user)
          setUser(user)
          setReadOnly(readOnly)
          return user
        }
      } catch (err: any) {
        showSnackbar(err.message, {
          slotProps: { alert: { severity: 'error' } },
        })
      } finally {
        setSigning(false)
      }
    },
    [ndk, hasNip7Extension, getUser, updateFollows, showSnackbar],
  )

  const signOut = useCallback(async () => {
    ndk.signer = undefined
    localStorage.removeItem('session')
    setUser(undefined)
    setReadOnly(true)
  }, [ndk])

  const initUser = useCallback(async () => {
    try {
      setSigning(true)
      const session = JSON.parse(localStorage.getItem('session') || '{}')
      if (session?.pubkey) {
        await signIn(
          session.type,
          session.type === 'nsec' ? session?.nsec : session?.pubkey,
        )
        return
      }
    } catch (err) {
    } finally {
      setSigning(false)
    }
  }, [signIn])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (user) return
    initUser()
  }, [user, initUser])

  usePromise(async () => {
    if (!user?.hexpubkey) return setMuteList([])

    const event = await ndk.fetchEvent(
      {
        kinds: [NDKKind.MuteList, NDKKind.ChannelMuteUser],
        authors: [user?.hexpubkey],
      },
      { cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY, subId: nanoid(8) },
    )
    const list =
      event?.getMatchingTags('p').map(([tag, pubkey]) => {
        return pubkey
      }) || []
    setMuteList(list)
  }, [user?.hexpubkey])

  usePromise(async () => {
    if (!user?.hexpubkey) return setFollowLists([])

    const events = await ndk.fetchEvents(
      [
        {
          kinds: [30002 as NDKKind],
          authors: [user?.hexpubkey],
          '#d': ['follow'],
        },
        {
          kinds: [NDKKind.CategorizedPeopleList],
          authors: [user?.hexpubkey],
        },
      ],
      { cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY, subId: nanoid(8) },
    )

    let tagList: NDKEvent | undefined
    let peopleList: FollowListItem[] = []
    events?.forEach((ev) => {
      if (ev.kind === 30002) {
        tagList = ev
      } else {
        const value = ev.getMatchingTags('p')
        if (!value.length) return
        const name = ev.tagValue('title')
        if (!name) return
        const id = ev.tagValue('d') || ev.tagId()
        peopleList.push({ type: 'people', id, name, value })
      }
    })
    const tags =
      tagList?.getMatchingTags('t').map<FollowListItem>(([, tag]) => {
        return { type: 'tag', id: tag, name: tag, value: tag }
      }) || []
    console.log({ tags, peopleList })
    setFollowLists((prev) => prev.concat(peopleList, tags))
  }, [user?.hexpubkey])

  const value = useMemo((): AccountProps => {
    return {
      user,
      readOnly,
      muteList,
      follows,
      followLists,
      signing,
      signIn,
      signOut,
      setFollows,
      setMuteList,
      follow,
      unfollow,
    }
  }, [
    user,
    readOnly,
    muteList,
    follows,
    followLists,
    signing,
    signIn,
    signOut,
    follow,
    unfollow,
  ])

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  )
}

const connectToUserRelays = async (user: NDKUser) => {
  const ndk = user.ndk
  if (!ndk) {
    console.debug('NDK not initialized', { npub: user.npub })
    return
  }
  const runUserFunctions = async (user: NDKUser) => {
    const relayList = await user.relayList()

    if (!relayList) {
      console.debug('No relay list found for user', { npub: user.npub })
      return
    }
    console.debug('Connecting to user relays', {
      npub: user.npub,
      relays: relayList.relays,
    })
    await Promise.allSettled(
      relayList.relays.map(async (url) => {
        return new Promise<NDKRelay>((resolve) => {
          const relay = ndk.pool.relays.get(url)
          if (!relay) {
            const relay = new NDKRelay(url)
            relay.once('connect', () => resolve(relay))
            ndk.pool.addRelay(relay)
          } else {
            if (relay.connectivity.status === NDKRelayStatus.CONNECTED) {
              resolve(relay)
            } else if (
              relay.connectivity.status === NDKRelayStatus.CONNECTING
            ) {
              relay.once('connect', () => resolve(relay))
            }
          }
        })
      }),
    )
  }

  if (ndk.pool.connectedRelays().length > 0) {
    await runUserFunctions(user)
  } else {
    console.debug('Waiting for connection to main relays')
    ndk.pool.once('relay:connect', (relay: NDKRelay) => {
      console.debug('New relay came online', relay)
      runUserFunctions(user)
    })
  }
}
