import { useAccount, useFollowList } from '@/hooks/useAccount'
import { LoadingButton } from '@mui/lab'
import { FC, useCallback, useMemo, useState } from 'react'

export interface FollowHashtagButtonProps {
  hashtag: string
}
export const FollowHashtagButton: FC<FollowHashtagButtonProps> = ({
  hashtag,
}) => {
  const { readOnly } = useAccount()
  const [loading, setLoading] = useState(false)
  const [followLists, followHashtag, unfollowHashtag] = useFollowList()

  const isFollowing = useMemo(
    () =>
      followLists?.find(
        (d) => d.type === 'tag' && d.id.toLowerCase() === hashtag.toLowerCase(),
      ),
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
      disabled={readOnly}
      loading={loading}
      color="secondary"
      variant="outlined"
      onClick={handleClickUnfollow}
      size='small'
    >
      Unfollow
    </LoadingButton>
  ) : (
    <LoadingButton
      disabled={readOnly}
      loading={loading}
      color="secondary"
      variant="contained"
      onClick={handleClickFollow}
      size='small'
    >
      Follow
    </LoadingButton>
  )
}
