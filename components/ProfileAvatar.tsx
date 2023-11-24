'use client'
import { Avatar, Box } from '@mui/material'
import { useUserProfile } from '@/hooks/useUserProfile'
import ProfileValidBadge from './ProfileValidBadge'
import classNames from 'classnames'

const ProfileAvatar = ({
  className,
  hexpubkey,
  avatarSize = 40,
  showValidBadge = true,
}: {
  className?: string
  hexpubkey?: string
  avatarSize?: number
  showValidBadge?: boolean
}) => {
  const user = useUserProfile(hexpubkey)
  return (
    <Box className={classNames('relative', className)}>
      <Avatar
        className="border-2"
        sx={{ width: avatarSize, height: avatarSize }}
        src={user?.profile?.image}
      />
      {showValidBadge && (
        <ProfileValidBadge
          className="absolute top-0 right-0 w-1/3 h-1/3"
          user={user}
        />
      )}
    </Box>
  )
}

export default ProfileAvatar
