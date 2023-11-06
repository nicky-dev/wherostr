import { Typography } from '@mui/material'
import { FC, useMemo } from 'react'
import { nip19 } from 'nostr-tools'
import { QuotedEvent, UserMentionLink } from './TextNote'
import { EmbedLiveActivity } from './EmbedLiveActivity'
import { EmbedLongFormContent } from './EmbedLongFormContent'

export interface EmbedEventAddressProps {
  naddr: string
}
export const EmbedEventAddress: FC<EmbedEventAddressProps> = ({ naddr }) => {
  const naddrDesc = useMemo(() => {
    try {
      if (!naddr) return
      return nip19.decode(naddr as string)
    } catch (err) {}
  }, [naddr])

  const component = useMemo(() => {
    if (naddrDesc?.type === 'note') {
      return <QuotedEvent id={naddrDesc.data} relatedNoteVariant="fraction" />
    } else if (naddrDesc?.type === 'npub') {
      return <UserMentionLink id={naddrDesc.data} />
    } else if (naddrDesc?.type === 'nprofile') {
      return <UserMentionLink id={naddrDesc.data.pubkey} />
    } else if (naddrDesc?.type === 'nevent') {
      return (
        <QuotedEvent id={naddrDesc.data.id} relatedNoteVariant="fraction" />
      )
    } else if (naddrDesc?.type === 'naddr') {
      if (naddrDesc.data.kind === 30311) {
        return <EmbedLiveActivity naddr={naddr} />
      } else if (naddrDesc.data.kind === 30023) {
        return <EmbedLongFormContent naddr={naddr} />
      }
    } else {
      return <Typography variant="h6">Invalid Nostr Address</Typography>
    }
  }, [naddrDesc, naddr])

  return component
}
