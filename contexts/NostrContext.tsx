'use client'
import NDK, {
  NDKEvent,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
  NDKUser,
} from '@nostr-dev-kit/ndk'
import NDKCacheAdapterDexie from '@nostr-dev-kit/ndk-cache-dexie'
import { nip19, nip05 } from 'nostr-tools'
import { appNameForAlby, nip5Regexp, streamRelayUrls } from '@/constants/app'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { FC, PropsWithChildren, useEffect } from 'react'

interface Nostr {
  ndk: NDK
  getUser: (key?: string, relayUrls?: string[]) => Promise<NDKUser | undefined>
  getEvent: (id?: string) => Promise<NDKEvent | null>
}

export const verifyCache: Record<string, boolean> = {}
export const defaultRelays = [
  'wss://nostr.wine',
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
  'wss://nos.lol',
]

const dexieAdapter = new NDKCacheAdapterDexie({
  dbName: 'nostr',
  expirationTime: 3600 * 24 * 1,
  profileCacheSize: 200,
})

export const useNostrStore = create<Nostr>()((set, get) => ({
  ndk: new NDK({
    cacheAdapter: dexieAdapter as any,
    explicitRelayUrls: defaultRelays,
    autoConnectUserRelays: true,
    autoFetchUserMutelist: true,
  }),
  getUser: async (key?: string, relayUrls: string[] = defaultRelays) => {
    if (!key) return
    const { ndk, getUser } = get()
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
  getEvent: async (id?: string) => {
    const { ndk } = get()
    if (!id) return null
    return ndk.fetchEvent(id, {
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
      subId: nanoid(8),
    })
  },
}))

export const useNDK = () => useNostrStore((state) => state.ndk)

export const streamRelays = NDKRelaySet.fromRelayUrls(
  streamRelayUrls,
  useNostrStore.getState().ndk,
)

export const NostrContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const ndk = useNDK()

  useEffect(() => {
    import('@getalby/bitcoin-connect-react').then(({ init }) => {
      init({ appName: appNameForAlby })
    })
  }, [])

  useEffect(() => {
    try {
      indexedDB.deleteDatabase('wherostr-cache')
    } catch {}
    ndk.connect()
    return () => {
      ndk.removeAllListeners()
    }
  }, [])

  return children
}
