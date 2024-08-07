'use client'
import EventActionModal from '@/components/EventActionModal'
import MainPane from '@/components/MainPane'
import { MapView } from '@/components/MapView'
import ProfileActionModal from '@/components/ProfileActionModal'
import { useAccountStore } from '@/contexts/AccountContext'
import { EventActionType, useAppStore } from '@/contexts/AppContext'
import { MapContextProvider } from '@/contexts/MapContext'
import { ChevronLeftOutlined, Draw } from '@mui/icons-material'
import { Box, Fab, Hidden, Zoom, useMediaQuery, useTheme } from '@mui/material'
import classNames from 'classnames'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const readOnly = useAccountStore((state) => state.readOnly)
  const eventAction = useAppStore((state) => state.eventAction)
  const profileAction = useAppStore((state) => state.profileAction)
  const setEventAction = useAppStore((state) => state.setEventAction)
  const theme = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const hasMap = searchParams.get('map') === '1'
  const mdUp = useMediaQuery(theme.breakpoints.up('md'))
  const mdDown = useMediaQuery(theme.breakpoints.down('md'))
  const showOnlyMap = useMemo(() => mdDown && hasMap, [mdDown, hasMap])

  const handleClickPost = useCallback(() => {
    setEventAction({
      type: EventActionType.Create,
    })
  }, [setEventAction])

  return (
    <MapContextProvider>
      <Box className={classNames('flex-1 flex flex-col')}>
        <MapView
          className={classNames('fixed inset-0 md:left-[640px] flex-1', {
            hidden: !mdUp && !hasMap,
            'z-10': hasMap && !mdUp,
          })}
        >
          <Hidden mdUp>
            <Box className="absolute top-2 left-2">
              <Fab
                size="small"
                onClick={() => {
                  router.push(pathname, { scroll: false })
                }}
              >
                <ChevronLeftOutlined />
              </Fab>
            </Box>
          </Hidden>
        </MapView>
        <MainPane>{children}</MainPane>
        {eventAction ? (
          <Box
            className={classNames(
              'fixed left-0 top-0 w-full md:w-[640px] h-full p-2 sm:p-3 md:p-6 backdrop-blur z-50',
              { hidden: hasMap && mdDown },
            )}
          >
            <EventActionModal />
          </Box>
        ) : null}
        {profileAction && (
          <Box className="fixed left-0 top-0 w-full md:w-[640px] h-full p-2 sm:p-3 md:p-6 backdrop-blur z-50">
            <ProfileActionModal />
          </Box>
        )}
      </Box>
      <Zoom in={!readOnly && !showOnlyMap}>
        <Fab
          className={classNames('!fixed !bg-gradient-primary !z-40 bottom-6', {
            'left-[calc(640px_-_72px)]': mdUp,
            'right-6': mdDown,
          })}
          size="medium"
          onClick={handleClickPost}
        >
          <Draw className="text-[white]" />
        </Fab>
      </Zoom>
    </MapContextProvider>
  )
}
