'use client'
import {
  createContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type MapType = maplibregl.Map
export interface MapContextValue<T = MapType> {
  map?: T
  mapLoaded?: boolean
}

export interface MapContextFunction<T = MapType> {
  setMap?: (map?: T) => void
}

export type MapContextProps<T = MapType> = MapContextValue<T> &
  MapContextFunction<T>

const defaultValue: MapContextProps = {
  map: undefined,
  mapLoaded: false,
  setMap: (map) => {},
}

export interface MapProviderProps<T = MapType>
  extends MapContextValue<T>,
    PropsWithChildren {}

export const MapContext = createContext<MapContextProps>(defaultValue)

export function MapContextProvider({
  children,
  map: defaultMap,
}: MapProviderProps) {
  const [map, setMap] = useState<MapType | undefined>(defaultMap)
  const [mapLoaded, setMapLoaded] = useState(map?.isStyleLoaded() || false)

  useEffect(() => {
    if (!map) return
    const handler = (evt: maplibregl.MapLibreEvent) => {
      setMapLoaded(true)
    }
    if (!map.isStyleLoaded()) {
      map.on('style.load', handler)
    }
    return () => {
      map.off('style.load', handler)
    }
  }, [map])

  const contextValue = useMemo<MapContextProps>(() => {
    return {
      map,
      mapLoaded,
      setMap,
    }
  }, [map, mapLoaded])

  return (
    <MapContext.Provider value={contextValue}>{children}</MapContext.Provider>
  )
}
