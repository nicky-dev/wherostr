'use client'
import MainPane from '@/components/MainPane'
import { Box, Fab, Zoom, useMediaQuery, useTheme } from '@mui/material'
import classNames from 'classnames'
import { useSearchParams } from 'next/navigation'
import { Draw } from '@mui/icons-material'
import { useCallback, useMemo } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useAction } from '@/hooks/useApp'
import { EventActionType } from '@/contexts/AppContext'
import EventActionModal from '@/components/EventActionModal'
import ProfileActionModal from '@/components/ProfileActionModal'

export default function Page({ children }: { children: React.ReactNode }) {
  const { readOnly } = useAccount()
  const { eventAction, profileAction, setEventAction } = useAction()
  const theme = useTheme()
  const searchParams = useSearchParams()
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
    <Box className="relative mx:0 md:mx-auto overflow-visible">
      <MainPane>{children}</MainPane>
      <Zoom in={!readOnly && !showOnlyMap}>
        <Fab
          className={classNames('!fixed !bg-gradient-primary !z-40 bottom-6', {
            'left-[calc(50%_+_320px_-_72px)]': mdUp,
            'right-6': mdDown,
          })}
          size="medium"
          onClick={handleClickPost}
        >
          <Draw className="text-[white]" />
        </Fab>
      </Zoom>
      {eventAction ? (
        <Box
          className={classNames(
            'fixed left-1/2 -translate-x-1/2 top-0 w-full md:max-w-[640px] h-full p-2 sm:p-3 md:p-6 backdrop-blur z-50',
            { hidden: hasMap && mdDown },
          )}
        >
          <EventActionModal />
        </Box>
      ) : null}
      {profileAction && (
        <Box className="fixed left-1/2 -translate-x-1/2 top-0 w-full md:max-w-[640px] h-full p-2 sm:p-3 md:p-6 backdrop-blur z-50">
          <ProfileActionModal />
        </Box>
      )}
    </Box>
  )
}
