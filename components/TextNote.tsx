'use client'
import 'react-photo-view/dist/react-photo-view.css'
import { ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import {
  NostrLink,
  NostrPrefix,
  ParsedFragment,
  tryParseNostrLink,
  transformText,
} from '@snort/system'
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  Link,
  Paper,
  Typography,
} from '@mui/material'
import { Fragment } from 'react'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import ShortTextNoteCard from '@/components/ShortTextNoteCard'
import {
  PlayCircleOutline,
  FormatQuote,
  InfoOutlined,
  ZoomIn,
  ZoomOut,
} from '@mui/icons-material'
import NextLink from 'next/link'
import {
  EventActionType,
  AppContext,
  ProfileActionType,
} from '@/contexts/AppContext'
import { useEventCache } from '@/hooks/useCache'
import { Variant } from '@mui/material/styles/createTypography'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import { useUserProfile } from '@/hooks/useUserProfile'
import ReactPlayer from 'react-player/lazy'
import ProfileChip from './ProfileChip'
import { useEvent } from '@/hooks/useEvent'
import { useStreamRelaySet } from '@/hooks/useNostr'
import StatusBadge from './StatusBadge'
import ReactTimeago from 'react-timeago'
import { EmbedLiveActivity } from './EmbedLiveActivity'
import { EmbedLongFormContent } from './EmbedLongFormContent'
import { EmbedEventAddress } from './EmbedEventAddress'
// import { nip19 } from 'nostr-tools'

type RelatedNoteVariant = 'full' | 'fraction' | 'link'

export const UserMentionLink = ({ id }: { id: string }) => {
  const { setProfileAction } = useContext(AppContext)
  const user = useUserProfile(id)
  const displayName = useMemo(
    () =>
      user?.profile?.displayName ||
      user?.profile?.name ||
      user?.profile?.username ||
      user?.npub?.substring?.(0, 12),
    [user],
  )
  const handleClickProfile = useCallback(() => {
    if (!user?.hexpubkey) return
    setProfileAction({
      type: ProfileActionType.View,
      hexpubkey: user?.hexpubkey,
    })
  }, [setProfileAction, user?.hexpubkey])

  return displayName ? (
    <Link
      className="cursor-pointer"
      component="a"
      underline="hover"
      color="primary"
      onClick={handleClickProfile}
    >
      @{displayName}
    </Link>
  ) : (
    id
  )
}

export const QuotedEvent = ({
  id,
  relatedNoteVariant,
  icon,
}: {
  id: string
  relatedNoteVariant: RelatedNoteVariant
  icon?: ReactNode
}) => {
  const { setEventAction } = useContext(AppContext)
  const [event, error, state] = useEventCache(id)
  const handleClickNote = useCallback(() => {
    if (event) {
      setEventAction({
        type: EventActionType.View,
        event,
        options: {
          // quotes: true,
          comments: true,
        },
      })
    }
  }, [event, setEventAction])

  return relatedNoteVariant === 'link' ? (
    <Typography
      className="cursor-pointer"
      variant="caption"
      color="secondary"
      onClick={handleClickNote}
    >
      <FormatQuote className="mr-1" fontSize="small" />
      quoted note
    </Typography>
  ) : (
    <Box
      className={`relative mt-3 border-2 border-secondary-dark rounded-2xl overflow-hidden cursor-pointer${
        relatedNoteVariant === 'fraction' ? ' max-h-80' : ''
      }`}
      onClick={handleClickNote}
    >
      {state === 'resolved' && event ? (
        <ShortTextNoteCard
          event={event}
          action={false}
          relatedNoteVariant="link"
        />
      ) : (
        <Box p={1} textAlign="center">
          <CircularProgress color="inherit" />
        </Box>
      )}
      {relatedNoteVariant === 'fraction' && (
        <Box className="absolute top-0 left-0 w-full h-full min-h-[320px] bg-gradient-to-t from-[#000000] to-50% hover:bg-secondary-dark hover:bg-opacity-5" />
      )}
      <Box className="absolute right-0 bottom-0 border-t-2 border-l-2 border-secondary-dark p-2 rounded-tl-2xl text-contrast-secondary bg-secondary-dark">
        {icon ? icon : <FormatQuote />}
      </Box>
    </Box>
  )
}

