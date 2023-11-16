'use client'
import {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import NDK, {
  NDKEvent,
  NDKSubscriptionCacheUsage,
  NDKUser,
} from '@nostr-dev-kit/ndk'
import NDKCacheAdapterDexie from '@nostr-dev-kit/ndk-cache-dexie'
import { nip19, nip05 } from 'nostr-tools'
import { nip5Regexp } from '@/constants/app'
import { nanoid } from 'nanoid'

interface Nostr {
  ndk: NDK
  getUser: (key?: string, relayUrls?: string[]) => Promise<NDKUser | undefined>
  getEvent: (id: string) => Promise<NDKEvent | null>
}

export const verifyCache: Record<string, boolean> = {}
export const defaultRelays = [
  'wss://nostr.wine',
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
  'wss://nos.lol',
]

const dexieAdapter = new NDKCacheAdapterDexie({
  dbName: 'wherostr-cache',
  expirationTime: 3600 * 24 * 7,
  profileCacheSize: 200,
})

export const NostrContext = createContext<Nostr>({
  ndk: new NDK({ cacheAdapter: dexieAdapter as any }),
  getUser: () => new Promise((resolve) => resolve(undefined)),
  getEvent: () => new Promise((resolve) => resolve(null)),
})

export const NostrContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const ndk = useMemo(
    () =>
      new NDK({
        cacheAdapter: dexieAdapter as any,
        explicitRelayUrls: defaultRelays,
        autoConnectUserRelays: false,
        autoFetchUserMutelist: false,
      }),
    [],
  )
  useEffect(() => {
    const onConnect = (...args: any[]) => {
      console.debug('onConnect:args', args)
    }
    const onDisconnect = (...args: any[]) => {
      console.debug('onDisconnect:args', args)
    }
    ndk.pool.on('connect', onConnect)
    ndk.pool.on('disconnect', onDisconnect)
    // ndk.pool.on('relay:connect', onConnect)
    ndk.connect()
    return () => {
      ndk.removeAllListeners()
    }
  }, [ndk])

  const getUser = useCallback(
    async (key?: string, relayUrls: string[] = defaultRelays) => {
      if (!key) return
      let user: NDKUser
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
    [ndk],
  )

  const getEvent = useCallback(
    async (id: string) => {
      return ndk.fetchEvent(id, {
        cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
        subId: nanoid(8),
      })
    },
    [ndk],
  )

  const value = useMemo((): Nostr => {
    return {
      ndk,
      getUser,
      getEvent,
    }
  }, [ndk, getUser, getEvent])
  return <NostrContext.Provider value={value}>{children}</NostrContext.Provider>
}
