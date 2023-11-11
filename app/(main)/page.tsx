'use client'
import MainPane from '@/components/MainPane'
import { MapView } from '@/components/MapView'
import { MapContextProvider } from '@/contexts/MapContext'
import { Box, Fab, Hidden, Zoom, useMediaQuery, useTheme } from '@mui/material'
import classNames from 'classnames'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeftOutlined, Draw } from '@mui/icons-material'
import { useCallback, useMemo } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useAction } from '@/hooks/useApp'
import { EventActionType } from '@/contexts/AppContext'
import EventActionModal from '@/components/EventActionModal'
import ProfileActionModal from '@/components/ProfileActionModal'

export default function Page() {
  const { readOnly } = useAccount()
  const { eventAction, profileAction, setEventAction } = useAction()
  const theme = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const hasMap = searchParams.get('map') === '1'
  const q = searchParams.get('q') || ''
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
      <Box
        className={classNames(
          'flex-1 flex flex-col',
          'md:[&_.maplibregl-ctrl-bottom-left]:!left-[640px]',
        )}
      >
        <MapView
          className={classNames('flex-1', {
            '-z-10': !mdUp && !hasMap,
            'z-10': hasMap && !mdUp,
            // 'md:visible': true,
          })}
        >
          <Hidden mdUp>
            <Box className="absolute top-2 left-2">
              <Fab
                size="small"
                onClick={() =>
                  router.replace(`${pathname}?q=${q}`, { scroll: false })
                }
              >
                <ChevronLeftOutlined />
              </Fab>
            </Box>
          </Hidden>
        </MapView>
        <MainPane />
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
