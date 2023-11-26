import { EventActionType } from '@/contexts/AppContext'
import { useAction } from '@/hooks/useApp'
import { useMap } from '@/hooks/useMap'
import { useNDK } from '@/hooks/useNostr'
import { NDKEvent, NDKRelayStatus } from '@nostr-dev-kit/ndk'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  PostingOptions,
  PostingOptionsProps,
  PostingOptionsValues,
} from './PostingOptions'
import Geohash from 'latlon-geohash'
import { shortenUrl } from '@/utils/shortenUrl'
import {
  EventBuilder,
  EventKind,
  NostrPrefix,
  NostrEvent,
  createNostrLink,
} from '@snort/system'
import {
  Close,
  Comment,
  Draw,
  FormatQuote,
  Link,
  LinkOff,
  Map,
  Memory,
  MyLocation,
  Place,
  Repeat,
} from '@mui/icons-material'
import { FileRejection, useDropzone } from 'react-dropzone'
import { accept, upload } from '@/utils/upload'
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import ShortTextNoteCard from './ShortTextNoteCard'
import TextNote from './TextNote'
import { LoadingButton } from '@mui/lab'
import { reverse } from '@/services/osm'
import usePromise from 'react-use-promise'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/useAccount'
import powWorker from '@/utils/powWorker'
import NostrTextField from './NostrTextField'

