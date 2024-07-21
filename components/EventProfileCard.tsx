'use client'
import ProfileChip from '@/components/ProfileChip'
import { Box, Card, Divider } from '@mui/material'
import { FC, PropsWithChildren, useCallback, useMemo, useState } from 'react'
import { NDKUser } from '@nostr-dev-kit/ndk'
import { LoadingButton } from '@mui/lab'
import { useAccountStore } from '@/contexts/AccountContext'

export const EventProfileCard: FC<
  PropsWithChildren & { hexpubkey: string }
> = ({ children, hexpubkey }) => {
  const [loading, setLoading] = useState(false)
  const account = useAccountStore((state) => state.user)
  const follows = useAccountStore((state) => state.follows)
  const follow = useAccountStore((state) => state.follow)
  const unfollow = useAccountStore((state) => state.unfollow)
  const itsYou = useMemo(
    () => account?.pubkey === hexpubkey,
    [account?.pubkey, hexpubkey],
  )
  const isFollowing = follows.find((d) => d.pubkey === hexpubkey)
  const user = useMemo(() => new NDKUser({ hexpubkey }), [hexpubkey])
  const handleClickFollow = useCallback(async () => {
    try {
      setLoading(true)
      await follow(user)
    } finally {
      setLoading(false)
    }
  }, [follow, user])
  const handleClickUnfollow = useCallback(async () => {
    try {
      setLoading(true)
      await unfollow(user)
    } finally {
      setLoading(false)
    }
  }, [unfollow, user])
  return (
    <Card square>
      <Box className="px-3 pt-3 flex items-center gap-2 text-contrast-secondary">
        {children}
        <ProfileChip hexpubkey={hexpubkey} />
        {account && !itsYou && (
          <Box className="grow flex flex-col items-end shrink-0">
            {isFollowing ? (
              <LoadingButton
                loading={loading}
                color="secondary"
                size="small"
                variant="outlined"
                onClick={handleClickUnfollow}
              >
                Unfollow
              </LoadingButton>
            ) : (
              <LoadingButton
                loading={loading}
                color="secondary"
                size="small"
                variant="contained"
                onClick={handleClickFollow}
              >
                Follow
              </LoadingButton>
            )}
          </Box>
        )}
      </Box>
      <Divider className="!mt-3" />
    </Card>
  )
}