const renderChunk = (
  { type, content, mimeType }: ParsedFragment,
  {
    skipEmbedLink,
    relatedNoteVariant,
  }: { skipEmbedLink?: boolean; relatedNoteVariant: RelatedNoteVariant },
) => {
  switch (type) {
    case 'media':
      if (mimeType?.startsWith('image/')) {
        return (
          <PhotoView src={content}>
            <img
              className="mx-auto rounded-2xl overflow-hidden max-h-[50vh] border-[1px] border-solid border-disabled"
              alt="image"
              src={content}
            />
          </PhotoView>
        )
      } else if (mimeType?.startsWith('audio/')) {
        return (
          <Box className="rounded-2xl overflow-hidden">
            <audio className="w-full" src={content} controls />
          </Box>
        )
      } else if (mimeType?.startsWith('video/')) {
        return (
          <Box className="rounded-2xl overflow-hidden w-full aspect-video border-[1px] border-solid border-disabled">
            <ReactPlayer
              url={content}
              width="100%"
              height="100%"
              controls
              playsinline
              muted
            />
          </Box>
        )
      }
    case 'link':
      if (!skipEmbedLink && ReactPlayer.canPlay(content)) {
        return (
          <Box className="border-none rounded-2xl overflow-hidden w-full aspect-video">
            <ReactPlayer
              url={content}
              width="100%"
              height="100%"
              controls
              playsinline
              muted
            />
          </Box>
        )
      }
      let protocol = ''
      try {
        const url = new URL(content)
        protocol = url.protocol
      } catch (err) {}
      if (
        !skipEmbedLink &&
        (protocol === 'nostr:' || protocol === 'web+nostr:')
      ) {
        const nostrLink = tryParseNostrLink(content)
        if (nostrLink?.type) {
          const naddr = nostrLink?.encode() || ''
          return <EmbedEventAddress naddr={naddr} />
        }
      }
      return (
        <Link
          href={content}
          target="_blank"
          component="a"
          underline="hover"
          color="secondary"
        >
          {content}
        </Link>
      )
    case 'hashtag':
      return (
        <NextLink href={`/?q=t:${content}`}>
          <Link underline="hover" color="secondary" component="span">
            #{content}
          </Link>
        </NextLink>
      )
    case 'custom_emoji':
      return (
        <img
          className="inline-block max-h-[1.5em] max-w-[1.5em]"
          alt="emoji"
          src={content}
        />
      )
    // case 'mention':
    //   return `mention: ${content}`
    // case 'invoice':
    //   return `invoice: ${content}`
    // case 'cashu':
    //   return `cashu: ${content}`
    // case 'text':
    default:
      // console.log('text:content', content)
      // return content
      return content || ''
  }
}

const TextNote = ({
  event,
  relatedNoteVariant = 'fraction',
  textVariant = 'body1',
  skipEmbedLink = false,
}: {
  event: Partial<NDKEvent>
  relatedNoteVariant?: RelatedNoteVariant
  textVariant?: Variant
  skipEmbedLink?: boolean
}) => {
  const [show, setShow] = useState(false)
  const chunks = useMemo(() => {
    try {
      const _ = transformText(' ' + event.content || '', event.tags || [])
      if (_?.[0]?.content) {
        _[0].content = _[0]?.content?.slice?.(1) || ''
      }
      return _
    } catch (err) {
      console.log(err)
    }
    return [{ content: event.content, type: 'text' }] as ParsedFragment[]
  }, [event])

  const nsfw = useMemo(() => event.tagValue?.('content-warning'), [event])

  return (
    <Typography
      className="whitespace-break-spaces break-words"
      variant={textVariant}
      component="div"
    >
      {!nsfw || show ? (
        <PhotoProvider
          toolbarRender={({ onScale, scale }) => {
            return (
              <>
                <IconButton onClick={() => onScale(scale + 1)}>
                  <ZoomIn />
                </IconButton>
                <IconButton onClick={() => onScale(scale - 1)}>
                  <ZoomOut />
                </IconButton>
              </>
            )
          }}
        >
          {chunks.map((chunk, index) => (
            <Fragment key={index}>
              {renderChunk(chunk, {
                relatedNoteVariant,
                skipEmbedLink,
              })}
            </Fragment>
          ))}
        </PhotoProvider>
      ) : (
        <Box className="bg-disabled flex w-full p-3 rounded-2xl shadow gap-2">
          <InfoOutlined className="text-warning" />
          <Box className="flex-1 text-contrast-secondary">
            <Typography>
              The author has marked this note as a{' '}
              <span className="text-warning">sensitive topic</span>
            </Typography>
            <Typography>
              Reason: <span className="text-warning">{nsfw}</span>
            </Typography>
            <Box className="w-full text-right">
              <Button color="secondary" onClick={() => setShow(true)}>
                Show
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Typography>
  )
}

export default TextNote
