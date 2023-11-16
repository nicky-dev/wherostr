import { useFollowList } from '@/hooks/useAccount'
import { LoadingButton } from '@mui/lab'
import { FC, useCallback, useMemo, useState } from 'react'

export interface FollowHashtagButtonProps {
  hashtag: string
}
export const FollowHashtagButton: FC<FollowHashtagButtonProps> = ({
  hashtag,
}) => {
  const [loading, setLoading] = useState(false)
  const [followLists, followHashtag, unfollowHashtag] = useFollowList()

  const isFollowing = useMemo(
    () => followLists?.find((d) => d.type === 'tag' && d.id === hashtag),
    [followLists, hashtag],
  )

  const handleClickFollow = useCallback(async () => {
    try {
      setLoading(true)
      await followHashtag(hashtag)
    } finally {
      setLoading(false)
    }
  }, [hashtag, followHashtag])
  const handleClickUnfollow = useCallback(async () => {
    try {
      setLoading(true)
      await unfollowHashtag(hashtag)
    } finally {
      setLoading(false)
    }
  }, [hashtag, unfollowHashtag])

  return isFollowing ? (
    <LoadingButton
      loading={loading}
      loadingPosition="start"
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
      loadingPosition="start"
      color="secondary"
      size="small"
      variant="contained"
      onClick={handleClickFollow}
    >
      Follow
    </LoadingButton>
  )
}
