'use client'
import MainPane from '@/components/MainPane'
import { Box } from '@mui/material'
import classNames from 'classnames'
import { useAction } from '@/hooks/useApp'
import EventActionModal from '@/components/EventActionModal'
import ProfileActionModal from '@/components/ProfileActionModal'
import { useParams, usePathname } from 'next/navigation'
import { nip19 } from 'nostr-tools'
import { useMemo } from 'react'

export default function Page({ children }: { children: React.ReactNode }) {
  const { eventAction, profileAction } = useAction()
  const pathname = usePathname()
  const { id } = useParams()
  const desc = useMemo(
    () => (typeof id === 'string' ? nip19.decode(id) : undefined),
    [id],
  )

  const mainPaneProps = useMemo(() => {
    if (
      (desc?.type === 'naddr' && desc.data.kind === 30311) ||
      pathname.startsWith('/live') ||
      pathname.startsWith('/settings')
    ) {
      return {
        fullWidth: true,
        className: 'min-w-full bg-[inherit]',
      }
    } else {
      return {
        className: 'mx-auto',
      }
    }
  }, [desc, pathname])

  return (
    <Box className="relative mx:0 md:mx-auto overflow-visible h-full w-full">
      <MainPane {...mainPaneProps}>{children}</MainPane>
      {eventAction ? (
        <Box
          className={classNames(
            'fixed left-1/2 -translate-x-1/2 top-0 w-full md:max-w-[640px] h-full p-2 sm:p-3 md:p-6 backdrop-blur z-50',
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
