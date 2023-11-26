'use client'

import EventActionModal from '@/components/EventActionModal'
import FeedFilterMenu from '@/components/FeedFilterMenu'
import MainPane from '@/components/MainPane'
import { MapView } from '@/components/MapView'
import ProfileActionModal from '@/components/ProfileActionModal'
import { MapContextProvider } from '@/contexts/MapContext'
import { useUser } from '@/hooks/useAccount'
import { useAction } from '@/hooks/useApp'
import { Box } from '@mui/material'
import { usePathname } from 'next/navigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const user = useUser()
  const { eventAction, profileAction } = useAction()
  const [, base, q] = pathname.split('/')

  return (
    <MapContextProvider>
      <MainPane fullWidth>
        <Box className="absolute z-10 top-2 left-1/2 -translate-x-1/2">
          <FeedFilterMenu
            q={q}
            pathname={`/${base}/`}
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
