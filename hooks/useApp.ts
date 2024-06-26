'use client'
import { AppContext } from '@/contexts/AppContext'
import { useContext, useMemo } from 'react'

export const useAction = () => {
  const {
    showSnackbar,
    hideSnackbar,
    setProfileAction,
    setEventAction,
    eventAction,
    profileAction,
    backToPreviosModalAction,
    clearActions,
  } = useContext(AppContext)
  return useMemo(() => {
    return {
      showSnackbar,
      hideSnackbar,
      setProfileAction,
      setEventAction,
      eventAction,
      profileAction,
      backToPreviosModalAction,
      clearActions,
    }
  }, [
    showSnackbar,
    hideSnackbar,
    setProfileAction,
    setEventAction,
    eventAction,
    profileAction,
    backToPreviosModalAction,
    clearActions,
  ])
}
