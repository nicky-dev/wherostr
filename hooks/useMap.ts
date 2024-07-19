'use client'
import { MapContext } from '@/contexts/MapContext'
import { useContext } from 'react'
import { useStore } from 'zustand'

export const useMap = () => {
  const store = useContext(MapContext)
  return useStore(store, (state) => state.map)
}

export const useMapLoaded = () => {
  const store = useContext(MapContext)
  return useStore(store, (state) => state.mapLoaded)
}
