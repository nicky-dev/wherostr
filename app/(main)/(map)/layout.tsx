'use client'

import EventActionModal from '@/components/EventActionModal'
import { FeedToolbar } from '@/components/FeedToolbar'
import MainPane from '@/components/MainPane'
import { MapView } from '@/components/MapView'
import ProfileActionModal from '@/components/ProfileActionModal'
import { MapContextProvider } from '@/contexts/MapContext'
import { useAction } from '@/hooks/useApp'
import { useFeedType } from '@/hooks/useFeedType'
import { extractQuery } from '@/utils/extractQuery'
import { Box } from '@mui/material'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { eventAction, profileAction } = useAction()
  const [, base, type, searchType, searchValue] = pathname.split('/')
  const q =
    searchType && searchValue ? `${searchType}:${searchValue}` : undefined
  const feedType = useFeedType(type)
  const query = useMemo(() => extractQuery(q), [q])

  return (
    <MapContextProvider>
      <MainPane fullWidth>
        <MapView className="fixed inset-0 top-[112px]" />
        <FeedToolbar
          feedType={feedType}
          pathname={`/${base}/`}
          query={query}
          filterMenuProps={{ disableConversation: true }}
        />
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
