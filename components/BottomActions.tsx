import { AppContext, EventActionType } from '@/contexts/AppContext'
import {
  Add,
  Draw,
  Home,
  Map,
  Notifications,
  Search,
} from '@mui/icons-material'
import { BottomNavigation, BottomNavigationAction, Fab } from '@mui/material'
import classNames from 'classnames'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useContext, useState } from 'react'

const BottomActions = ({ className }: { className?: string }) => {
  const { setEventAction } = useContext(AppContext)
  const router = useRouter()
  const pathname = usePathname()
  const query = useSearchParams()
  const tabValue = query.get('tab') || 'home'
  const q = query.get('q')
  const [value, setValue] = useState(tabValue)

  const handleClickPost = useCallback(() => {
    setEventAction({
      type: EventActionType.Create,
    })
  }, [setEventAction])

  return (
    <BottomNavigation
      className={classNames('sticky bottom-0 min-h-[48px]', className)}
      value={value}
      showLabels={false}
      sx={{ height: 48 }}
      onChange={(_, value) => {
        setValue(value)
        router.replace(`${pathname}?q=${q}&tab=${value}`)
      }}
    >
      <BottomNavigationAction value="home" icon={<Home />} />
      <BottomNavigationAction value="map" icon={<Map />} />
      <BottomNavigationAction value="notification" icon={<Notifications />} />
    </BottomNavigation>
  )
}

export default BottomActions
