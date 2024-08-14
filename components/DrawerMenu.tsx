'use client'
import { FC, Fragment, useCallback, useState } from 'react'
import {
  Close,
  ExitToApp,
  Map,
  Menu,
  NotesOutlined,
  SensorsOutlined,
  Settings,
} from '@mui/icons-material'
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from '@mui/material'
import Link from 'next/link'
import { ProfileCard } from './ProfileCard'
import { ProfileActionType, useAppStore } from '@/contexts/AppContext'
import { usePathname, useRouter } from 'next/navigation'
import { defaultPubkey } from '@/constants/app'
import { useAccountStore } from '@/contexts/AccountContext'

const DrawerMenu: FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const setProfileAction = useAppStore((state) => state.setProfileAction)
  const readOnly = useAccountStore((state) => state.readOnly)
  const user = useAccountStore((state) => state.user)
  const signOut = useAccountStore((state) => state.signOut)
  const [open, setOpen] = useState(false)

  const toggleDrawer = useCallback(() => {
    setOpen((prev) => !prev)
    return false
  }, [])

  const closeDrawer = useCallback(() => {
    setOpen(false)
  }, [])
  const hexpubkey = user?.pubkey || defaultPubkey

  return (
    <Fragment>
      <IconButton onClick={toggleDrawer}>
        <Menu />
      </IconButton>
      <Drawer
        anchor={'left'}
        open={open}
        onClose={toggleDrawer}
        variant="temporary"
        className="z-50"
      >
        <Toolbar
          disableGutters
          className="px-2 w-[344px] !min-h-[0px] bg-inherit !sticky top-0 z-10"
          variant="regular"
        />
        <IconButton
          size="small"
          onClick={closeDrawer}
          className="!absolute right-2 top-2 !bg-[#0000001f] z-10"
        >
          <Close />
        </IconButton>
        <ProfileCard
          hexpubkey={hexpubkey}
          showAbout={false}
          onClick={
            user?.pubkey
              ? async () => {
                  closeDrawer()
                  setTimeout(() => {
                    setProfileAction({
                      pubkey: hexpubkey,
                      type: ProfileActionType.View,
                    })
                  }, 100)
                }
              : undefined
          }
        />
        {/* <ProfileChip hexpubkey={hexpubkey} onClick={closeDrawer} size="large" /> */}
        <List>
          <ListItemButton
            selected={pathname === '/'}
            LinkComponent={Link}
            href="/"
            onClick={async () => {
              closeDrawer()
            }}
          >
            <ListItemIcon>
              <NotesOutlined />
            </ListItemIcon>
            <ListItemText primary="Feeds" />
          </ListItemButton>

          <ListItemButton
            selected={pathname.startsWith('/map')}
            LinkComponent={Link}
            href="/map"
            onClick={async () => {
              closeDrawer()
            }}
          >
            <ListItemIcon>
              <Map />
            </ListItemIcon>
            <ListItemText primary="Maps" />
          </ListItemButton>

          <ListItemButton
            selected={pathname.startsWith('/live')}
            LinkComponent={Link}
            href="/live"
            onClick={async () => {
              closeDrawer()
            }}
          >
            <ListItemIcon>
              <SensorsOutlined />
            </ListItemIcon>
            <ListItemText primary="Streams" />
          </ListItemButton>

          {!readOnly && (
            <ListItemButton
              selected={pathname.startsWith('/settings')}
              LinkComponent={Link}
              href="/settings"
              onClick={async () => {
                closeDrawer()
              }}
            >
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          )}

          {/* <ListItemButton
            onClick={async () => {
              setProfileAction({
                hexpubkey: hexpubkey,
                type: ProfileActionType.View,
              })
              closeDrawer()
            }}
          >
            <ListItemIcon>
              <AccountCircle />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItemButton> */}
        </List>
        <Box flex={1} />
        {user?.pubkey && (
          <>
            <Box className="w-full h-0.5 shrink-0 bg-gradient-primary" />
            <List>
              <ListItemButton
                onClick={async () => {
                  signOut()
                  if (!pathname.startsWith('/settings')) {
                    router.replace(`/`)
                  } else {
                    router.replace(`/`)
                  }
                  closeDrawer()
                }}
              >
                <ListItemIcon>
                  <ExitToApp />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </List>
          </>
        )}
        {/* <Box className="w-full h-0.5 shrink-0 bg-gradient-primary" /> */}
      </Drawer>
    </Fragment>
  )
}

export default DrawerMenu
