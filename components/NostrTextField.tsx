import { useNDK } from '@/hooks/useNostr'
import {
  Box,
  Popover,
  TextField,
  TextFieldProps,
  Typography,
} from '@mui/material'
import {
  ChangeEventHandler,
  KeyboardEventHandler,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import getCaretCoordinates from 'textarea-caret'
import ProfileChip from './ProfileChip'
import classNames from 'classnames'
import { ViewportList, ViewportListRef } from 'react-viewport-list'
import { NostrPrefix, createNostrLink, tryParseNostrLink } from '@snort/system'
import { useProfilesCache } from '@/hooks/useUserProfile'
import Fuse from 'fuse.js'

const NostrTextField = forwardRef<HTMLDivElement, TextFieldProps>(
  function NostrTextField({ onChange, onKeyDown, inputRef, ...props }, ref) {
    const innerInputRef = useRef(null)
    const viewportListRef = useRef<ViewportListRef>(null)
    const viewportRef = useRef(null)
    const ndk = useNDK()
    const [mentionPopoverAnchorEl, setMentionPopoverAnchorEl] =
      useState<HTMLElement | null>(null)
    const [mentionPopoverAnchorPosition, setMentionPopoverAnchorPosition] =
      useState({
        vertical: 0,
        horizontal: 0,
      })
    const [focusIndex, setFocusIndex] = useState(0)
    const [currentCaretPosition, setCurrentCaretPosition] = useState(0)
    const [searchText, setSearchText] = useState('')
    const handleClosePopover = useCallback(() => {
      setFocusIndex(0)
      setCurrentCaretPosition(0)
      setSearchText('')
      setMentionPopoverAnchorEl(null)
    }, [])
    const replaceMentionValue = useCallback(
      (nostrLink: string, caretPosition: number) => {
        const value = ((inputRef || innerInputRef) as any).current?.value
        const leftText = value.substring(0, caretPosition)
        const rightText = value.substring(caretPosition)
        const lastAtSignIndex = leftText.lastIndexOf('@')
        const newValue = `${leftText.substring(
          0,
          lastAtSignIndex,
        )}${nostrLink} ${rightText}`
        const input = ((inputRef || innerInputRef) as any).current
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          input.tagName === 'TEXTAREA'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype,
          'value',
        )?.set
        nativeInputValueSetter?.call(input, newValue)
        const event = new Event('input', { bubbles: true })
        input.dispatchEvent(event)
      },
      [inputRef],
    )
    const handleSelectProfile = useCallback(
      (hexpubkey: string) => {
        replaceMentionValue(
          `nostr:${createNostrLink(NostrPrefix.Profile, hexpubkey).encode()}`,
          currentCaretPosition,
        )
        handleClosePopover()
        return false
      },
      [currentCaretPosition, handleClosePopover, replaceMentionValue],
    )
    const profiles = useProfilesCache()
    const fuse = useMemo(
      () => new Fuse(profiles, { keys: ['name', 'displayName', 'nip05'] }),
      [profiles],
    )

    const filteredProfiles = useMemo(() => {
      return searchText
        ? fuse
            .search(searchText)
            .slice(0, 10)
            .map((item) => item.item)
        : profiles.slice(0, 10)
    }, [fuse, searchText, profiles])

    const handleChange: ChangeEventHandler<
      HTMLInputElement | HTMLTextAreaElement
    > = useCallback(
      (event) => {
        const nativeEvent = event.nativeEvent as InputEvent
        const target: any = event.target
        const selectionStart = target.selectionStart
        const selectionEnd = target.selectionEnd
        const value: string = target.value
        const previousCharacter = value[selectionEnd - 2]
        if (
          nativeEvent?.data === '@' &&
          selectionStart === selectionEnd &&
          (previousCharacter === undefined ||
            /\s|\r|\n/.exec(previousCharacter))
        ) {
          const position = getCaretCoordinates(target, selectionEnd)
          setMentionPopoverAnchorPosition({
            vertical:
              position.top +
              position.height +
              24 -
              (event.target as any).scrollTop,
            horizontal: position.left,
          })
          setMentionPopoverAnchorEl(event.currentTarget)
        } else if (mentionPopoverAnchorEl) {
          const leftText = value.substring(0, selectionEnd)
          const lastAtSignIndex = leftText.lastIndexOf('@')
          const searchText = leftText.substring(lastAtSignIndex + 1)
          if (/\s|\r|\n/.test(searchText) || selectionEnd === 0) {
            handleClosePopover()
          } else {
            const nostrLink = tryParseNostrLink(searchText)
            if (nostrLink?.type) {
              replaceMentionValue(`nostr:${nostrLink.encode()}`, selectionEnd)
              handleClosePopover()
            } else {
              setCurrentCaretPosition(selectionEnd)
              setSearchText(searchText)
            }
          }
        }
        onChange?.(event)
      },
      [
        handleClosePopover,
        mentionPopoverAnchorEl,
        onChange,
        replaceMentionValue,
      ],
    )
    const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
      (event) => {
        if (
          !mentionPopoverAnchorEl ||
          (event.key !== 'ArrowUp' &&
            event.key !== 'ArrowDown' &&
            event.key !== 'Enter')
        ) {
          onKeyDown?.(event)
          return
        }
        event.preventDefault()
        if (event.key === 'Enter') {
          handleSelectProfile(filteredProfiles[focusIndex].hexpubkey)
        } else if (event.key === 'ArrowUp' && focusIndex > 0) {
          const newIndex = focusIndex - 1
          setFocusIndex(newIndex)
          viewportListRef.current?.scrollToIndex({
            index: newIndex,
            alignToTop: false,
          })
        } else if (
          event.key === 'ArrowDown' &&
          focusIndex < filteredProfiles.length - 1
        ) {
          const newIndex = focusIndex + 1
          setFocusIndex(newIndex)
          viewportListRef.current?.scrollToIndex({
            index: newIndex,
            alignToTop: false,
          })
        }
      },
      [
        filteredProfiles,
        focusIndex,
        handleSelectProfile,
        mentionPopoverAnchorEl,
        onKeyDown,
      ],
    )
    const renderProfileItem = useCallback(
      ({ hexpubkey }: any, index: number) => (
        <Box
          key={index}
          className={classNames({
            'bg-secondary/25': index === focusIndex,
          })}
        >
          <ProfileChip
            className="p-2"
            hexpubkey={hexpubkey}
            onClick={handleSelectProfile}
          />
        </Box>
      ),
      [focusIndex, handleSelectProfile],
    )
    return (
      <>
        <TextField
          {...props}
          ref={ref}
          inputRef={inputRef || innerInputRef}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <Popover
          open={Boolean(mentionPopoverAnchorEl)}
          anchorEl={mentionPopoverAnchorEl}
          anchorOrigin={mentionPopoverAnchorPosition}
          onClose={handleClosePopover}
          disableAutoFocus
          disableEnforceFocus
        >
          <Box
            ref={viewportRef}
            className="min-w-[200px] max-w-md max-h-80 overflow-y-auto"
          >
            {filteredProfiles.length ? (
              <ViewportList
                ref={viewportListRef}
                viewportRef={viewportRef}
                items={filteredProfiles}
              >
                {renderProfileItem}
              </ViewportList>
            ) : (
              <Box className="px-4 py-2">
                <Typography variant="caption">No users found</Typography>
              </Box>
            )}
          </Box>
        </Popover>
      </>
    )
  },
)

export default NostrTextField
