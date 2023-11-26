import { Box, Divider, IconButton, Paper, Typography } from '@mui/material'
import { FC, useMemo, useRef } from 'react'
import { useUserDisplayName, useUserProfile } from '@/hooks/useUserProfile'
import { ProfileCardFull } from './ProfileCard'
import { NDKKind } from '@nostr-dev-kit/ndk'
import { unixNow } from '@/utils/time'
import { useSubscribe } from '@/hooks/useSubscribe'
import { ArrowBackOutlined } from '@mui/icons-material'
import ProfileValidBadge from './ProfileValidBadge'
import EventList from './EventList'

export interface NostrPubkeyComponentProps {
  data: string
}
export const NostrPubkeyComponent: FC<NostrPubkeyComponentProps> = ({
  data,
}) => {
  const scrollRef = useRef<HTMLElement>(
    typeof window !== 'undefined' ? window.document.body : null,
  )
  const filter = useMemo(() => {
    if (!data) return
    return {
      kinds: [NDKKind.Text, NDKKind.Repost],
      authors: [data],
      until: unixNow(),
      limit: 30,
    }
  }, [data])

  const [events, fetchMore] = useSubscribe(filter)

  const user = useUserProfile(data)
  const displayName = useUserDisplayName(user)

  return (
    <>
      <Paper className="sticky top-0 z-10" square>
        <Box className="flex items-center p-3 shadow gap-2">
          <IconButton size="small" onClick={() => {}}>
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
        </Box>
        <Divider />
      </Paper>
      <ProfileCardFull hexpubkey={data} />
      <Divider />
      <EventList
        events={events}
        onFetchMore={fetchMore}
        showComments={true}
        parentRef={scrollRef}
      />
    </>
  )
}
