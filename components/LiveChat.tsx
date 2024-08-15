import { Close, Send } from '@mui/icons-material'
import {
  Box,
  BoxProps,
  Button,
  Divider,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { LiveActivityItem } from './LiveActivity'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import LiveChatBox from './LiveChatBox'
import NostrTextField from './NostrTextField'
import ProfileAvatar from './ProfileAvatar'
import { useNostrStore } from '@/contexts/NostrContext'
import { useAccountStore } from '@/contexts/AccountContext'
import { nip19 } from 'nostr-tools'

export function LiveChat({
  naddr,
  event,
  ...props
}: Omit<BoxProps, 'children'> & {
  naddr?: string
  event?: LiveActivityItem
}) {
  const ndk = useNostrStore((state) => state.ndk)
  const user = useAccountStore((state) => state.user)
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState<boolean>(false)
  const [replyEvent, setReplyEvent] = useState<NDKEvent>()

  return (
    <Box {...props} className="h-full min-h-[256px] flex-1 flex flex-col">
      {/* <iframe
        style={{ backgroundColor: 'transparent' }}
        src={`https://zap.stream/chat/${naddr}`}
        width="100%"
        height="100%"
        allowTransparency={true}
      /> */}
      <LiveChatBox naddr={naddr} onReply={(event) => setReplyEvent(event)} />
      {!!replyEvent ? (
        <Paper square elevation={0} className="flex p-2">
          <Box className="flex-auto flex gap-2 items-start opacity-60 overflow-hidden">
            <ProfileAvatar hexpubkey={replyEvent.pubkey} avatarSize={32} />
            <Typography
              variant="body2"
              className="flex-grow"
              textOverflow="ellipsis"
            >
              {replyEvent.content}
            </Typography>
          </Box>
          <IconButton
            className="!min-w-[32px] !max-w-[32px] !min-h-[32px] !max-h-[32px]"
            size="small"
            onClick={() => setReplyEvent(undefined)}
          >
            <Close />
          </IconButton>
        </Paper>
      ) : undefined}
      <Divider />
      <Box
        className="flex items-center"
        m={1}
        component="form"
        onSubmit={async (evt) => {
          evt.preventDefault()
          if (!message || !user?.pubkey) return
          const newEvent = new NDKEvent(ndk)
          newEvent.kind = 1311
          newEvent.content = message
          newEvent.pubkey = user?.pubkey
          newEvent.tags = [
            ['a', `30311:${event?.author}:${event?.id}`, '', 'root'],
          ]
          if (event!.id && replyEvent?.id) {
            let nevent = nip19.neventEncode({
              id: replyEvent?.id,
              author: replyEvent?.pubkey,
              kind: replyEvent.kind,
            })
            newEvent.content = `nostr:${nevent}\n${newEvent.content}`
            newEvent.tags.push(['e', replyEvent?.id, '', 'reply'])
            newEvent.tags.push(['p', replyEvent?.pubkey])
          }
          setBusy(true)
          setReplyEvent(undefined)
          setMessage('')
          await newEvent.publish()
          setBusy(false)
        }}
      >
        {user ? (
          <>
            <NostrTextField
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
