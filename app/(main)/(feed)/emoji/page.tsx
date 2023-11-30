'use client'
import { EmojiPicker } from '@/components/EmojiPicker'
import { useUser } from '@/hooks/useAccount'
import { ThumbUp } from '@mui/icons-material'
import { Box, IconButton } from '@mui/material'
import { useState } from 'react'
import { useLongPress } from 'use-long-press'

export default function Page() {
  const user = useUser()
  const [anchorEl, setAchorEl] = useState<Element>()
  const handleClose = () => setAchorEl(undefined)
  const bind = useLongPress((evt) => {
    setAchorEl(evt.nativeEvent.target as Element)
  })
  return (
    <Box>
      <IconButton {...bind()}>
        <ThumbUp className="text-contrast-secondary" />
      </IconButton>
      <EmojiPicker
        open={!!anchorEl}
        user={user}
        anchorEl={anchorEl}
        onClose={handleClose}
        onEmojiClick={(data) => {
          handleClose()
          console.log('onEmojiClick:data', data)
        }}
      />
    </Box>
  )
}
