import { LinearProgress } from '@mui/material'
import { FC, useMemo } from 'react'
import { NDKFilter } from '@nostr-dev-kit/ndk'
import { nip19 } from 'nostr-tools'
import { useSubscribe } from '@/hooks/useSubscribe'
import { ShortTextNotePane } from './EventActionModal'

export interface NostrEventComponentProps {
  data: nip19.EventPointer
}
export const NostrEventComponent: FC<NostrEventComponentProps> = ({ data }) => {
  const naddr = useMemo(() => nip19.neventEncode(data), [data])
  const filter = useMemo<NDKFilter>(() => {
    return { ids: [data.id] }
  }, [data])
  const [events] = useSubscribe(filter, true)
  const event = useMemo(() => events?.[0], [events])

  if (!event) {
    return <LinearProgress />
  }

  return <ShortTextNotePane event={event} comments />
  // return (
  //   <Box mx={2} overflow="hidden">
  //     <Typography component="pre" variant="caption">
  //       {JSON.stringify(event || {}, null, 4)}
  //     </Typography>
  //   </Box>
  // )
}
