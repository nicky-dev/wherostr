'use client'

import DrawerMenu from '@/components/DrawerMenu'
import EventActionModal from '@/components/EventActionModal'
import FeedFilterMenu from '@/components/FeedFilterMenu'
import MainPane from '@/components/MainPane'
import { MapView } from '@/components/MapView'
import ProfileActionModal from '@/components/ProfileActionModal'
import ProfileChip from '@/components/ProfileChip'
import UserBar from '@/components/UserBar'
import { MapContextProvider } from '@/contexts/MapContext'
import { useUser } from '@/hooks/useAccount'
import { useAction } from '@/hooks/useApp'
import { Box, Toolbar } from '@mui/material'
import { usePathname, useSearchParams } from 'next/navigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const query = useSearchParams()
  const user = useUser()
  const { eventAction, profileAction } = useAction()
  const q = query.get('q') || ''

  return (
    <MapContextProvider>
      <MainPane fullWidth>
        <Box className="absolute top-2 left-1/2 -translate-x-1/2">
          <FeedFilterMenu
            q={q}
            pathname="/map/"
            variant="contained"
            user={user}
            disableConversation
            disableList
          />
        </Box>
        <MapView className="fixed inset-0 top-[56px]" />
        {children}
      </MainPane>
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
    </MapContextProvider>
  )
}
