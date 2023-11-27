import { LinearProgress, Typography } from '@mui/material'
import { FC, useMemo } from 'react'
import LiveActivity from './LiveActivity'
import { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { nip19 } from 'nostr-tools'
import { useStreamRelaySet } from '@/hooks/useNostr'
import { useSubscribe } from '@/hooks/useSubscribe'
import { DAY, unixNow } from '@/utils/time'
import { EmbedLongFormContent } from './EmbedLongFormContent'

export interface NostrAddressComponentProps {
  data: nip19.AddressPointer
}
export const NostrAddressComponent: FC<NostrAddressComponentProps> = ({
  data,
}) => {
  const naddr = useMemo(() => nip19.naddrEncode(data), [data])
  const filter = useMemo<NDKFilter>(() => {
    return {
      kinds: [data.kind],
      authors: [data.pubkey],
      '#d': [data.identifier],
      until: unixNow() + DAY,
    }
  }, [data])
  const relaySet = useStreamRelaySet()
  const [events] = useSubscribe(filter, true, relaySet)
  const event = useMemo(() => {
    return events?.[0]
  }, [events])

  if (!event) {
    return <LinearProgress />
  }

  if (event?.kind === 30311) {
    return <LiveActivity naddr={naddr} event={event} />
  }
  if (event?.kind === NDKKind.Article) {
    return <EmbedLongFormContent naddr={naddr} />
  }

  return (
    <Typography component="pre" variant="caption">
      {JSON.stringify(event.rawEvent() || {}, null, 4)}
    </Typography>
  )
}
