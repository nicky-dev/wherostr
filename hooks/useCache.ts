'use client'
import { useNostrStore } from '@/contexts/NostrContext'
import usePromise from 'react-use-promise'

export const useUserCache = (hexpubkey: string) => {
  const { getUser } = useNostrStore()
  return usePromise(getUser(hexpubkey), [hexpubkey])
}

export const useEventCache = (id?: string) => {
  const { getEvent } = useNostrStore()
  return usePromise(getEvent(id), [id])
}
