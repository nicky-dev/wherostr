import * as React from 'react'
import Menu from '@mui/material/Menu'
import {
  Button,
  ButtonProps,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import { NDKUser } from '@nostr-dev-kit/ndk'
import Link from 'next/link'
import {
  ArrowDropDownOutlined,
  CropFree,
  ForumOutlined,
  GroupOutlined,
  List,
  PublicOutlined,
  Tag,
} from '@mui/icons-material'
import { useFollowList } from '@/hooks/useAccount'

interface FeedFilterMenuProps extends ButtonProps {
  q?: string
  pathname?: string
  user?: NDKUser
  disableList?: boolean
  disableConversation?: boolean
}

interface MenuItemProps {
  id: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  disableList?: boolean
  disableConversation?: boolean
  href?: (pathname: string, user?: NDKUser) => string
  hide?: (user?: NDKUser) => boolean
}

const options: MenuItemProps[] = [
  {
    id: 'following',
    label: 'Following',
    icon: <GroupOutlined />,
    href: (pathname) => {
      return `${pathname}following`
    },
    hide(user) {
      return !user
    },
  },
  {
    id: 'conversation',
    label: 'Conversation',
    icon: <ForumOutlined />,
    href: (pathname) => {
      return `${pathname}conversation`
    },
    hide(user) {
      return !user
    },
  },
  {
    id: 'global',
    label: 'Global',
    icon: <PublicOutlined />,
    href: (pathname) => {
      return `${pathname}global`
    },
  },
]

export default function FeedFilterMenu({
  q,
  pathname = '/',
  user,
  disableList,
  disableConversation,
  ...props
}: FeedFilterMenuProps) {
  const [followLists] = useFollowList()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }
  const handleMenuClick = (menuId: string) => {
    handleClose()
  }

  const selectedMenu = React.useMemo(
    () =>
      options.find((item) => {
        if (!q && user && item.id === 'following') return true
        if (!q && !user && item.id === 'global') return true
        if (q === item.id) return true
      }),
    [q, user],
  )

  return (
    <>
      <Button
        {...props}
        color="inherit"
        size="medium"
        onClick={handleClick}
        startIcon={selectedMenu?.icon}
        endIcon={<ArrowDropDownOutlined />}
      >
        {selectedMenu?.label}
      </Button>
      <Menu
        MenuListProps={{
          'aria-labelledby': 'long-button',
          disablePadding: true,
        }}
        transformOrigin={{
          horizontal: 'center',
          vertical: 'top',
        }}
        anchorOrigin={{
          horizontal: 'center',
          vertical: 'bottom',
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {options
          .filter((option) =>
            disableConversation && option.id === 'conversation'
              ? false
              : option.hide?.(user) !== true,
          )
          .map((option, i) => {
            return (
              <ListItemButton
                key={option.id}
                disabled={option.disabled}
                onClick={() => handleMenuClick(option.id)}
                {...(option.href
                  ? { LinkComponent: Link, href: option.href(pathname, user) }
                  : {})}
              >
                {option.icon && <ListItemIcon>{option.icon}</ListItemIcon>}
                <ListItemText primary={option.label} />
              </ListItemButton>
            )
          })}
        {!disableList &&
          followLists.map((d) => {
            const path =
              d.type === 'tag'
                ? `/t/${d.value}`
                : d.type === 'list'
                ? `/l/${d.value}`
                : `/b/${d.value}`

            const icon =
              d.type === 'tag' ? (
                <Tag />
              ) : d.type === 'list' ? (
                <List />
              ) : (
                <CropFree />
              )
            return (
              <ListItemButton
                key={d.id}
                onClick={() => handleMenuClick(d.id)}
                LinkComponent={Link}
                href={`/search${path}`}
              >
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText primary={d.name} />
              </ListItemButton>
            )
          })}
      </Menu>
    </>
  )
}
