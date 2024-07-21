import { useAccountStore } from '@/contexts/AccountContext'
import { useNostrStore } from '@/contexts/NostrContext'
import { NDKEvent, NDKKind, NDKUser } from '@nostr-dev-kit/ndk'
import { create } from 'zustand'

interface MutingStore {
  mute: (muteUser: NDKUser) => Promise<void>
}
export const useMuting = create<MutingStore>()(() => ({
  mute: async (muteUser: NDKUser) => {
    const muteList = useAccountStore.getState().muteList
    const setMuteList = useAccountStore.getState().setMuteList
    const ndk = useNostrStore.getState().ndk
    const event = new NDKEvent(ndk)
    event.kind = NDKKind.MuteList
    ndk.mutedIds.forEach((value, key) => {
      event.tag(ndk.getUser({ pubkey: key }))
    })
    event.tag(muteUser)
    await event.publish()
    setMuteList([...muteList, muteUser.pubkey])
    ndk.mutedIds.set(muteUser.pubkey, 'p')
  },
}))
