import NextLink from 'next/link'
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  Paper,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useEvent } from '@/hooks/useEvent'
import ReactTimeago from 'react-timeago'
import ProfileChip from './ProfileChip'
import { ArrowDropDown, PlayCircleOutline } from '@mui/icons-material'
export const EmbedLongFormContent = ({ naddr }: { naddr: string }) => {
  const [event, error, state] = useEvent(naddr)
  const pubkey = useMemo(() => event?.pubkey, [event])
  const title = useMemo(() => event?.tagValue('title'), [event])
  const image = useMemo(() => event?.tagValue('image'), [event])
  const publishedAt = useMemo(
    () => Number(event?.tagValue('published_at') || event?.created_at),
    [event],
  )
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

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
                color="secondary"
                variant="contained"
                sx={{ fontWeight: 'bold' }}
                startIcon={<PlayCircleOutline />}
                onClick={handleClick}
                endIcon={<ArrowDropDown />}
              >
                Read on
              </Button>
              <Menu
                MenuListProps={{
                  'aria-labelledby': 'long-button',
                  disablePadding: true,
                }}
                transformOrigin={{
                  horizontal: 'center',
                  vertical: 'top',
                }}
                anchorOrigin={{
                  horizontal: 'center',
                  vertical: 'bottom',
                }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
              >
                <ListItemButton
                  dense
                  onClick={handleClose}
                  target="_blank"
                  href={`https://habla.news/a/${naddr}`}
                >
                  <ListItemIcon>
                    <Avatar src="https://habla.news/favicon.png" />
                  </ListItemIcon>
                  <ListItemText primary="Habla" />
                </ListItemButton>
                <ListItemButton
                  dense
                  onClick={handleClose}
                  target="_blank"
                  href={`https://yakihonne.com/article/${naddr}`}
                >
                  <ListItemIcon>
                    <Avatar src="https://yakihonne.s3.ap-east-1.amazonaws.com/20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3/files/1691722198488-YAKIHONNES3.png" />
                  </ListItemIcon>
                  <ListItemText primary="Yakihonne" />
                </ListItemButton>

                <ListItemButton
                  dense
                  onClick={handleClose}
                  target="_blank"
                  href={`https://coracle.social/${naddr}`}
                >
                  <ListItemIcon>
                    <Avatar src="https://coracle.social/images/logo.png" />
                  </ListItemIcon>
                  <ListItemText primary="Coracle" />
                </ListItemButton>

                <ListItemButton
                  dense
                  onClick={handleClose}
                  target="_blank"
                  href={`https://snort.social/${naddr}`}
                >
                  <ListItemIcon>
                    <Avatar src="https://snort.social/nostrich_512.png" />
                  </ListItemIcon>
                  <ListItemText primary="Snort" />
                </ListItemButton>
              </Menu>
            </Box>
          </Box>
        ) : (
          <CircularProgress color="inherit" />
        )}
      </Paper>
    </Box>
  )
}
