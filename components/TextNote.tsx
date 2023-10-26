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
  Visibility,
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
import { nip19 } from 'nostr-tools'

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

export const NostrAddressBox = ({
  nostrLink,
  naddr,
}: {
  nostrLink: NostrLink
  naddr: string
}) => {
  const streamRelaySet = useStreamRelaySet()
  const optRelaySet = useMemo(
    () => (nostrLink.kind === 30311 ? streamRelaySet : undefined),
    [streamRelaySet, nostrLink.kind],
  )
  const [event, error, state] = useEvent(naddr, optRelaySet)
  const pubkey = useMemo(() => event?.tagValue('p') || event?.pubkey, [event])
  const title = useMemo(() => event?.tagValue('title'), [event])
  const image = useMemo(() => event?.tagValue('image'), [event])
  const isLive = useMemo(() => event?.tagValue('status') === 'live', [event])
  const starts = useMemo(
    () => Number(event?.tagValue('starts') || event?.created_at),
    [event],
  )
  const ends = useMemo(
    () => Number(event?.tagValue('ends') || event?.created_at),
    [event],
  )

  if (nostrLink.kind === 30311) {
    return (
      <Box className="bg-gradient-primary w-full p-3 rounded-2xl drop-shadow">
        {state === 'resolved' ? (
          <Box className="flex flex-col gap-3">
            <Box className="flex gap-3 items-start flex-col sm:flex-row">
              {!!image && (
                <Box className="sm:max-w-[40%] rounded-2xl overflow-hidden drop-shadow">
                  <ButtonBase
                    className="aspect-video hover:scale-110 transition-all"
                    centerRipple
                    LinkComponent={NextLink}
                    href={`/a?naddr=${nostrLink.encode()}`}
                    target="_blank"
                  >
                    <img src={image} alt="image" />
                  </ButtonBase>
                </Box>
              )}
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {title}
                </Typography>
                <Typography variant="caption">
                  {isLive && (
                    <StatusBadge className="!mr-2 inline-block" status="live" />
                  )}
                  {!isLive && 'Streamed '}
                  <ReactTimeago
                    date={new Date((isLive ? starts : ends) * 1000)}
                  />
                </Typography>
              </Box>
            </Box>
            <Box className="flex items-end gap-2">
              <ProfileChip className="flex-1" hexpubkey={pubkey} />
              <Button
                className="shrink-0"
                LinkComponent={NextLink}
                target="_blank"
                href={`/a/?naddr=${naddr}`}
                color="primary"
                variant="contained"
                sx={{ fontWeight: 'bold' }}
                endIcon={<Visibility />}
              >
                Watch
              </Button>
            </Box>
          </Box>
        ) : (
          <CircularProgress color="inherit" />
        )}
      </Box>
    )
  }

  return (
    <Link
      href={`https://snort.social/${naddr}`}
      target="_blank"
      component="a"
      underline="hover"
      color="secondary"
    >
      {naddr}
    </Link>
  )
}

const renderChunk = (
  { type, content, mimeType }: ParsedFragment,
  { relatedNoteVariant }: { relatedNoteVariant: RelatedNoteVariant },
) => {
  switch (type) {
    case 'media':
      if (mimeType?.startsWith('image/')) {
        return (
          <PhotoView src={content}>
            <img
              className="mx-auto rounded-2xl overflow-hidden max-h-[50vh]"
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
    case 'link':
      if (ReactPlayer.canPlay(content)) {
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
      if (protocol === 'nostr:' || protocol === 'web+nostr:') {
        const nostrLink = tryParseNostrLink(content)
        // const nostrLink2 = nip19.decode(content)
        // console.log('nostrLink2', nostrLink2)
        const naddr = nostrLink?.encode() || ''
        // if (!naddr) {
        //   return (
        //     <Typography component="span" color="error">
        //       [invalid {nostrLink?.type}]
        //     </Typography>
        //   )
        // }
        switch (nostrLink?.type) {
          case NostrPrefix.PublicKey:
          case NostrPrefix.Profile: {
            return <UserMentionLink id={nostrLink.id} />
          }
          case NostrPrefix.Event:
          case NostrPrefix.Note:
            return (
              <QuotedEvent id={nostrLink.id} relatedNoteVariant="fraction" />
            )
          case NostrPrefix.Address:
            return <NostrAddressBox nostrLink={nostrLink} naddr={naddr} />
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
        <NextLink href={`/?q=${content}`}>
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
}: {
  event: Partial<NDKEvent>
  relatedNoteVariant?: RelatedNoteVariant
  textVariant?: Variant
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
              })}
            </Fragment>
          ))}
        </PhotoProvider>
      ) : (
        <Paper
          elevation={4}
          className="w-full flex items-center justify-center p-3"
          onClick={() => setShow(true)}
        >
          <Box mr={1} mt={1} display="flex" alignSelf="flex-start">
            <InfoOutlined className="text-primary" />
          </Box>
          <Box>
            <Typography display="inline" color="text.secondary">
              The author has marked this note as a
            </Typography>{' '}
            <Typography display="inline" color="primary.main">
              sensitive topic
            </Typography>
            <br />
            <Typography display="inline" color="text.secondary">
              Reason:
            </Typography>{' '}
            <Typography display="inline" color="primary.main">
              {nsfw}
            </Typography>
            <Typography color="secondary.dark">
              Click here to load anyway
            </Typography>
          </Box>
        </Paper>
      )}
    </Typography>
  )
}

export default TextNote
