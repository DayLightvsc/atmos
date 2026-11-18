import { useCallback, useEffect, useRef, useState } from 'react'
import { describeApiError, loadForecast } from '../lib/api'
import { readSnapshot, writeSnapshot } from '../lib/storage'
import type { Forecast, Place } from '../lib/types'

export type WeatherStatus = 'loading' | 'ready' | 'error'

interface WeatherState {
  data: Forecast | null
  status: WeatherStatus
  refreshing: boolean
  error: string | null
  refresh: () => void
}

const REFRESH_INTERVAL = 10 * 60 * 1000

export function useWeather(place: Place, onError?: (message: string) => void): WeatherState {
  const [data, setData] = useState<Forecast | null>(() => readSnapshot(place))
  const [status, setStatus] = useState<WeatherStatus>(() => (readSnapshot(place) ? 'ready' : 'loading'))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const alive = useRef(true)
  const dataRef = useRef<Forecast | null>(data)
  const onErrorRef = useRef(onError)
  const placeRef = useRef(place)

  dataRef.current = data
  placeRef.current = place
  onErrorRef.current = onError

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // Load whenever the station changes.
  useEffect(() => {
    const snapshot = readSnapshot(place)
    if (snapshot) {
      setData(snapshot)
      setStatus('ready')
      setRefreshing(true)
    } else {
      setData(null)
      setStatus('loading')
      setRefreshing(false)
    }
    setError(null)

    let live = true
    ;(async () => {
      try {
        const fresh = await loadForecast(place.latitude, place.longitude)
        if (!live || !alive.current) return
        setData(fresh)
        setStatus('ready')
        setRefreshing(false)
        setError(null)
        writeSnapshot(place, fresh)
      } catch (err) {
        if (!live || !alive.current) return
        const message = describeApiError(err, dataRef.current != null)
        setError(message)
        setRefreshing(false)
        setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'))
        onErrorRef.current?.(message)
      }
    })()

    return () => {
      live = false
    }
  }, [place])

  const refresh = useCallback(async () => {
    const current = placeRef.current
    setRefreshing(true)
    setError(null)
    try {
      const fresh = await loadForecast(current.latitude, current.longitude, { force: true })
      if (!alive.current) return
      setData(fresh)
      setStatus('ready')
      writeSnapshot(current, fresh)
    } catch (err) {
      if (!alive.current) return
      const message = describeApiError(err, dataRef.current != null)
      setError(message)
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'))
      onErrorRef.current?.(message)
    } finally {
      if (alive.current) setRefreshing(false)
    }
  }, [])

  // Keep the reading alive while the tab is open; skip work in hidden tabs and
  // catch up as soon as the reader returns.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const current = dataRef.current
      const age = current ? Date.now() - current.fetchedAt : Infinity
      if (age > REFRESH_INTERVAL - 30000) void refresh()
    }, 60000)

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const current = dataRef.current
      if (!current || Date.now() - current.fetchedAt > REFRESH_INTERVAL) void refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  return { data, status, refreshing, error, refresh: () => void refresh() }
}
