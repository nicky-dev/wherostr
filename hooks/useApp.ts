'use client'
import { useAppStore } from '@/contexts/AppContext'
import { useMemo } from 'react'

export const useAction = () => {
  const {
    setProfileAction,
    setEventAction,
    eventAction,
    profileAction,
    backToPreviosModalAction,
    clearActions,
  } = useAppStore()
  return useMemo(() => {
    return {
      setProfileAction,
      setEventAction,
      eventAction,
      profileAction,
      backToPreviosModalAction,
      clearActions,
    }
  }, [
    setProfileAction,
    setEventAction,
    eventAction,
    profileAction,
    backToPreviosModalAction,
    clearActions,
  ])
}
