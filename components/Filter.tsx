'use client'
import { BaseTextFieldProps, TextFieldProps, Paper } from '@mui/material'
import { FC } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import SearchBox from './SearchBox'
import classNames from 'classnames'
import { NDKUser } from '@nostr-dev-kit/ndk'

export interface FilterProps extends BaseTextFieldProps {
  q?: string
  className?: string
  user?: NDKUser
  InputProps?: TextFieldProps['InputProps']
}

const Filter: FC<FilterProps> = ({
  q = '',
  className,
  user,
  InputProps,
  ...props
}) => {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Paper
      className={classNames(
        'flex items-center justify-end !shadow-none',
        className,
      )}
    >
      <SearchBox
        placeholder="Search by hashtag or place"
        name="search"
        size="small"
        margin="dense"
        onChange={(value?: string) => {
          const showMap =
            value?.startsWith('/g/') || value?.startsWith('/b/') ? 1 : ''
          router.push(`/search/${value}?map=${showMap}`)
          ;(document.activeElement as HTMLElement)?.blur?.()
        }}
        onBlur={InputProps?.onBlur}
        autoFocus={InputProps?.autoFocus}
        value={q}
      />
    </Paper>
  )
}

export default Filter
