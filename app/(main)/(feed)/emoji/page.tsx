'use client'
import { EmojiPicker } from '@/components/EmojiPicker'
import { useUser } from '@/hooks/useAccount'
import { ThumbUp } from '@mui/icons-material'
import { Box, IconButton } from '@mui/material'
import { useState } from 'react'
import { LongPressEventType, useLongPress } from 'use-long-press'

export default function Page() {
  const user = useUser()
  const [anchorEl, setAchorEl] = useState<Element>()
  const handleClose = () => setAchorEl(undefined)
  const bind = useLongPress(
    (evt) => {
      setAchorEl(evt.nativeEvent.target as Element)
    },
    { detect: LongPressEventType.Touch },
  )
  return (
    <Box>
      <IconButton
        {...bind()}
        onMouseEnter={(evt) => setAchorEl(evt.nativeEvent.target as Element)}
        // onMouseLeave={() => setAchorEl(undefined)}
      >
        <ThumbUp className="text-contrast-secondary" />
        <EmojiPicker
          open={!!anchorEl}
          user={user}
          anchorEl={anchorEl}
          onClose={handleClose}
          onEmojiClick={(data) => {
            handleClose()
            console.log('onEmojiClick:data', data)
          }}
          transformOrigin={{
            horizontal: 'center',
            vertical: 'bottom',
          }}
        />
      </IconButton>
    </Box>
  )
}
