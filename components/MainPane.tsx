import { FC, PropsWithChildren } from 'react'
import Filter from '@/components/Filter'
import { Box, IconButton, Paper, Toolbar } from '@mui/material'
import { Notifications } from '@mui/icons-material'
import UserBar from './UserBar'
import classNames from 'classnames'
import { useUser } from '@/hooks/useAccount'
import DrawerMenu from './DrawerMenu'
import ProfileChip from './ProfileChip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MainPane: FC<PropsWithChildren> = ({ children }) => {
  const user = useUser()
  const pathname = usePathname()
  return (
    <Paper
      className={classNames(
        'relative w-full md:w-[640px] flex flex-col !rounded-none min-h-full will-change-transform',
      )}
    >
      <Paper className="!sticky top-0 z-10">
        <Toolbar className="gap-3 items-center !px-3 !min-h-[64px]">
          <DrawerMenu />
          <Filter className="grow" user={user} />
          {user?.hexpubkey ? (
            <>
              {/* <IconButton
                LinkComponent={Link}
                href={`${pathname}notifications/`}
              >
                <Notifications />
              </IconButton> */}
              <ProfileChip showName={false} hexpubkey={user.hexpubkey} />
            </>
          ) : (
            <UserBar />
          )}
        </Toolbar>
        <Box className="w-full h-0.5 shrink-0 bg-gradient-primary" />
      </Paper>
      {children}
    </Paper>
  )
}

export default MainPane
