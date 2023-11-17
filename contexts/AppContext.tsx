'use client'
import {
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { NostrContext } from '@/contexts/NostrContext'
import { ErrorCode } from '@/constants/app'
import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material'

export enum ProfileActionType {
  View = 0,
}
export enum EventActionType {
  Create = 0,
  Delete = 1,
  Repost = 2,
  Quote = 3,
  Comment = 4,
  React = 5,
  Zap = 6,
  View = 7,
}

export interface ProfileAction {
  type: ProfileActionType
  hexpubkey: string
  options?: any
}
export interface ProfileActionOptions {
  type: ProfileActionType
  hexpubkey: string
  options?: any
}
export interface EventAction {
  type: EventActionType
  event?: NDKEvent
  options?: any
}
export interface EventActionOptions {
  type: EventActionType
  event?: NDKEvent | string
  options?: any
}
export interface AppSnackbarProps extends SnackbarProps {
  slotProps?: { alert?: AlertProps }
}

export interface AppContextProps {
  profileAction?: ProfileAction
  setProfileAction: (profileAction?: ProfileActionOptions) => void
  eventAction?: EventAction
  setEventAction: (eventAction?: EventActionOptions) => void
  showSnackbar: (message: string, props?: AppSnackbarProps) => void
  hideSnackbar: () => void
  backToPreviosModalAction: (group: 'profile' | 'event') => void
  clearActions: () => void
}

export const AppContext = createContext<AppContextProps>({
  setProfileAction: () => {},
  setEventAction: () => {},
  showSnackbar: () => {},
  hideSnackbar: () => {},
  backToPreviosModalAction: () => {},
  clearActions: () => {},
})

export const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { getEvent } = useContext(NostrContext)
  const [profileAction, _setProfileAction] = useState<ProfileAction>()
  const [eventAction, _setEventAction] = useState<EventAction>()
  const [modalActionHistory, setModalActionHistory] = useState<
    {
      group: 'profile' | 'event'
      action: EventAction | ProfileAction
    }[]
  >([])
  const [{ slotProps, ...snackProps }, setSnackProps] =
    useState<AppSnackbarProps>({
      anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
    })
  useEffect(() => {
    if (!profileAction && !eventAction) {
      setModalActionHistory([])
      document.body.style.overflowY = ''
    } else {
      document.body.style.overflowY = 'hidden'
    }
  }, [eventAction, profileAction])
  const setProfileAction = useCallback(
    async (profileAction?: ProfileActionOptions) => {
      if (!profileAction) {
        _setProfileAction(undefined)
        return
      }
      try {
        _setProfileAction(profileAction)
        _setEventAction(undefined)
        if (profileAction.type === ProfileActionType.View) {
          const _modalActionHistory = [...modalActionHistory]
          const latestModalAction =
            _modalActionHistory[_modalActionHistory.length - 1]
          if (
            latestModalAction?.group === 'profile' &&
            latestModalAction.action.type === profileAction.type &&
            latestModalAction.action.hexpubkey === profileAction.hexpubkey
          ) {
            _modalActionHistory.pop()
          }
          setModalActionHistory([
            ..._modalActionHistory,
            {
              group: 'profile',
              action: profileAction,
            },
          ])
        }
      } catch (error) {
        console.log('error', error)
      }
    },
    [modalActionHistory],
  )
  const setEventAction = useCallback(
    async (eventAction?: EventActionOptions) => {
      if (!eventAction) {
        _setEventAction(undefined)
        return
      }
      try {
        let event = eventAction.event
        if (typeof event === 'string') {
          const _event = await getEvent(event)
          if (!_event) {
            throw new Error(ErrorCode.EventNotFound)
          }
          event = _event
        }
        _setEventAction({
          ...eventAction,
          event,
        })
        _setProfileAction(undefined)
        if (eventAction.type === EventActionType.View) {
          const _modalActionHistory = [...modalActionHistory]
          const latestModalAction =
            _modalActionHistory[_modalActionHistory.length - 1]
          if (
            latestModalAction?.group === 'event' &&
            latestModalAction.action.type === eventAction.type &&
            latestModalAction.action.event?.id ===
              (eventAction.event as NDKEvent).id
          ) {
            _modalActionHistory.pop()
          }
          setModalActionHistory([
            ..._modalActionHistory,
            {
              group: 'event',
              action: {
                ...eventAction,
                event,
              },
            },
          ])
        }
      } catch (error) {
        console.log('error', error)
      }
    },
    [getEvent, modalActionHistory],
  )

  const handleClose = useCallback(
    (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === 'clickaway') {
        return
      }
      setSnackProps((prev) => ({ ...prev, open: false }))
    },
    [],
  )
  const showSnackbar = useCallback(
    (message: string, props?: Omit<AppSnackbarProps, 'message'>) => {
      setSnackProps((prev) => ({
        ...prev,
        autoHideDuration: 5000,
        ...props,
        open: true,
        message,
      }))
    },
    [],
  )
  const hideSnackbar = useCallback(() => {
    handleClose()
  }, [handleClose])
  const backToPreviosModalAction = useCallback(
    (group: 'profile' | 'event') => {
      const _modalActionHistory = [...modalActionHistory]
      switch (group) {
        case 'profile':
          if (profileAction?.type === ProfileActionType.View) {
            _modalActionHistory.pop()
          }
          break
        case 'event':
          if (eventAction?.type === EventActionType.View) {
            _modalActionHistory.pop()
          }
          break
      }
      if (_modalActionHistory.length) {
        setModalActionHistory(_modalActionHistory)
        const latestModalAction =
          _modalActionHistory[_modalActionHistory.length - 1]
        switch (latestModalAction.group) {
          case 'profile':
            _setProfileAction(latestModalAction.action as ProfileAction)
            _setEventAction(undefined)
            break
          case 'event':
            _setEventAction(latestModalAction.action as EventAction)
            _setProfileAction(undefined)
            break
        }
      } else {
        _setProfileAction(undefined)
        _setEventAction(undefined)
      }
    },
    [eventAction?.type, modalActionHistory, profileAction?.type],
  )
  const clearActions = useCallback(() => {
    _setProfileAction(undefined)
    _setEventAction(undefined)
  }, [])

  const value = useMemo((): AppContextProps => {
    return {
      profileAction,
      setProfileAction,
      eventAction,
      setEventAction,
      showSnackbar,
      hideSnackbar,
      backToPreviosModalAction,
      clearActions,
    }
  }, [
    profileAction,
    setProfileAction,
    eventAction,
    setEventAction,
    showSnackbar,
    hideSnackbar,
    backToPreviosModalAction,
    clearActions,
  ])

  useEffect(() => {
    const wakeLockSwitch = document.querySelector('#wake-lock')

    let wakeLock: WakeLockSentinel | undefined

    const releaseHandle = () => {
      console.log('Wake Lock was released')
    }
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen')
        wakeLock.addEventListener('release', releaseHandle)
        console.log('Wake Lock is active')
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`)
      }
    }

    const releaseWakeLock = async () => {
      console.log('releasing wakeLock')

      await wakeLock?.release()
      wakeLock = undefined
    }

    const checkWakeLockDetail = ({ detail }: any) => {
      const { checked } = detail
      checked ? requestWakeLock() : releaseWakeLock()
    }

    wakeLockSwitch?.addEventListener('change', checkWakeLockDetail)
    return () => {
      wakeLockSwitch?.removeEventListener('change', checkWakeLockDetail)
      wakeLock?.removeEventListener('release', releaseHandle)
    }
  }, [])
  return (
    <AppContext.Provider value={value}>
      {children}
      <Snackbar onClose={handleClose} {...snackProps}>
        <Alert
          {...slotProps?.alert}
          onClose={handleClose}
          severity={slotProps?.alert?.severity || 'warning'}
          sx={{ width: '100%' }}
        >
          {snackProps?.message}
        </Alert>
      </Snackbar>
    </AppContext.Provider>
  )
}
