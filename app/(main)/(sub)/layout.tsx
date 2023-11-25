'use client'

import DrawerMenu from '@/components/DrawerMenu'
import EventActionModal from '@/components/EventActionModal'
import ProfileActionModal from '@/components/ProfileActionModal'
import ProfileChip from '@/components/ProfileChip'
import { StreamButton } from '@/components/StreamButton'
import UserBar from '@/components/UserBar'
import { useUser } from '@/hooks/useAccount'
import { useAction } from '@/hooks/useApp'
import { Sensors } from '@mui/icons-material'
import { Box, NoSsr, Toolbar } from '@mui/material'
import { usePathname } from 'next/navigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const user = useUser()
  const { eventAction, profileAction } = useAction()

  return (
    <>
      <Toolbar className="z-50">
        <DrawerMenu />
        <Box flex={1} />
        {user?.hexpubkey ? (
          <>
            {pathname.startsWith('/live') && (
              <StreamButton label="Stream" icon={<Sensors />} sx={{ mr: 1 }} />
            )}
            <ProfileChip hexpubkey={user?.hexpubkey} showName={false} />
          </>
        ) : (
          <UserBar />
        )}
      </Toolbar>
      {children}
      {!!eventAction && (
        <Box className="fixed inset-0 backdrop-blur z-50 flex items-center justify-center overflow-hidden p-2">
          <Box className="h-full w-full md:max-w-2xl max-h-full overflow-hidden">
            <EventActionModal />
          </Box>
        </Box>
      )}
      {!!profileAction && (
        <Box className="fixed inset-0 backdrop-blur z-50 flex items-center justify-center overflow-hidden p-2">
          <Box className="h-full w-full md:max-w-2xl max-h-full overflow-hidden">
            <ProfileActionModal />
          </Box>
        </Box>
      )}
    </>
  )
}
