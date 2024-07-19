import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material'
import { useCallback } from 'react'
import { create } from 'zustand'

interface AppSnackbarProps extends SnackbarProps {
  slotProps?: { alert?: AlertProps }
}

interface SnackbarStore {
  snackProps?: AppSnackbarProps
  showSnackbar: (message: string, props?: AppSnackbarProps) => void
  hideSnackbar: () => void
}

export const useSnackbar = create<SnackbarStore>((set) => ({
  snackProps: {},
  showSnackbar: (message: string, props?: AppSnackbarProps) => {
    set((prev) => ({
      snackProps: {
        ...prev.snackProps,
        autoHideDuration: 5000,
        ...props,
        open: true,
        message,
      },
    }))
  },
  hideSnackbar: () => {
    set((prev) => ({
      snackProps: {
        ...prev.snackProps,
        open: false,
      },
    }))
  },
}))

export default function SnackbarAlert() {
  const { hideSnackbar, snackProps } = useSnackbar()
  const { slotProps, message, ...props } = snackProps || {}
  const handleClose = useCallback(
    (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === 'clickaway') {
        return
      }
      hideSnackbar()
    },
    [hideSnackbar],
  )
  return (
    <Snackbar onClose={handleClose} {...props}>
      <Alert
        {...slotProps?.alert}
        onClose={handleClose}
        severity={slotProps?.alert?.severity || 'warning'}
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}
