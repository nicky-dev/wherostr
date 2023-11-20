'use client'
import EventList from '@/components/EventList'
import { Box, Divider, IconButton, Paper, Typography } from '@mui/material'
import { useCallback, useContext, useMemo, useRef } from 'react'
import { ArrowBackOutlined, Close } from '@mui/icons-material'
import { AppContext } from '@/contexts/AppContext'
import { NDKKind } from '@nostr-dev-kit/ndk'
import { useSubscribe } from '@/hooks/useSubscribe'
import { unixNow } from '@/utils/time'
import { ProfileCardFull } from './ProfileCard'
import ProfileValidBadge from './ProfileValidBadge'
import { useUserProfile } from '@/hooks/useUserProfile'

const ProfileActionModal = () => {
  const { profileAction, backToPreviosModalAction, clearActions } =
    useContext(AppContext)
  const user = useUserProfile(profileAction?.hexpubkey)
  const handleClickBack = useCallback(() => {
    backToPreviosModalAction('profile')
  }, [backToPreviosModalAction])
  const handleClickCloseModal = useCallback(
    () => clearActions(),
    [clearActions],
  )

  const filter = useMemo(() => {
    if (!profileAction?.hexpubkey) return
    return {
      kinds: [NDKKind.Text, NDKKind.Repost],
      authors: [profileAction?.hexpubkey],
      until: unixNow(),
      limit: 30,
    }
  }, [profileAction?.hexpubkey])

  const [events, fetchMore] = useSubscribe(filter)
  const ref = useRef<HTMLDivElement>(null)
  const displayName = useMemo(
    () =>
      user?.profile?.displayName ||
      user?.profile?.name ||
      user?.profile?.username ||
      user?.npub.substring(0, 12),
    [user],
  )
  return (
    <Box className="relative max-h-full flex rounded-2xl overflow-hidden p-0.5 bg-gradient-primary">
      <Paper className="relative w-full overflow-y-auto !rounded-2xl" ref={ref}>
        <Paper className="sticky top-0 z-10" square>
          <Box className="flex items-center p-3 shadow gap-2">
            <IconButton size="small" onClick={handleClickBack}>
              <ArrowBackOutlined />
            </IconButton>
            <Box className="flex-1 flex items-center">
              <Typography
                className="overflow-hidden whitespace-nowrap text-ellipsis"
                variant="h6"
              >
                {displayName}
              </Typography>
              <ProfileValidBadge className="ml-2" user={user} />
            </Box>
            <IconButton size="small" onClick={handleClickCloseModal}>
              <Close />
            </IconButton>
          </Box>
          <Divider />
        </Paper>
        <ProfileCardFull hexpubkey={profileAction?.hexpubkey} />
        <Divider />
        <EventList
          events={events}
          onFetchMore={fetchMore}
          showComments={true}
          parentRef={ref}
        />
      </Paper>
    </Box>
  )
}

export default ProfileActionModal
