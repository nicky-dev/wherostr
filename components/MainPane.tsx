import { FC, PropsWithChildren, ReactNode } from 'react'
import { Box, IconButton, Paper, Typography } from '@mui/material'
import { HomeOutlined, NotificationsOutlined } from '@mui/icons-material'
import UserBar from './UserBar'
import classNames from 'classnames'
import { useUser } from '@/hooks/useAccount'
import DrawerMenu from './DrawerMenu'
import ProfileChip from './ProfileChip'
import Link from 'next/link'
import Image from 'next/image'

const NavigationBar: FC<{
  className?: string
  startTools?: ReactNode
  endTools?: ReactNode
}> = ({ className, startTools, endTools }) => {
  const user = useUser()
  return (
    <Box className={classNames('flex items-center gap-2 px-3 py-2', className)}>
      <DrawerMenu />
      <Image
        src="/Wherostr- logo2_forDarkBG.png"
        alt="wherostr"
        width={32}
        height={32}
      />
      <Typography className="!font-bold !text-2xl sm:!text-3xl text-gradient bg-gradient-primary overflow-hidden text-ellipsis whitespace-nowrap">
        Wherostr
      </Typography>
      <Box className="flex-1 flex gap-2 justify-end items-center">
        {startTools}
        <IconButton LinkComponent={Link} href="/">
          <HomeOutlined />
        </IconButton>
        {!!user?.hexpubkey && (
          <IconButton LinkComponent={Link} href="/notifications">
            <NotificationsOutlined />
          </IconButton>
        )}
        {endTools}
        {user?.hexpubkey ? (
          <ProfileChip showName={false} hexpubkey={user.hexpubkey} />
        ) : (
          <UserBar />
        )}
      </Box>
    </Box>
  )
}

const MainPane: FC<
  PropsWithChildren & {
    className?: string
    fullWidth?: boolean
    startTools?: ReactNode
    endTools?: ReactNode
  }
> = ({ className, fullWidth, children, startTools, endTools }) => {
  return (
    <Paper
      className={classNames(
        'relative w-full flex flex-col min-h-full will-change-transform',
        { 'md:w-[640px]': !fullWidth },
        className,
      )}
      square
    >
      <Paper className="!sticky top-0 z-10">
        <NavigationBar startTools={startTools} endTools={endTools} />
        <Box className="w-full h-0.5 shrink-0 bg-gradient-primary" />
      </Paper>
      {children}
    </Paper>
  )
}

export default MainPane
