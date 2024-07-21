'use client'
import {
  EventActionType,
  ProfileActionType,
  useAppStore,
} from '@/contexts/AppContext'
import { Box, Typography } from '@mui/material'
import { ReactNode, useCallback, useContext, useMemo } from 'react'
import { useUserProfile } from '@/hooks/useUserProfile'
import classNames from 'classnames'
import ProfileAvatar from './ProfileAvatar'

export interface ProfileChipProps {
  className?: string
  hexpubkey?: string | string[]
  eventActionType?: EventActionType
  showName?: boolean
  showNip5?: boolean
  nameAdornment?: ReactNode
  clickable?: boolean
  onClick?: (hexpubkey: string) => void | boolean
}

const ProfileChip = ({
  className,
  hexpubkey,
  eventActionType,
  showName = true,
  showNip5 = true,
  nameAdornment,
  clickable = true,
  onClick,
}: ProfileChipProps) => {
  const userLeft = useUserProfile(
    typeof hexpubkey === 'string' ? hexpubkey : hexpubkey?.[0],
  )
  // const userRight = useUserProfile(hexpubkey?.[1])
  const setProfileAction = useAppStore((state) => state.setProfileAction)
  const displayName = useMemo(
    () =>
      userLeft?.profile?.displayName ||
      userLeft?.profile?.name ||
      userLeft?.profile?.username ||
      userLeft?.npub?.substring(0, 12),
    [userLeft],
  )
  const handleClickProfile = useCallback(() => {
    if (!userLeft?.pubkey) return
    if (onClick && onClick(userLeft?.pubkey) === false) {
      return
    }
    setProfileAction({
      type: ProfileActionType.View,
      hexpubkey: userLeft?.pubkey,
    })
  }, [userLeft?.pubkey, onClick, setProfileAction])

  return (
    <Box
      className={classNames(
        className,
        'relative flex items-center overflow-x-hidden',
        {
          'cursor-pointer hover:underline': clickable,
        },
      )}
      onClick={clickable && userLeft ? handleClickProfile : undefined}
    >
      <ProfileAvatar hexpubkey={userLeft?.pubkey} />
      {showName && (
        <Box className="flex flex-col pl-2 overflow-hidden">
          <Box className="flex">
            <Typography
              className="overflow-hidden whitespace-nowrap text-ellipsis text-contrast-primary"
              variant="subtitle2"
            >
              {displayName}
            </Typography>
            {nameAdornment}
          </Box>
          {showNip5 && (
            <Typography
              className="overflow-hidden whitespace-nowrap text-ellipsis text-contrast-secondary"
              variant="caption"
            >
              {userLeft?.profile?.nip05}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}

export default ProfileChip
