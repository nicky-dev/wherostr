import {
  Box,
  Button,
  ButtonProps,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { FC, ReactNode, useCallback, useMemo, useState } from 'react'
import { useLiveActivityItem } from './LiveActivity'
import { useForm } from 'react-hook-form'
import { LoadingButton } from '@mui/lab'
import { unixNow } from '@/utils/time'
import ReactPlayer from 'react-player'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { nip19 } from 'nostr-tools'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { useAccountStore } from '@/contexts/AccountContext'
import { useNDK } from '@/contexts/NostrContext'
import { useSnackbar } from './SnackbarAlert'

export interface StreamButtonProps extends ButtonProps {
  label: string
  icon?: ReactNode
  mode?: 'add' | 'edit'
  data?: NDKEvent
  size?: ButtonProps['size']
}
export const StreamButton: FC<StreamButtonProps> = ({
  label,
  icon,
  data,
  mode = 'add',
  size,
  ...props
}) => {
  const router = useRouter()
  const ndk = useNDK()
  const user = useAccountStore((state) => state.user)
  const { showSnackbar } = useSnackbar()
  const liveItem = useLiveActivityItem(data)
  const values = useMemo(() => {
    return { ...liveItem, tags: liveItem?.tags?.map((d) => d[1]).join(',') }
  }, [liveItem])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tagText, setTagText] = useState('')
  const { register, handleSubmit, setValue, watch } = useForm({ values })
  const _handleSubmit = useCallback(
    async ({ tags, author, pubkey, viewers, id, ...values }: any) => {
      try {
        setLoading(true)
        const event = new NDKEvent(ndk)
        event.kind = 30311

        if (id) {
          values.d = id
          event.tags.push(['d', id])
        } else {
          event.tags.push(['d', uuidv4()])
        }

        const starts = isNaN(values.starts)
          ? unixNow().toString()
          : values.starts?.toString()
        event.tags.push(['starts', starts])

        if (values.status === 'ended') {
          const ends = isNaN(values.ends)
            ? unixNow().toString()
            : values.ends?.toString()
          event.tags.push(['ends', ends])
        } else {
          delete values.ends
        }

        if (values.streaming) {
          event.tags.push(['streaming', values.streaming])
        }

        if (values.recording) {
          event.tags.push(['recording', values.recording])
        }

        if (viewers) {
          event.tags.push(['current_participants', viewers.toString()])
        }

        if (values.status) {
          event.tags.push(['status', values.status])
        }

        if (values.title) {
          event.tags.push(['title', values.title])
        }

        if (values.summary) {
          event.tags.push(['summary', values.summary])
        }

        if (values.image) {
          event.tags.push(['image', values.image])
        }

        if (values.status) {
          event.tags.push(['status', values.status])
        }

        event.tags.push(['p', user?.pubkey || pubkey || author, '', 'host'])

        tags.split(',').forEach((t: string) => {
          const d = t.trim()
          event.tags.push(['t', d])
        })
        await event.publish()
        setOpen(false)
        if (mode === 'add') {
          const addr = nip19.naddrEncode({
            identifier: event.tagValue('d') || event.id,
            kind: event.kind,
            pubkey: event.pubkey,
          })
          return router.push('/' + addr)
        }
      } catch (err: any) {
        showSnackbar(err.message, {
          slotProps: {
            alert: { severity: 'error' },
          },
        })
      } finally {
        setLoading(false)
      }
    },
    [mode, router, ndk, user, showSnackbar],
  )
  const status = watch('status', 'live')
  const tagsText = watch('tags', '')
  const tags = useMemo(
    () => tagsText?.split(',').filter((d: string) => !!d.trim()) || [],
    [tagsText],
  )
  return (
    <>
      <Button
        {...props}
        variant="contained"
        color="secondary"
        startIcon={icon}
        onClick={() => setOpen(true)}
        size={size}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth={'sm'}
        component="form"
        onSubmit={handleSubmit(_handleSubmit)}
      >
        <DialogTitle>Stream Information</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            placeholder="What are we streaming today?"
            margin="dense"
            autoComplete="off"
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            {...register('title', {
              required: true,
            })}
          />
          <TextField
            label="Summary"
            placeholder="A short description of the content"
            margin="dense"
            autoComplete="off"
            fullWidth
            multiline
            maxRows={4}
            InputLabelProps={{
              shrink: true,
            }}
            {...register('summary')}
          />
          <TextField
            label="Cover Image"
            placeholder="https://"
            margin="dense"
            autoComplete="off"
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            {...register('image')}
          />
          <TextField
            label="Stream URL"
            placeholder="https://"
            margin="dense"
            autoComplete="off"
            fullWidth
            // helperText="Stream type should be HLS"
            InputLabelProps={{
              shrink: true,
            }}
            {...register('streaming', {
              // required: true,
              validate: (val) => {
                if (val && !ReactPlayer.canPlay(val)) {
                  return 'Invalid URL'
                }
                return true
              },
              // validate: (val) => {
              //   if (
              //     !val?.length ||
              //     val?.length < 5 ||
              //     !val?.match(/^https?:\/\/.*\.m3u8?$/i)
              //   ) {
              //     return 'Invalid URL'
              //   }
              //   return true
              // },
            })}
          />
          <Box ml={2} mb={1}>
            <Typography variant="caption" color="text.secondary" mb={0.5}>
              Status
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label="LIVE"
                variant={status === 'live' ? 'filled' : 'outlined'}
                onClick={() => setValue('status', 'live')}
              />
              <Chip
                label="ENDED"
                variant={status === 'ended' ? 'filled' : 'outlined'}
                onClick={() => setValue('status', 'ended')}
              />
            </Stack>
          </Box>
          {status === 'ended' && (
            <TextField
              label="Recording URL"
              placeholder="https://"
              margin="dense"
              autoComplete="off"
              fullWidth
              helperText="Video type should be open standard format eg: .mp4"
              InputLabelProps={{
                shrink: true,
              }}
              {...register('recording', {
                validate: (val) => {
                  if (val && !ReactPlayer.canPlay(val)) {
                    return 'Invalid URL'
                  }
                  return true
                },
              })}
            />
          )}
          <TextField
            value={tagText}
            onPaste={(evt) => {
              const data = evt.clipboardData.getData('text')
              const tagsText = Array.from(
                new Set([...tags, ...data.split(',').map((d) => d.trim())]),
              ).join(',')
              if (tagsText.length === 0) return
              setValue('tags', tagsText)
              return evt.preventDefault()
            }}
            onChange={(evt) => {
              if (evt.target.value.endsWith(',')) return
              setTagText(evt.target.value)
            }}
            onKeyDown={(evt) => {
              if (evt.key === ',') {
                evt.preventDefault()
                if (tags.includes(tagText)) {
                  return
                }
                setValue(
                  'tags',
                  Array.from(
                    new Set([
                      ...tags,
                      ...tagText.split(',').map((d) => d.trim()),
                    ]),
                  ).join(','),
                )
                setTagText('')
              }
            }}
            label="Tags"
            placeholder="Thai,Gaming,Siamstr"
            margin="dense"
            fullWidth
            autoComplete="off"
            multiline
            maxRows={6}
            InputLabelProps={{
              shrink: true,
            }}
            InputProps={{
              className: '!grid',
              startAdornment: tags[0] ? (
                <InputAdornment
                  position="start"
                  sx={{
                    minHeight: 32,
                    maxHeight: 'none',
                    height: 'auto',
                    mb: 1,
                  }}
                >
                  <Stack direction="row" gap={0.5} flexWrap="wrap">
                    {tags.map((d: string) => {
                      return (
                        <Chip
                          key={d}
                          label={d}
                          onDelete={(e) => {
                            setValue(
                              'tags',
                              tags.filter((_d: string) => _d !== d).join(','),
                            )
                          }}
                        />
                      )
                    })}
                  </Stack>
                </InputAdornment>
              ) : undefined,
            }}
          />
        </DialogContent>
        <DialogActions sx={{ mx: 2, mb: 2 }}>
          <Button
            variant="outlined"
            color="inherit"
            disabled={loading}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <LoadingButton
            loading={loading}
            type="submit"
            variant="outlined"
            color="inherit"
          >
            {mode === 'add' ? 'Start Stream' : 'Save'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  )
}
