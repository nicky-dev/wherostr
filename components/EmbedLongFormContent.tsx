import NextLink from 'next/link'
import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useEvent } from '@/hooks/useEvent'
import ReactTimeago from 'react-timeago'
import ProfileChip from './ProfileChip'
export const EmbedLongFormContent = ({ naddr }: { naddr: string }) => {
  const [event, error, state] = useEvent(naddr)
  const pubkey = useMemo(() => event?.pubkey, [event])
  const title = useMemo(() => event?.tagValue('title'), [event])
  const image = useMemo(() => event?.tagValue('image'), [event])
  const publishedAt = useMemo(
    () => Number(event?.tagValue('published_at') || event?.created_at),
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
                  <Box className="aspect-video hover:scale-110 transition-all">
                    <img src={image} alt="image" />
                  </Box>
                </Box>
              )}
              <Box>
                <Box>
                  <Typography color="inherit" variant="h6" fontWeight="bold">
                    {title}
                  </Typography>
                </Box>
                <Typography
                  className="text-contrast-secondary"
                  variant="caption"
                >
                  {'Published '}
                  <ReactTimeago date={new Date(publishedAt * 1000)} />
                </Typography>
              </Box>
            </Box>
            <Box className="flex items-end gap-2">
              <ProfileChip className="flex-1" hexpubkey={pubkey} />
              <Button
                className="shrink-0"
                LinkComponent={NextLink}
                target="_blank"
                href={`https://yakihonne.com/article/${naddr}`}
                color="secondary"
                variant="outlined"
                sx={{ fontWeight: 'bold' }}
                // startIcon={<PlayCircleOutline />}
              >
                Yakihhone
              </Button>
              <Button
                className="shrink-0"
                LinkComponent={NextLink}
                target="_blank"
                href={`https://habla.news/a/${naddr}`}
                color="secondary"
                variant="outlined"
                sx={{ fontWeight: 'bold' }}
                // startIcon={<PlayCircleOutline />}
              >
                Habla
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
