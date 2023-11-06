import NextLink from 'next/link'
import { useStreamRelaySet } from '@/hooks/useNostr'
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Link,
  Paper,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import { useEvent } from '@/hooks/useEvent'
import StatusBadge from './StatusBadge'
import ReactTimeago from 'react-timeago'
import ProfileChip from './ProfileChip'
import { PlayCircleOutline } from '@mui/icons-material'
export const EmbedLiveActivity = ({ naddr }: { naddr: string }) => {
  const streamRelaySet = useStreamRelaySet()
  const [event, error, state] = useEvent(naddr, streamRelaySet)
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

  return (
    <Box className="bg-gradient-primary w-full rounded-2xl shadow p-0.5">
      <Paper className="p-3 !rounded-2xl">
        {state === 'resolved' ? (
          <Box className="flex flex-col gap-3">
            <Box className="flex gap-3 items-start flex-col sm:flex-row">
              {!!image && (
                <Box className="sm:max-w-[40%] rounded-2xl overflow-hidden shadow">
                  <ButtonBase
                    className="aspect-video hover:scale-110 transition-all"
                    centerRipple
                    LinkComponent={NextLink}
                    href={`/${naddr}`}
                    target="_blank"
                  >
                    <img src={image} alt="image" />
                  </ButtonBase>
                </Box>
              )}
              <Box>
                <Box>
                  <Link
                    component={NextLink}
                    target="_blank"
                    underline="hover"
                    color="inherit"
                    variant="h6"
                    fontWeight="bold"
                    href={`/${naddr}`}
                  >
                    {title}
                  </Link>
                </Box>
                <Typography
                  className="text-contrast-secondary"
                  variant="caption"
                >
                  {isLive && (
                    <StatusBadge
                      className="!mr-2 inline-block text-contrast-primary"
                      status="live"
                    />
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
                href={`/${naddr}`}
                color="primary"
                variant="contained"
                sx={{ fontWeight: 'bold' }}
                startIcon={<PlayCircleOutline />}
              >
                Watch
              </Button>
            </Box>
          </Box>
        ) : (
          <CircularProgress color="inherit" />
        )}
      </Paper>
    </Box>
  )
}
