import { useNDK } from '@/hooks/useNostr'
import {
  Box,
  Popover,
  TextField,
  TextFieldProps,
  Typography,
} from '@mui/material'
import {
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
import { NostrPrefix, createNostrLink } from '@snort/system'

const NostrTextField = forwardRef<HTMLDivElement, TextFieldProps>(
  function NostrTextField({ onKeyUp, onKeyDown, inputRef, ...props }, ref) {
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
    const handleSelectProfile = useCallback(
      (hexpubkey: string) => {
        const value = ((inputRef || innerInputRef) as any).current?.value
        const leftText = value.substring(0, currentCaretPosition)
        const rightText = value.substring(currentCaretPosition)
        const lastAtSignIndex = leftText.lastIndexOf('@')
        const newValue = `${leftText.substring(
          0,
          lastAtSignIndex,
        )}nostr:${createNostrLink(
          NostrPrefix.Profile,
          hexpubkey,
        ).encode()} ${rightText}`
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
        handleClosePopover()
        return false
      },
      [currentCaretPosition, handleClosePopover, inputRef],
    )
    const profiles = useMemo(() => {
      return Array.from(
        (ndk.cacheAdapter as any).profiles?.lookupTable,
        ([hexpubkey, value]) => ({ ...value.internalValue, hexpubkey }),
      )
    }, [ndk.cacheAdapter])
    const filteredProfiles = useMemo(() => {
      const _searchText = searchText.toLowerCase()
      return profiles
        .filter(({ name, displayName, nip05 }) =>
          `${name || ''}${displayName || ''}${nip05 || ''}`
            .toLowerCase()
            .includes(_searchText),
        )
        .slice(0, 10)
    }, [profiles, searchText])
    const handleKeyUp: KeyboardEventHandler<HTMLDivElement> = useCallback(
      (event) => {
        const target: any = event.target
        const selectionStart = target.selectionStart
        const selectionEnd = target.selectionEnd
        const value: string = target.value
        const previousCharacter = value[selectionEnd - 2]
        if (
          event.key === '@' &&
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
            setCurrentCaretPosition(selectionEnd)
            setSearchText(searchText)
          }
        }
        onKeyUp?.(event)
      },
      [handleClosePopover, mentionPopoverAnchorEl, onKeyUp],
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
          onKeyUp={handleKeyUp}
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
          <Box ref={viewportRef} className="max-w-md max-h-80 overflow-y-auto">
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
