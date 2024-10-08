import { useEffect } from 'react'
import { useMapContext } from '@/contexts/MapContext'
import maplibregl from 'maplibre-gl'

export type MapEventCallback = (evt: maplibregl.MapLibreEvent) => void
export type MapMouseEventCallback = (evt: maplibregl.MapMouseEvent) => void

// const geoControl = new maplibregl.GeolocateControl({
//   positionOptions: { enableHighAccuracy: true },
//   trackUserLocation: true,
// })
const attributetion = new maplibregl.AttributionControl()

export function useMapLibre(
  ref: React.RefObject<HTMLElement>,
  opts?: Omit<maplibregl.MapOptions, 'container'>,
) {
  const mapContext = useMapContext()

  useEffect(() => {
    if (mapContext.map) return
    if (!ref.current) return
    console.debug('Create Map Instance')
    const map = new maplibregl.Map({
      style: '',
      // ...(opts ? opts : { style: "https://demotiles.maplibre.org/style.json" }),
      container: ref.current,
      antialias: false,
      attributionControl: false,
    })
    mapContext.setMap(map)
  }, [ref, mapContext.map])

  // const navigateContol = useMemo(() => {
  //   console.debug('Create NavigationControl')
  //   return new maplibregl.NavigationControl()
  // }, [])

  useEffect(() => {
    if (!mapContext.map) return
    // if (!mapContext.map.hasControl(navigateContol)) {
    //   mapContext.map?.addControl(navigateContol, 'bottom-right')
    // }
    // if (!mapContext.map.hasControl(geoControl)) {
    //   mapContext.map?.addControl(geoControl, 'bottom-right')
    // }
    // if (!mapContext.map.hasControl(attributetion)) {
    //   mapContext.map?.addControl(attributetion, 'bottom-left')
    // }
  }, [mapContext.map])

  useEffect(() => {
    if (!mapContext.map || !opts?.style) return
    mapContext.map.setStyle(opts.style)
  }, [mapContext.map, opts?.style])

  useEffect(() => {
    if (!mapContext.map || !opts?.bounds) return
    if (Array.isArray(opts?.bounds) && (!opts?.bounds[0] || !opts?.bounds[1]))
      return
    try {
      mapContext.map.fitBounds(opts.bounds, {
        animate: false,
        linear: false,
        padding: 16,
      })
    } catch (err) {}
  }, [mapContext.map, opts?.bounds])

  useEffect(() => {
    if (!mapContext.map || !opts?.center) return
    mapContext.map.setCenter(opts.center)
  }, [mapContext.map, opts?.center])

  useEffect(() => {
    if (!mapContext.map || !opts?.zoom) return
    mapContext.map.setZoom(opts.zoom)
  }, [mapContext.map, opts?.zoom])

  return mapContext
}
