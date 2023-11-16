'use client'
import MainPane from '@/components/MainPane'
import {
  Box,
  Fab,
  Typography,
  Zoom,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import classNames from 'classnames'
import { useSearchParams } from 'next/navigation'
import { Draw } from '@mui/icons-material'
import { Fragment, useCallback, useMemo, useRef } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useAction } from '@/hooks/useApp'
import { EventActionType } from '@/contexts/AppContext'
import EventActionModal from '@/components/EventActionModal'
import ProfileActionModal from '@/components/ProfileActionModal'
import { useSubscribe } from '@/hooks/useSubscribe'
import { EmbedEventAddress } from '@/components/EmbedEventAddress'
import { nip19 } from 'nostr-tools'
import { CommonEventLayout } from '@/components/PageLayout'
import { ViewportList } from 'react-viewport-list'
import TextNote from '@/components/TextNote'
import ShortTextNoteCard from '@/components/ShortTextNoteCard'

export default function Page() {
  const { user } = useAccount()
  const { eventAction, profileAction, setEventAction } = useAction()
  const theme = useTheme()
  const searchParams = useSearchParams()
  const hasMap = searchParams.get('map') === '1'
  const mdUp = useMediaQuery(theme.breakpoints.up('md'))
  const mdDown = useMediaQuery(theme.breakpoints.down('md'))
  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
  )

  const filter = useMemo(() => {
    if (!user?.pubkey) return
    return {
      kinds: [7, 1, 9735, 6],
      '#p': [user.pubkey],
      limit: 20,
    }
  }, [user?.pubkey])

  const [data] = useSubscribe(filter)

  // console.log('data', data)
  return (
    <Box className="relative w-full h-full overflow-visible max-w-[640px]">
      <ViewportList items={data} viewportRef={scrollRef}>
        {(item) => {
          console.log('item', item)
          const naddr = nip19.neventEncode({
            id: item.deduplicationKey(),
            author: item.pubkey,
            kind: item.kind,
          })
          console.log('naddr', { item, naddr })
          return (
            <Box key={naddr}>
              {item.kind === 1 || item.kind === 6 ? (
                <ShortTextNoteCard event={item} relatedNoteVariant="fraction" />
              ) : (
                <>
                  <Typography>Kind: {item.kind}</Typography>
                  <Typography className="flex">
                    Content: <TextNote event={{ content: item.content }} />
                  </Typography>
                  <EmbedEventAddress naddr={naddr} />
                </>
              )}
            </Box>
          )
        }}
      </ViewportList>
    </Box>
  )
}
