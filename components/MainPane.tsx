import { FC, PropsWithChildren } from 'react'
import { Box, IconButton, Paper, Typography } from '@mui/material'
import {
  // EmailOutlined,
  HomeOutlined,
  NotificationsOutlined,
} from '@mui/icons-material'
import UserBar from './UserBar'
import classNames from 'classnames'
import { useUser } from '@/hooks/useAccount'
import DrawerMenu from './DrawerMenu'
import ProfileChip from './ProfileChip'
import Link from 'next/link'
import Image from 'next/image'

const NavigationBar: FC<{ className?: string }> = ({ className }) => {
  const user = useUser()
  return (
    <Box className={classNames('flex items-center gap-3 px-3 py-2', className)}>
      <DrawerMenu />
      <Image src="/logo.svg" width={40} height={40} alt="wherostr" />
      <Typography variant="h5">Wherostr</Typography>
      <Box className="flex-1 flex gap-3 justify-end items-center">
        <IconButton LinkComponent={Link} href="/">
          <HomeOutlined />
        </IconButton>
        {user?.hexpubkey ? (
          <>
            <IconButton LinkComponent={Link} href="/notifications">
              <NotificationsOutlined />
            </IconButton>
            {/* <IconButton>
              <EmailOutlined />
            </IconButton> */}
            <ProfileChip showName={false} hexpubkey={user.hexpubkey} />
          </>
        ) : (
          <UserBar />
        )}
      </Box>
    </Box>
  )
}

const MainPane: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Paper
      className={classNames(
        'relative w-full md:w-[640px] flex flex-col !rounded-none min-h-full will-change-transform',
      )}
    >
      <Paper className="!sticky top-0 z-10">
        <NavigationBar />
        <Box className="w-full h-0.5 shrink-0 bg-gradient-primary" />
      </Paper>
      {children}
    </Paper>
  )
}

export default MainPane
