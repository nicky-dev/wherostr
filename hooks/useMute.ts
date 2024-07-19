import { useAccountStore } from '@/contexts/AccountContext'
import { useNDK } from '@/contexts/NostrContext'
import { NDKEvent, NDKKind, NDKUser } from '@nostr-dev-kit/ndk'
import { create } from 'zustand'

interface MutingStore {
  mute: (muteUser: NDKUser) => Promise<void>
}
export const useMuting = create<MutingStore>()(() => ({
  mute: async (muteUser: NDKUser) => {
    const ndk = useNDK()
    const muteList = useAccountStore((state) => state.muteList)
    const setMuteList = useAccountStore((state) => state.setMuteList)
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
}))
