'use client'
import MainPane from '@/components/MainPane'
import { MapView } from '@/components/MapView'
import { MapContextProvider } from '@/contexts/MapContext'
import { Box, Fab, Hidden, useMediaQuery, useTheme } from '@mui/material'
import classNames from 'classnames'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeftOutlined } from '@mui/icons-material'

export default function Page() {
  const theme = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const hasMap = searchParams.get('map') === '1'
  const q = searchParams.get('q') || ''
  const mdUp = useMediaQuery(theme.breakpoints.up('md'))

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
            <Box className="absolute top-20 left-2">
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
      </Box>
    </MapContextProvider>
  )
}
