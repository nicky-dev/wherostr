import { LoadingButton, LoadingButtonProps } from '@mui/lab'
import { Hidden, Tooltip } from '@mui/material'
import classNames from 'classnames'
import { FC } from 'react'

const ResponsiveButton: FC<LoadingButtonProps> = (props) => {
  const { startIcon, children, className, ...other } = props
  return (
    <>
      <LoadingButton
        {...other}
        startIcon={startIcon}
        className={classNames(className, 'min-w-[auto]')}
      >
        {children}
      </LoadingButton>
    </>
  )
}

export default ResponsiveButton
