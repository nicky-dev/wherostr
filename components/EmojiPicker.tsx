import { FC, useEffect, useState } from 'react'
import { Popover, PopoverProps } from '@mui/material'
import { useEmoji } from '@/hooks/useAccount'
import { NDKUser } from '@nostr-dev-kit/ndk'
import Picker, { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react'
import { CustomEmoji } from 'emoji-picker-react/dist/config/customEmojiConfig'

export interface EmojiPickerProps extends PopoverProps {
  user?: NDKUser
  onEmojiClick?: (data: EmojiClickData, event: MouseEvent) => void
}

export const EmojiPicker: FC<EmojiPickerProps> = ({
  user,
  onEmojiClick,
  ...props
}) => {
  const [emojiList] = useEmoji(user)
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([])
  useEffect(() => {
    const emojis: CustomEmoji[] = []
    emojiList?.forEach((d) => {
      const name = d?.tagValue('d') || ''
      const tagEmojis = d?.getMatchingTags('emoji')
      tagEmojis?.forEach(([, id, url]) => {
        emojis.push({
          id,
          names: [id, name],
          imgUrl: url,
        })
      })
    })
    setCustomEmojis(emojis)
  }, [emojiList])

  return (
    <Popover {...props}>
      <Picker
        theme={Theme.DARK}
        emojiStyle={EmojiStyle.NATIVE}
        customEmojis={customEmojis}
        onEmojiClick={onEmojiClick}
      />
    </Popover>
  )
}
