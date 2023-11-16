'use client'
import { BaseTextFieldProps, TextFieldProps, Paper } from '@mui/material'
import { FC } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import SearchBox from './SearchBox'
import classNames from 'classnames'
import { NDKUser } from '@nostr-dev-kit/ndk'

export interface FilterProps extends BaseTextFieldProps {
  className?: string
  user?: NDKUser
  InputProps?: TextFieldProps['InputProps']
}

const Filter: FC<FilterProps> = ({ className, user, ...props }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const querySearch = searchParams.get('q') || ''

  return (
    <Paper
      className={classNames(
        'flex flex-1 items-center justify-end !shadow-none',
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
            value?.startsWith('g:') || value?.startsWith('b:') ? 1 : ''
          router.push(`${pathname}?q=${value}&map=${showMap}`)
        }}
        value={querySearch}
      />
    </Paper>
  )
}

export default Filter