export const CreateEventForm = ({
  type,
  relatedEvents = [],
}: {
  type: EventActionType
  relatedEvents?: NDKEvent[]
}) => {
  const ndk = useNDK()
  const map = useMap()
  const user = useUser()
  const theme = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const query = useSearchParams()
  const { showSnackbar, backToPreviosModalAction } = useAction()
  const [busy, setBusy] = useState(false)
  const [appendMapLink, setAppendMapLink] = useState(false)
  const [locating, setLocating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const nostrLink = useMemo(() => {
    if (type !== EventActionType.Quote) return ''
    if (!relatedEvents[0]?.id) return ''
    let link
    if (relatedEvents?.[0].kind === 30311) {
      const dTag = relatedEvents?.[0].tagValue('d')
      if (dTag) {
        link = createNostrLink(
          NostrPrefix.Address,
          dTag,
          relatedEvents?.[0]?.relay ? [relatedEvents[0].relay.url] : undefined,
          relatedEvents?.[0].kind,
          relatedEvents?.[0].pubkey,
        ).encode()
      }
    } else {
      link = createNostrLink(
        NostrPrefix.Event,
        relatedEvents?.[0].id,
        relatedEvents?.[0]?.relay ? [relatedEvents[0].relay.url] : undefined,
        relatedEvents?.[0].kind,
        relatedEvents?.[0].pubkey,
      ).encode()
    }
    return link ? `nostr:${link}` : ''
  }, [type, relatedEvents])

  const { register, handleSubmit, setValue, watch } = useForm({
    values: undefined,
  })
  const [positingOptions, setPostingOptions] = useState<PostingOptionsValues>()

  const geohashValue = watch('geohash', '')
  const contentValue = watch('content', nostrLink)
  const mdDown = useMediaQuery(theme.breakpoints.down('md'))
  const mdDownRef = useRef<boolean>(mdDown)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const enableLocation = useRef<boolean | undefined>(positingOptions?.location)
  enableLocation.current = positingOptions?.location
  mdDownRef.current = mdDown

  const q = query.get('q')

  const handleShowMap = (show: boolean) => {
    let querystring = []
    querystring.push('q=' + (q || ''))
    if (show) {
      querystring.push('map=1')
    }
    router.replace(`${pathname}?${querystring.join('&')}`, { scroll: false })
  }

  useEffect(() => {
    if (!map) return
    const handleClickMap = ({ lngLat }: maplibregl.MapMouseEvent) => {
      if (!enableLocation.current) return
      setValue('geohash', Geohash.encode(lngLat.lat, lngLat.lng, 10))
      handleShowMap(false)
    }

    map.on('click', handleClickMap)
    return () => {
      map.off('click', handleClickMap)
    }
  }, [map, setValue])

  const handleClickClear = useCallback(
    (name: string) => () => {
      setValue(name, '')
    },
    [setValue],
  )

  const previewGeohashUrl = useMemo(() => {
    if (!appendMapLink || !geohashValue) return ''
    const ll = Geohash.decode(geohashValue)
    if (ll?.lat && ll?.lon) {
      const duckduck = shortenUrl(
        `https://duckduckgo.com/?va=n&t=hs&iaxm=maps&q=${ll.lat},${ll.lon}`,
        ndk,
      )
      const google = shortenUrl(
        `https://www.google.com/maps/place/${ll.lat},${ll.lon}`,
        ndk,
      )
      let content = `\n---`
      content += `\nWherostr | https://wherostr.social/g/${geohashValue.slice(
        0,
        -1,
      )}`
      content += `\nDuck Duck Go Maps | ${duckduck.url}`
      content += `\nGoogle Maps | ${google.url}`
      return content
    }
  }, [ndk, geohashValue, appendMapLink])

  const _handleSubmit = useCallback(
    async (data: any) => {
      try {
        setPosting(true)
        const { content, geohash, pow } = data
        const newEvent = new EventBuilder()
        let noteContent = content
        newEvent.pubKey(user!.hexpubkey)
        // const newEvent = new NDKEvent(ndk)
        // newEvent.content = content
        // newEvent.tags = []
        switch (type) {
          case EventActionType.Create:
            newEvent.kind(EventKind.TextNote)
            break
          case EventActionType.Repost:
            noteContent = JSON.stringify(relatedEvents[0].rawEvent())
            newEvent.kind(EventKind.Repost)
            newEvent.tag(['e', relatedEvents[0].id, '', 'mention'])
            newEvent.tag(['p', relatedEvents[0].author.hexpubkey])
            break
          case EventActionType.Quote:
            newEvent.kind(EventKind.TextNote)
            break
          case EventActionType.Comment:
            newEvent.kind(EventKind.TextNote)
            const tagE = relatedEvents[0].getMatchingTags('e')
            const root = tagE.find(([_1, _2, _3, desc]) => desc === 'root')
            if (root) {
              newEvent.tag(root)
              newEvent.tag(['e', relatedEvents[0].id, '', 'reply'])
            } else {
              newEvent.tag(['e', relatedEvents[0].id, '', 'root'])
            }
            const tagP = relatedEvents[0].getMatchingTags('p')
            tagP.forEach((tag) => newEvent.tag(tag))
            newEvent.tag(['p', relatedEvents[0].author.hexpubkey])
            break
        }

        if (positingOptions?.location && geohash) {
          const length = geohash.length
          for (let i = length - 1; i >= 1; i--) {
            newEvent.tag(['g', geohash.substring(0, i)])
          }

          /**
           * TODO: Create short link
           */
          if (appendMapLink) {
            const ll = geohash ? Geohash.decode(geohash) : undefined
            if (ll?.lat && ll?.lon) {
              const duckduck = shortenUrl(
                `https://duckduckgo.com/?va=n&t=hs&iaxm=maps&q=${ll.lat},${ll.lon}`,
                ndk,
              )
              const google = shortenUrl(
                `https://www.google.com/maps/place/${ll.lat},${ll.lon}`,
                ndk,
              )
              noteContent += `\n---`
              noteContent += `\nWherostr | https://wherostr.social/g/${geohash.slice(
                0,
                -1,
              )}`
              noteContent += `\nDuck Duck Go Maps | ${duckduck.url}`
              noteContent += `\nGoogle Maps | ${google.url}`
              await Promise.all([
                duckduck.event.publish(),
                google.event.publish(),
              ])
            }
          }
        }
        const nostrEvent = newEvent
          .content(noteContent)
          .processContent()
          .build()

        let publishEvent: Partial<NostrEvent> = nostrEvent
        if (positingOptions?.pow && powWorker) {
          const diff = pow || 21
          publishEvent = await new NDKEvent(
            ndk,
            publishEvent as NostrEvent,
          ).toNostrEvent(publishEvent.pubkey)
          const powEvent = await powWorker.minePow(
            publishEvent as NostrEvent,
            diff,
          )
          if (ndk.signer) {
            powEvent.sig = await ndk.signer.sign(powEvent as NostrEvent)
          }
          const pool = ndk.pool || ndk.outboxPool
          const results = await Promise.allSettled(
            pool.connectedRelays().map((relay) => {
              return relay.connectivity.relay.publish(powEvent as NostrEvent)
            }),
          )
          const errors: any[] = []
          let hasSuccess = false
          results.forEach((d) => {
            if (d.status === 'fulfilled') {
              hasSuccess = true
            } else if (d.status === 'rejected') {
              errors.push(d.reason)
            }
          })
          if (!hasSuccess && !!errors.length) {
            throw errors[0]
          }
        } else {
          await new NDKEvent(ndk, publishEvent as NostrEvent).publish()
        }
        backToPreviosModalAction('event')
      } catch (err: any) {
        showSnackbar(err.message, {
          slotProps: {
            alert: { severity: 'error' },
          },
        })
        console.log(err)
      } finally {
        setPosting(false)
      }
    },
    [
      user,
      type,
      relatedEvents,
      positingOptions?.location,
      positingOptions?.pow,
      ndk,
      appendMapLink,
      backToPreviosModalAction,
      showSnackbar,
    ],
  )
  const renderActionTypeIcon = useCallback(() => {
    switch (type) {
      case EventActionType.Repost:
        return <Repeat />
      case EventActionType.Quote:
        return <FormatQuote />
      case EventActionType.Comment:
        return <Comment />
      default:
        return undefined
    }
  }, [type])

  const previewEvent = useMemo(() => {
    return {
      content: contentValue + previewGeohashUrl,
      tags: [],
    } as unknown as NDKEvent
  }, [contentValue, previewGeohashUrl])

  const handleUploadFile = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      try {
        if (fileRejections.length > 0) {
          return showSnackbar(
            'File type must be ' +
              Object.values(accept)
                .map((d) => d.join(', '))
                .join(', '),
            // { slotProps: { alert: { severity: 'error' } } },
          )
        }
        const selectionStart = inputRef.current?.selectionStart

        setUploading(true)
        const data = await upload(acceptedFiles).then((res) => res.data)
        const urls = data.map((d) => d.url).join('\n')
        setValue(
          'content',
          contentValue
            ? `${contentValue.substring(
                0,
                selectionStart,
              )}\n${urls}${contentValue.substring(selectionStart)}`
            : `${contentValue}${urls}`,
        )
      } catch (err) {
      } finally {
        setUploading(false)
      }
    },
    [contentValue, setValue, showSnackbar],
  )

  const dropzoneOptions = useMemo(
    () => ({
      noClick: true,
      noKeyboard: true,
      accept: accept,
      multiple: true,
      onDrop: handleUploadFile,
    }),
    [handleUploadFile],
  )
  const { getRootProps, getInputProps } = useDropzone(dropzoneOptions)

  const handlePostingOptionsChange = useCallback<
    NonNullable<PostingOptionsProps['onChange']>
  >((name, values) => {
    setPostingOptions(values)
  }, [])

  const [location, llError, llState] = usePromise(async () => {
    if (!geohashValue) return
    const ll = Geohash.decode(geohashValue)
    try {
      const result = await reverse([ll.lon, ll.lat])
      // const sub =
      //   result.address.suburb ||
      //   result.address.town ||
      //   result.address.county ||
      //   result.address.municipality ||
      //   result.address.village
      // `${sub ? sub + ', ' : ''}${result.address.state}, ${result.address.country}`
      return {
        name: `${
          result.address.town ||
          result.address.city ||
          result.address.state ||
          result.address.province
        }, ${result.address.country}`,
        coordiantes: ll,
      }
    } catch (err) {
      return {
        name: `Unknown`,
        coordiantes: ll,
      }
    }
  }, [geohashValue])

  const disabled = useMemo(
    () => uploading || busy || posting || locating || llState === 'pending',
    [uploading, busy, posting, locating, llState],
  )

  return (
    <form
      onSubmit={handleSubmit(_handleSubmit)}
      {...getRootProps({
        className: 'dropzone',
        onDragOver: (e) => {
          e.dataTransfer.dropEffect = 'copy'
        },
      })}
    >
      <input {...getInputProps()} />
      <Box className="mt-3 grid gap-3 grid-cols-1">
        {type !== EventActionType.Repost && (
          <>
            <NostrTextField
              value={contentValue}
              inputRef={inputRef}
              placeholder="What's on your mind?"
              variant="outlined"
              fullWidth
              multiline
              minRows={4}
              maxRows={12}
              required
              disabled={disabled}
              onPaste={(e) => {
                const mimeTypes = Object.keys(accept)
                const imageFile = Array.from(e.clipboardData.files).find(
                  (f) => {
                    return mimeTypes.includes(f.type)
                  },
                )
                if (imageFile) handleUploadFile([imageFile], [])
              }}
              InputProps={{
                endAdornment: uploading && (
                  <InputAdornment position="end">
                    <CircularProgress
                      size={24}
                      color="inherit"
                      className="absolute bottom-2 right-4"
                    />
                  </InputAdornment>
                ),
              }}
              {...register('content', { required: true })}
            />
            {positingOptions?.location === true && (
              <>
                <input {...register('geohash')} type="hidden" />
                <TextField
                  label={!geohashValue ? 'Please select an option' : 'Location'}
                  variant="outlined"
                  fullWidth
                  inputProps={{
                    style:
                      geohashValue || locating || llState === 'pending'
                        ? { display: 'none' }
                        : undefined,
                  }}
                  InputProps={{
                    readOnly: true,
                    startAdornment:
                      locating || llState === 'pending' ? (
                        <ListItem dense disableGutters>
                          <ListItemAvatar>
                            <Skeleton variant="circular">
                              <Avatar />
                            </Skeleton>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Skeleton width="80%" />}
                            secondary={<Skeleton width={160} />}
                          />
                        </ListItem>
                      ) : geohashValue && location ? (
                        <ListItem dense disableGutters>
                          <ListItemAvatar>
                            <Avatar>
                              <Place className="text-[white]" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={location?.name}
                            secondary={`${location?.coordiantes.lat}, ${location?.coordiantes.lon}`}
                          />
                        </ListItem>
                      ) : (
                        <Stack direction="row" spacing={0.5}>
                          <Chip
                            disabled={disabled}
                            label="GPS"
                            icon={<MyLocation />}
                            onClick={async () => {
                              setLocating(true)
                              const geo = await new Promise(
                                (resolve, reject) => {
                                  navigator.geolocation.getCurrentPosition(
                                    async (position) => {
                                      const geo = Geohash.encode(
                                        position.coords.latitude,
                                        position.coords.longitude,
                                        10,
                                      )
                                      resolve(geo)
                                    },
                                    (err) => {
                                      console.log('geolocation:error', err)
                                    },
                                  )
                                },
                              )
                              setValue('geohash', geo)
                              setLocating(false)
                            }}
                          />
                          {/* <Tooltip title="Coming soon">
                            <Chip
                              variant="outlined"
                              disabled={disabled}
                              label="GeoTagging"
                              icon={<ImageSearch />}
                              onClick={() => {}}
                            />
                          </Tooltip> */}
                          <Chip
                            disabled={disabled}
                            label="Choose from Map"
                            icon={<Map />}
                            onClick={() => {
                              handleShowMap(true)
                            }}
                          />
                        </Stack>
                      ),
                    endAdornment:
                      geohashValue && !locating && llState === 'resolved' ? (
                        <>
                          <IconButton
                            size="small"
                            color={appendMapLink ? 'secondary' : undefined}
                            sx={!appendMapLink ? { opacity: 0.7 } : undefined}
                            onClick={() => {
                              setAppendMapLink((prev) => !prev)
                            }}
                          >
                            {appendMapLink ? <Link /> : <LinkOff />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleClickClear('geohash')}
                          >
                            <Close />
                          </IconButton>
                        </>
                      ) : locating || llState === 'pending' ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : undefined,
                  }}
                  disabled={disabled}
                />
              </>
            )}
            {positingOptions?.pow === true && (
              <TextField
                {...register('pow', { valueAsNumber: true })}
                label="Proof of work difficulty"
                variant="outlined"
                fullWidth
                type="number"
                placeholder="21"
                InputProps={{
                  inputProps: {
                    min: 1,
                    max: 24,
                  },
                  startAdornment: (
                    <InputAdornment position="start">
                      <Memory />
                    </InputAdornment>
                  ),
                }}
                disabled={disabled}
              />
            )}
          </>
        )}
        {type !== EventActionType.Quote &&
          relatedEvents.map((item, index) => (
            <Box
              key={index}
              className="relative max-h-48 border-2 border-secondary-dark rounded-2xl overflow-hidden"
            >
              <ShortTextNoteCard
                event={item}
                action={false}
                relatedNoteVariant="link"
                indent={false}
              />
              <Box className="absolute top-0 left-0 w-full h-full min-h-[192px] bg-gradient-to-t from-disabled-dark to-25%" />
              <Box className="absolute right-0 bottom-0 border-t-2 border-l-2 border-secondary-dark p-2 rounded-tl-2xl text-contrast-secondary bg-secondary-dark">
                {renderActionTypeIcon()}
              </Box>
            </Box>
          ))}
        {previewEvent?.content && (
          <>
            <Typography color="text.secondary" className="pl-2">
              Preview
            </Typography>
            <Box className="rounded-2xl border border-[rgba(255,255,255,0.2)] p-4 pointer-events-none">
              <TextNote event={previewEvent} relatedNoteVariant="full" />
            </Box>
          </>
        )}
        <Box className="flex">
          {type !== EventActionType.Repost && (
            <PostingOptions
              disabled={disabled}
              onChange={handlePostingOptionsChange}
              slotProps={{
                dropzone: { onDrop: dropzoneOptions.onDrop },
              }}
            />
          )}
          <Box flex={1} />
          <LoadingButton
            disabled={disabled}
            loading={posting}
            loadingPosition="start"
            variant="contained"
            type="submit"
            startIcon={type === EventActionType.Repost ? <Repeat /> : <Draw />}
          >
            {type === EventActionType.Repost ? 'Repost' : 'Post'}
          </LoadingButton>
        </Box>
      </Box>
    </form>
  )
}
