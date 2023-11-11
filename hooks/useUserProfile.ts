'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNDK, useRelaySet } from './useNostr'
import {
  NDKSubscriptionCacheUsage,
  NDKUser,
  NDKUserProfile,
} from '@nostr-dev-kit/ndk'
import { nip19 } from 'nostr-tools'
import { useMap } from './useMap'

const verifyCache: Record<string, boolean> = {}
export const useUserProfile = (hexpubkey?: string) => {
  const ndk = useNDK()
  const map = useMap()
  const relaySet = useRelaySet()
  const relayUrls = useMemo(
    () => Array.from(relaySet?.relays.values() || []).map((d) => d.url),
    [relaySet],
  )

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
    pubkey ? ndk.getUser({ hexpubkey: pubkey, relayUrls }) : undefined,
  )

  const fetchProfile = useCallback(
    async (user: NDKUser) => {
      try {
        const profile = await Promise.race<NDKUserProfile | null>([
          user.fetchProfile({
            cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
          }),
          new Promise<null>((_, reject) => {
            setTimeout(() => reject('Timeout'), 3000)
          }),
        ])
        if (pubkey && profile?.image && !map?.hasImage(pubkey)) {
          const dataUrl = await toDataURL(profile?.image)
          if (dataUrl) {
            const img = new Image()
            img.onload = () => map?.addImage(pubkey, img)
            img.crossOrigin = 'anonymous'
            img.src = `data:image/svg+xml;utf8,${encodeURIComponent(
              profilePin.replace('{PROFILE_URL}', dataUrl),
            )}`
          }
        }
        return profile
      } catch (err) {
        return new Promise<NDKUserProfile | null>((resolve) => {
          setTimeout(() => {
            fetchProfile(user).then((d) => resolve(d))
          }, 1000)
        })
      }
    },
    [map, pubkey],
  )

  useEffect(() => {
    if (!pubkey) return
    const user = ndk.getUser({ hexpubkey: pubkey, relayUrls })
    setUser(user)
    fetchProfile(user).then(async (profile) => {
      if (!profile) return

      setUser((prev) => {
        const d = {
          ...user,
          npub: user.npub,
          hexpubkey: user.hexpubkey,
          profile: profile,
        } as NDKUser
        return d
      })
      if (!profile.nip05) return profile
      if (!verifyCache[profile.nip05]) {
        const validNip05 = await user
          .validateNip05(profile.nip05)
          .catch((err) => false)
        verifyCache[profile.nip05] = validNip05 === true
      }
      setUser((prev) => {
        const d = {
          ...user,
          npub: user.npub,
          hexpubkey: user.hexpubkey,
          profile: {
            ...profile,
            validNip05: verifyCache[profile.nip05!] === true ? '1' : '0',
          } as NDKUserProfile,
        } as NDKUser
        return d
      })
      return user.profile
    })
  }, [pubkey, ndk, relayUrls, fetchProfile])

  return user
}

export const profilePin = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"
  "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg
  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  focusable="false"
  aria-hidden="true"
  viewBox="0 0 24 24"
  data-testid="ContactSupportIcon"
  tabindex="-1"
  title="ContactSupport"
>
  <defs>
    <pattern id="image" x="0%" y="0%" height="100%" width="100%"
            viewBox="0 0 24 24">
      <image xlink:href="{PROFILE_URL}" height="24" width="24" preserveAspectRatio="xMinYMin slice" />
    </pattern>
  </defs>
  <path
    fill="#fc6a03"
    d="M12 2c-4.97 0-9 4.03-9 9 0 4.17 2.84 7.67 6.69 8.69L12 22l2.31-2.31C18.16 18.67 21 15.17 21 11c0-4.97-4.03-9-9-9zm0 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.3c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
  />
  <circle xmlns="http://www.w3.org/2000/svg" class="medium" cx="50%" cy="45.75%" r="8.75" fill="url(#image)"/>
</svg>
`

async function toDataURL(src: string) {
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
