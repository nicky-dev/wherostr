'use client'
import EventList from '@/components/EventList'
import { Box, Divider, IconButton, Paper, Typography } from '@mui/material'
import { useCallback, useMemo, useRef } from 'react'
import { ArrowBackOutlined, Close } from '@mui/icons-material'
import { useAppStore } from '@/contexts/AppContext'
import { NDKKind } from '@nostr-dev-kit/ndk'
import { useSubscribe } from '@/hooks/useSubscribe'
import { unixNow } from '@/utils/time'
import { ProfileCardFull } from './ProfileCard'
import ProfileValidBadge from './ProfileValidBadge'
import { useUserDisplayName, useUserProfile } from '@/hooks/useUserProfile'

const ProfileActionModal = () => {
  const profileAction = useAppStore((state) => state.profileAction)
  const backToPreviosModalAction = useAppStore(
    (state) => state.backToPreviosModalAction,
  )
  const clearActions = useAppStore((state) => state.clearActions)

  const user = useUserProfile(profileAction?.pubkey)
  const handleClickBack = useCallback(() => {
    backToPreviosModalAction('profile')
  }, [backToPreviosModalAction])
  const handleClickCloseModal = useCallback(
    () => clearActions(),
    [clearActions],
  )

  const filter = useMemo(() => {
    if (!profileAction?.pubkey) return
    return {
      kinds: [NDKKind.Text, NDKKind.Repost],
      authors: [profileAction?.pubkey],
      until: unixNow(),
      limit: 30,
    }
  }, [profileAction?.pubkey])

  const [events, fetchMore] = useSubscribe(filter)
  const ref = useRef<HTMLDivElement>(null)
  const displayName = useUserDisplayName(user)

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
        <ProfileCardFull hexpubkey={profileAction?.pubkey} />
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
