'use client'
import Feed from '@/components/Feed'
import { useAccountStore } from '@/contexts/AccountContext'
import { EventActionType, useAppStore } from '@/contexts/AppContext'
import { Draw } from '@mui/icons-material'
import { Fab, Zoom, useMediaQuery, useTheme } from '@mui/material'
import classNames from 'classnames'
import { usePathname } from 'next/navigation'
import { useCallback } from 'react'

export default function Page() {
  const pathname = usePathname()
  const readOnly = useAccountStore((state) => state.readOnly)
  const setEventAction = useAppStore((state) => state.setEventAction)
  const theme = useTheme()
  const mdUp = useMediaQuery(theme.breakpoints.up('md'))
  const mdDown = useMediaQuery(theme.breakpoints.down('md'))

  const handleClickPost = useCallback(() => {
    setEventAction({
      type: EventActionType.Create,
    })
  }, [setEventAction])

  return (
    <>
      <Feed pathname={pathname} />
      <Zoom in={!readOnly}>
        <Fab
          className={classNames(
            '!absolute !bg-gradient-primary !z-40 bottom-6',
            {
              'left-[calc(50%_+_320px_-_72px)]': mdUp,
              'right-6': mdDown,
            },
          )}
          size="medium"
          onClick={handleClickPost}
        >
          <Draw className="text-[white]" />
        </Fab>
      </Zoom>
    </>
  )
}
