'use client'
import { useAppStore } from '@/contexts/AppContext'
import { useShallow } from 'zustand/react/shallow'

export const useAction = () => {
  return useAppStore(
    useShallow((state) => ({
      setPofileAction: state.setProfileAction,
      setEventAction: state.setEventAction,
      eventAction: state.eventAction,
      profileAction: state.profileAction,
      backToPreviosModalAction: state.backToPreviosModalAction,
      clearActions: state.clearActions,
    })),
  )
}
