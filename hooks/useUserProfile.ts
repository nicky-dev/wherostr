'use client'
import { useEffect, useMemo, useState } from 'react'
import NDK, {
  NDKSubscriptionCacheUsage,
  NDKUser,
  NDKUserProfile,
} from '@nostr-dev-kit/ndk'
import { nip19 } from 'nostr-tools'
import { nanoid } from 'nanoid'
import { useNDK } from '@/contexts/NostrContext'
import usePromise from 'react-use-promise'

export const useProfilesCache = () => {
  const ndk = useNDK()
  return usePromise(async () => {
    return ndk.cacheAdapter
      ?.getProfiles?.(() => true)
      .then((val) => {
        if (!val) return []
        const keys = Array.from(val.keys())
        return Array.from<NDKUserProfile>(val.values()).map((v, i) => {
          return {
            ...v,
            pubkey: keys[i],
          }
        })
      })
  }, [])
}

export const useUserProfile = (hexpubkey?: string) => {
  const ndk = useNDK()
  const pubkey = useMemo(() => {
    if (!hexpubkey) return
    try {
      if (hexpubkey.startsWith('npub')) {
        const hex = nip19.decode(hexpubkey)
        return hex.type === 'npub' ? hex.data : undefined
      }
      return hexpubkey
    } catch (err) {}
  }, [hexpubkey])

  const [user, setUser] = useState<NDKUser | undefined>(
    pubkey ? ndk.getUser({ pubkey }) : undefined,
  )

  useEffect(() => {
    if (!pubkey) return
    const user = ndk.getUser({ pubkey })
    setUser(user)
    fetchProfile(pubkey, ndk).then(async (profile) => {
      if (!profile) return

      setUser((prev) => {
        const d = {
          ...user,
          npub: user.npub,
          pubkey: user.pubkey,
          profile: profile,
        } as NDKUser
        return d
      })
      if (!profile.nip05) return profile
      const validNip05 = await user
        .validateNip05(profile.nip05)
        .catch((err) => false)
      setUser((prev) => {
        const d = {
          ...user,
          npub: user.npub,
          pubkey: user.pubkey,
          profile: {
            ...profile,
            validNip05: validNip05 === true ? '1' : '0',
          } as NDKUserProfile,
        } as NDKUser
        return d
      })
      return user.profile
    })
  }, [pubkey, ndk])

  return user
}

export const useUserDisplayName = (user?: NDKUser) => {
  return useMemo(
    () =>
      user?.profile?.displayName ||
      user?.profile?.name ||
      user?.profile?.username ||
      user?.npub.substring(0, 12),
    [user],
  )
}
export const profilePin = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"
  "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg
  width="56"
  height="56"
  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  viewBox="0 0 24 24"
>
  <defs>
    <mask id="pinmask">
      <rect x="0" y="0" width="24" height="24" fill="black"></rect>
      <circle cx="50%" cy="46%" r="8.5" fill="white"></circle>
    </mask>  
  </defs>
  <path
    fill="#fc6a03"
    d="M12 2c-4.97 0-9 4.03-9 9 0 4.17 2.84 7.67 6.69 8.69L12 22l2.31-2.31C18.16 18.67 21 15.17 21 11c0-4.97-4.03-9-9-9zm0 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.3c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
  />
  <image xlink:href="{URL}" height="17" width="17" x="3.5" y="2.5" preserveAspectRatio="xMidYMid slice" mask="url(#pinmask)" />
</svg>
`

// <pattern id="{ID}" x="0%" y="0%" height="100%" width="100%"
// viewBox="0 0 24 24">
// <image xlink:href="{URL}" height="24" width="24" preserveAspectRatio="xMaxYMid slice" />
// </pattern>

// <circle xmlns="http://www.w3.org/2000/svg" class="medium" cx="50%" cy="46%" r="8.572" fill="url(#{ID})"/>
export async function toDataURL(src: string) {
  return new Promise<string>((resolve) => {
    var img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = function () {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve('')
      canvas.height = img.naturalHeight
      canvas.width = img.naturalWidth
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL())
    }
    img.src = src
    if (img.complete || img.complete === undefined) {
      img.src =
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
      img.src = src
    }
  })
}

const MAX_ATTEMPS_RETRY = 3
export const fetchProfile = async (
  pubkey: string,
  ndk: NDK,
  attemps: number = 0,
) => {
  try {
    if (attemps >= MAX_ATTEMPS_RETRY) return null
    const user = ndk.getUser({ pubkey })
    const profile = await Promise.race<NDKUserProfile | null>([
      user.fetchProfile({
        cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
        subId: nanoid(8),
      }),
      new Promise<null>((_, reject) => {
        setTimeout(() => reject('Timeout'), 5000)
      }),
    ])
    return profile
  } catch (err) {
    attemps += 1
    return new Promise<NDKUserProfile | null>((resolve) => {
      setTimeout(() => {
        fetchProfile(pubkey, ndk, attemps).then((d) => resolve(d))
      }, 1000)
    })
  }
}
