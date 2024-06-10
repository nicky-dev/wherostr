import { Send } from '@mui/icons-material'
import {
  Box,
  BoxProps,
  Button,
  Divider,
  TextField,
  Typography,
} from '@mui/material'
import { useContext, useEffect, useRef, useState } from 'react'
import { LiveActivityItem } from './LiveActivity'
import { AccountContext } from '@/contexts/AccountContext'
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { NostrContext } from '@/contexts/NostrContext'
import LiveChatBox from './LiveChatBox'

export function LiveChat({
  naddr,
  event,
  ...props
}: Omit<BoxProps, 'children'> & {
  naddr?: string
  event?: LiveActivityItem
}) {
  const { ndk } = useContext(NostrContext)
  const { user } = useContext(AccountContext)
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState<boolean>(false)

  return (
    <Box {...props} className="h-full min-h-[256px] flex-1 flex flex-col">
      {/* <iframe
        style={{ backgroundColor: 'transparent' }}
        src={`https://zap.stream/chat/${naddr}`}
        width="100%"
        height="100%"
        allowTransparency={true}
      /> */}
      <LiveChatBox naddr={naddr} />
      <Divider />
      <Box
        className="flex items-center"
        m={1}
        component="form"
        onSubmit={async (evt) => {
          evt.preventDefault()
          if (!message || !user?.hexpubkey) return
          const newEvent = new NDKEvent(ndk)
          newEvent.kind = 1311
          newEvent.content = message
          newEvent.pubkey = user?.hexpubkey
          newEvent.tags = [['a', `30311:${event?.author}:${event?.id}`]]
          setMessage('')
          setBusy(true)
          await newEvent.publish()
          setBusy(false)
        }}
      >
        {user ? (
          <>
            <TextField
              value={message}
              color="secondary"
              name="message"
              type="text"
              autoComplete="off"
              placeholder="Message"
              fullWidth
              size="small"
              onChange={(evt) => setMessage(evt.target.value)}
            />
            <Box mx={0.5} />
            <Button
              disabled={busy}
              variant="outlined"
              color="secondary"
              size="large"
              type="submit"
              startIcon={<Send />}
            >
              Send
            </Button>
          </>
        ) : (
          <TextField
            placeholder="Please login to write messages!"
            fullWidth
            disabled
            size="small"
          />
        )}
      </Box>
    </Box>
  )
}
