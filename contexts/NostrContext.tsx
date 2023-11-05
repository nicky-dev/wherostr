'use client'
import {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import NDK, {
  NDKEvent,
  NDKRelay,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
  NDKUser,
} from '@nostr-dev-kit/ndk'
import NDKCacheAdapterDexie from '@nostr-dev-kit/ndk-cache-dexie'
import { nip19, nip05 } from 'nostr-tools'
import { nip5Regexp } from '@/constants/app'

interface Nostr {
  ndk: NDK
  relaySet?: NDKRelaySet
  getUser: (key?: string, relayUrls?: string[]) => Promise<NDKUser | undefined>
  getEvent: (id: string) => Promise<NDKEvent | null>
  // updateRelaySet: (user?: NDKUser) => Promise<void>
}

export const verifyCache: Record<string, boolean> = {}
export const defaultRelays = ['wss://relay.damus.io', 'wss://nos.lol']

const dexieAdapter = new NDKCacheAdapterDexie({ dbName: 'wherostr-cache' })
// const ndk =
//   typeof window !== 'undefined'
//     ? new NDK({
//         cacheAdapter: dexieAdapter as any,
//         explicitRelayUrls: defaultRelays,
//       })
//     : new NDK({ cacheAdapter: dexieAdapter as any })

export const NostrContext = createContext<Nostr>({
  ndk: new NDK({ cacheAdapter: dexieAdapter as any }),
  relaySet: undefined,
  getUser: () => new Promise((resolve) => resolve(undefined)),
  getEvent: () => new Promise((resolve) => resolve(null)),
  // updateRelaySet: async () => {},
})

export const NostrContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [relaySet, setRelaySet] = useState<NDKRelaySet>()
  // const [connected, setConnected] = useState(false)

  const ndk = useMemo(
    () =>
      new NDK({
        cacheAdapter: dexieAdapter as any,
        explicitRelayUrls: defaultRelays,
      }),
    [],
  )
  useEffect(() => {
    ndk.connect()
    const onConnect = (...args: any[]) => {
      console.log('onConnect:args', args)
    }
    const onDisconnect = (...args: any[]) => {
      console.log('onDisconnect:args', args)
    }
    ndk.on('connect', onConnect)
    ndk.on('disconnect', onDisconnect)
    return () => {
      ndk.removeAllListeners()
    }
  }, [ndk])

  const getUser = useCallback(
    async (key?: string, relayUrls: string[] = defaultRelays) => {
      if (!key) return
      let user: NDKUser
      if (!relayUrls) {
        const relays = Array.from(relaySet?.relays.values() || [])
        relayUrls = relays.map((d) => d.url)
      }
      if (nip5Regexp.test(key)) {
        const profile = await nip05.queryProfile(key)
        if (!profile?.pubkey) return
        user = ndk.getUser({ hexpubkey: profile?.pubkey, relayUrls })
      } else if (key.startsWith('npub')) {
        try {
          const hex = nip19.decode(key)
          if (hex.type !== 'npub') return
          user = ndk.getUser({ hexpubkey: hex.data, relayUrls })
        } catch (err) {
          return
        }
      } else {
        user = ndk.getUser({ hexpubkey: key, relayUrls })
      }
      try {
        const profile = await user.fetchProfile({
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        })
        if (profile) {
          if (
            profile.nip05 &&
            typeof verifyCache[profile.nip05] === 'undefined'
          ) {
            const validNip05 = await user
              .validateNip05(profile.nip05)
              .catch(() => false)
            verifyCache[profile.nip05] = validNip05 === true
          }
          user.profile = {
            ...profile,
            ...(profile.nip05
              ? { validNip05: verifyCache[profile.nip05!] === true ? '1' : '0' }
              : {}),
          }
        }
      } catch (error) {
        console.log('getUser:error', error)
        return getUser(key, relayUrls)
      }
      return user
    },
    [ndk, relaySet],
  )

  const getEvent = useCallback(
    async (id: string) => {
      return ndk.fetchEvent(
        id,
        { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST },
        relaySet,
      )
    },
    [ndk, relaySet],
  )

  const value = useMemo((): Nostr => {
    return {
      ndk,
      relaySet,
      getUser,
      getEvent,
    }
  }, [ndk, relaySet, getUser, getEvent])
  return <NostrContext.Provider value={value}>{children}</NostrContext.Provider>
}
