'use client'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { PropsWithChildren, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import classNames from 'classnames'
import { Box, Paper } from '@mui/material'
import { useMapLibre } from '@/hooks/useMaplibre'
import { useMapContext } from '@/contexts/MapContext'

const opts: Omit<maplibregl.MapOptions, 'container'> = {
  style:
    'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=XY1JQQskEOjc3SA5YEma',
  // style: {
  //   version: 8,
  //   name: 'Open Streets Map',
  //   sources: {
  //     osm: {
  //       type: 'raster',
  //       tiles: [
  //         'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  //         'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  //         'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
  //       ],
  //       tileSize: 256,
  //       attribution:
  //         "<a href='https://www.openstreetmap.org/'>&copy; OpenStreetMap Contributors</a>",
  //       maxzoom: 19,
  //     },
  //   },
  //   layers: [
  //     {
  //       id: 'basemap',
  //       type: 'raster',
  //       source: 'osm',
  //       layout: {
  //         visibility: 'visible',
  //       },
  //     },
  //   ],
  // },
  // bounds: [97.3758964376, 5.69138418215, 105.589038527, 20.4178496363],
}

export interface MapProps extends PropsWithChildren {
  className?: string
  onLoad?: (map: maplibregl.Map) => void
}

const MapLoad: React.FC<MapProps> = ({ children, className, onLoad }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapContext = useMapLibre(mapContainer, opts)

  useEffect(() => {
    if (!mapContext.map) return
    const handler = (evt: maplibregl.MapLibreEvent) => {
      mapContext.setMapLoaded(true)
    }
    if (!mapContext.map.isStyleLoaded()) {
      mapContext.map.on('style.load', handler)
    }
    return () => {
      try {
        if (!mapContext.map) return
        mapContext.map.off('style.load', handler)
        mapContext.map.remove()
        mapContext.unsetMap()
      } catch (err) {
        console.warn(err)
      }
    }
  }, [mapContext.map])

  return (
    <Box className={classNames('flex', className)}>
      <Box ref={mapContainer} className="flex-1">
        {children}
      </Box>
    </Box>
  )
}

export const MapView = dynamic(
  () => new Promise<React.FC<MapProps>>((resolve) => resolve(MapLoad)),
  {
    loading: () => <Paper className="fixed inset-0" />,
    ssr: false,
  },
)
