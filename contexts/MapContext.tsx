'use client'
import { createContext, PropsWithChildren, useContext } from 'react'
import { createStore, useStore } from 'zustand'

export type MapType = maplibregl.Map
export interface MapContextValue<T = MapType> {
  map?: T
  mapLoaded?: boolean
}

export interface MapContextFunction<T = MapType> {
  unsetMap: () => void
  setMap: (map?: T) => void
  setMapLoaded: (loaded: boolean) => void
}

export type MapContextProps<T = MapType> = MapContextValue<T> &
  MapContextFunction<T>

export interface MapProviderProps<T = MapType>
  extends MapContextValue<T>,
    PropsWithChildren {}

export const mapStore = createStore<MapContextProps<MapType>>()((set) => ({
  map: undefined,
  mapLoaded: false,
  unsetMap: () =>
    set((state) => ({ ...state, mapLoaded: false, map: undefined })),
  setMap: (map) => set((state) => ({ ...state, map })),
  setMapLoaded: (loaded) => set((state) => ({ ...state, mapLoaded: loaded })),
}))

export const MapContext = createContext<typeof mapStore>(mapStore)

export function MapContextProvider({ children }: MapProviderProps) {
  return <MapContext.Provider value={mapStore}>{children}</MapContext.Provider>
}

export const useMapContext = () => {
  const mapStore = useContext(MapContext)
  return useStore(mapStore)
}
