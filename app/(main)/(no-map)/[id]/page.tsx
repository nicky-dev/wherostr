'use client'
import { Typography } from '@mui/material'
import { redirect, useParams } from 'next/navigation'
import { useMemo } from 'react'
import { nip19 } from 'nostr-tools'
import Geohash from 'latlon-geohash'
import { NostrAddressComponent } from '@/components/NostrAddressComponent'
import { NostrNoteComponent } from '@/components/NostsNoteComponent'
import { NostrPubkeyComponent } from '@/components/NostrPubkeyComponent'
import { NostrEventComponent } from '@/components/NostrEventComponent'
import { RedirectType } from 'next/dist/client/components/redirect'
import { CommonEventLayout, LiveEventLayout } from '@/components/PageLayout'

export default function Page() {
  const { id } = useParams()
  const naddr = useMemo(() => (typeof id === 'string' ? id : id?.[0]), [id])

  const naddrDesc = useMemo(() => {
    try {
      if (!naddr) return
      return nip19.decode(naddr as string)
    } catch (err) {}
  }, [naddr])

  if (!naddrDesc && naddr) {
    try {
      const ll = Geohash.decode(naddr)
      console.log('Geohash', ll)
      redirect(`/m?q=${ll.lat},${ll.lon}`, RedirectType.replace)
    } catch (err) {
      console.log('err', err)
    }
  }

  const component = useMemo(() => {
    if (naddrDesc?.type === 'naddr') {
      return <NostrAddressComponent data={naddrDesc.data} />
    } else if (naddrDesc?.type === 'note') {
      return <NostrNoteComponent data={naddrDesc.data} />
    } else if (naddrDesc?.type === 'npub') {
      return <NostrPubkeyComponent data={naddrDesc.data} />
    } else if (naddrDesc?.type === 'nprofile') {
      return <NostrPubkeyComponent data={naddrDesc.data.pubkey} />
    } else if (naddrDesc?.type === 'nevent') {
      return <NostrEventComponent data={naddrDesc.data} />
    } else {
      return <Typography variant="h6">Invalid Nostr Address</Typography>
    }
  }, [naddrDesc])

  return component
}
