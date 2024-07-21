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
import { ErrorCode } from '@/constants/app'
import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material'
import { create } from 'zustand'
import { useNostrStore } from './NostrContext'
import { useSnackbar } from '@/components/SnackbarAlert'

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

interface AppStore {
  modalActionHistory: {
    group: 'profile' | 'event'
    action: EventAction | ProfileAction
  }[]
  setModalActionHistory: (
    modalActionHistory: {
      group: 'profile' | 'event'
      action: EventAction | ProfileAction
    }[],
  ) => void
  profileAction?: ProfileAction
  setProfileAction: (profileAction?: ProfileActionOptions) => void
  eventAction?: EventAction
  setEventAction: (eventAction?: EventAction | EventActionOptions) => void
  backToPreviosModalAction: (group: 'profile' | 'event') => void
  clearActions: () => void
}

export const useAppStore = create<AppStore>()((set, get) => ({
  modalActionHistory: [],
  setModalActionHistory: (modalActionHistory) => set({ modalActionHistory }),
  profileAction: undefined,
  setProfileAction: async (profileAction?: ProfileAction) => {
    if (!profileAction) {
      set((state) => ({ ...state, profileAction: undefined }))
      return
    }
    try {
      const modalActionHistory = get().modalActionHistory
      set((state) => ({ ...state, profileAction, eventAction: undefined }))
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
        set((state) => ({
          ...state,
          modalActionHistory: [
            ..._modalActionHistory,
            {
              group: 'profile',
              action: profileAction,
            },
          ],
        }))
      }
    } catch (error) {
      console.log('error', error)
    }
  },
  eventAction: undefined,
  setEventAction: async (eventAction) => {
    if (!eventAction) {
      set((state) => ({ ...state, eventAction: undefined }))
      return
    }
    try {
      const { getEvent } = useNostrStore.getState()
      let event = eventAction.event
      if (typeof event === 'string') {
        const _event = await getEvent(event)
        if (!_event) {
          throw new Error(ErrorCode.EventNotFound)
        }
        event = _event
      }
      set((state) => ({
        ...state,
        eventAction: {
          ...eventAction,
          event: event as NDKEvent,
        },
        profileAction: undefined,
      }))
      if (eventAction.type === EventActionType.View) {
        const { modalActionHistory } = get()
        const _modalActionHistory = [...modalActionHistory]
        const latestModalAction =
          _modalActionHistory[_modalActionHistory.length - 1]
        if (
          latestModalAction?.group === 'event' &&
          latestModalAction.action.type === eventAction.type &&
          (latestModalAction.action.event as NDKEvent)?.id ===
            (eventAction.event as NDKEvent).id
        ) {
          _modalActionHistory.pop()
        }
        set((state) => ({
          ...state,
          modalActionHistory: [
            ..._modalActionHistory,
            {
              group: 'event',
              action: {
                ...eventAction,
                event: event as NDKEvent,
              },
            },
          ],
        }))
      }
    } catch (error) {
      console.log('error', error)
    }
  },
  backToPreviosModalAction: (group: 'profile' | 'event') => {
    const { modalActionHistory, profileAction, eventAction } = get()
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
      const nextState = {
        modalActionHistory: _modalActionHistory,
        profileAction: undefined,
        eventAction: undefined,
      }
      const latestModalAction =
        _modalActionHistory[_modalActionHistory.length - 1]
      switch (latestModalAction.group) {
        case 'profile':
          nextState.profileAction = latestModalAction.action as any
          break
        case 'event':
          nextState.eventAction = latestModalAction.action as any
          break
      }
      set((state) => ({
        ...state,
        ...nextState,
      }))
    } else {
      set((state) => ({
        ...state,
        profileAction: undefined,
        eventAction: undefined,
      }))
    }
  },
  clearActions: () => {
    set((state) => ({
      ...state,
      profileAction: undefined,
      eventAction: undefined,
    }))
  },
}))

export const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { profileAction, eventAction, setModalActionHistory } = useAppStore()

  const {} = useSnackbar()

  useEffect(() => {
    if (!profileAction && !eventAction) {
      setModalActionHistory([])
      document.body.style.overflowY = ''
    } else {
      document.body.style.overflowY = 'hidden'
    }
  }, [eventAction, profileAction])

  useEffect(() => {
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
    requestWakeLock()
    return () => {
      releaseWakeLock()
    }
  }, [])
  return children
}
