import { t } from './i18n'
import type { DayPoint, Forecast, HourPoint, Language, Place } from './types'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

const FORECAST_TTL = 10 * 60 * 1000
const GEOCODE_TTL = 30 * 60 * 1000

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'data'

export class WeatherError extends Error {
  kind: ApiErrorKind
  constructor(kind: ApiErrorKind, message: string) {
    super(message)
    this.name = 'WeatherError'
    this.kind = kind
  }
}

function requestSignal(signal: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort)
  }
  return {
    signal: controller.signal,
    done: () => {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    },
  }
}

async function requestJson(url: string, signal: AbortSignal | undefined, timeoutMs = 15000): Promise<unknown> {
  const { signal: request, done } = requestSignal(signal, timeoutMs)
  try {
    const response = await fetch(url, { signal: request, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new WeatherError('http', `Request failed with status ${response.status}`)
    return (await response.json()) as unknown
  } catch (error) {
    if (error instanceof WeatherError) throw error
    if (signal?.aborted) throw new WeatherError('network', 'Request cancelled')
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new WeatherError('timeout', 'The weather service took too long to answer')
    }
    throw new WeatherError('network', 'The weather service could not be reached')
  } finally {
    done()
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function numAt(holder: Record<string, unknown> | null, key: string, index: number): number | null {
  if (!holder) return null
  const list = holder[key]
  if (!Array.isArray(list)) return null
  return num(list[index])
}

function textAt(holder: Record<string, unknown> | null, key: string, index: number): string | null {
  if (!holder) return null
  const list = holder[key]
  if (!Array.isArray(list)) return null
  return text(list[index])
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeForecast(raw: unknown, requested: { latitude: number; longitude: number }): Forecast {
  const root = record(raw)
  if (!root) throw new WeatherError('data', 'The weather service answered with an unexpected document')

  const timezone = text(root.timezone)
  const utcOffsetSeconds = num(root.utc_offset_seconds) ?? 0
  const latitude = num(root.latitude) ?? requested.latitude
  const longitude = num(root.longitude) ?? requested.longitude
  const elevation = num(root.elevation)
  const timezoneAbbr = text(root.timezone_abbreviation)

  const current = record(root.current)
  const currentTemp = num(current?.temperature_2m)
  const currentTime = text(current?.time)
  if (!current || currentTemp == null || !currentTime) {
    throw new WeatherError('data', 'Current conditions are missing from the response')
  }

  const hourly = record(root.hourly)
  const daily = record(root.daily)

  const hourTimes = hourly?.time
  const hours: HourPoint[] = []
  if (hourly && Array.isArray(hourTimes) && Array.isArray(hourly.temperature_2m)) {
    for (let i = 0; i < hourTimes.length; i += 1) {
      const time = text(hourTimes[i])
      const temperature = numAt(hourly, 'temperature_2m', i)
      if (!time || temperature == null) continue
      const visibilityMeters = numAt(hourly, 'visibility', i)
      hours.push({
        time,
        temperature,
        apparent: numAt(hourly, 'apparent_temperature', i) ?? temperature,
        code: numAt(hourly, 'weather_code', i) ?? 0,
        isDay: numAt(hourly, 'is_day', i) !== 0,
        humidity: clamp(numAt(hourly, 'relative_humidity_2m', i) ?? 0, 0, 100),
        cloudCover: clamp(numAt(hourly, 'cloud_cover', i) ?? 0, 0, 100),
        precipProbability: clamp(numAt(hourly, 'precipitation_probability', i) ?? 0, 0, 100),
        precipitation: Math.max(0, numAt(hourly, 'precipitation', i) ?? 0),
        windSpeed: Math.max(0, numAt(hourly, 'wind_speed_10m', i) ?? 0),
        windDirection: clamp(numAt(hourly, 'wind_direction_10m', i) ?? 0, 0, 360),
        windGust: Math.max(0, numAt(hourly, 'wind_gusts_10m', i) ?? 0),
        // Open-Meteo reports visibility in metres; the interface works in km.
        visibility: visibilityMeters == null ? null : visibilityMeters / 1000,
        uv: numAt(hourly, 'uv_index', i),
        pressure: numAt(hourly, 'pressure_msl', i),
      })
    }
  }
  hours.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))

  const dayTimes = daily?.time
  const days: DayPoint[] = []
  if (Array.isArray(dayTimes)) {
    for (let i = 0; i < dayTimes.length; i += 1) {
      const date = text(dayTimes[i])
      const max = numAt(daily, 'temperature_2m_max', i)
      const min = numAt(daily, 'temperature_2m_min', i)
      if (!date || max == null || min == null) continue
      days.push({
        date: date.slice(0, 10),
        code: numAt(daily, 'weather_code', i) ?? 0,
        max,
        min,
        apparentMax: numAt(daily, 'apparent_temperature_max', i),
        apparentMin: numAt(daily, 'apparent_temperature_min', i),
        sunrise: textAt(daily, 'sunrise', i),
        sunset: textAt(daily, 'sunset', i),
        daylightSeconds: numAt(daily, 'daylight_duration', i),
        uvMax: numAt(daily, 'uv_index_max', i),
        precipSum: numAt(daily, 'precipitation_sum', i),
        precipProbabilityMax: numAt(daily, 'precipitation_probability_max', i),
        windMax: numAt(daily, 'wind_speed_10m_max', i),
        gustMax: numAt(daily, 'wind_gusts_10m_max', i),
        windDirection: numAt(daily, 'wind_direction_10m_dominant', i),
      })
    }
  }

  // Tolerate a missing daily block: synthesise an outlook from the hourly series.
  if (days.length === 0 && hours.length > 0) {
    const grouped = new Map<string, HourPoint[]>()
    for (const hour of hours) {
      const date = hour.time.slice(0, 10)
      const bucket = grouped.get(date)
      if (bucket) bucket.push(hour)
      else grouped.set(date, [hour])
    }
    for (const [date, points] of grouped) {
      const temps = points.map((p) => p.temperature)
      days.push({
        date,
        code: points[Math.floor(points.length / 2)]?.code ?? 0,
        max: Math.max(...temps),
        min: Math.min(...temps),
        apparentMax: Math.max(...points.map((p) => p.apparent)),
        apparentMin: Math.min(...points.map((p) => p.apparent)),
        sunrise: null,
        sunset: null,
        daylightSeconds: null,
        uvMax: Math.max(...points.map((p) => p.uv ?? 0)),
        precipSum: points.reduce((sum, p) => sum + p.precipitation, 0),
        precipProbabilityMax: Math.max(...points.map((p) => p.precipProbability)),
        windMax: Math.max(...points.map((p) => p.windSpeed)),
        gustMax: Math.max(...points.map((p) => p.windGust)),
        windDirection: points[0]?.windDirection ?? null,
      })
    }
    days.sort((a, b) => (a.date < b.date ? -1 : 1))
  }

  const currentHourKey = currentTime.slice(0, 13)
  const nearestHour = hours.find((h) => h.time.slice(0, 13) === currentHourKey) ?? null

  const now = {
    time: currentTime,
    temperature: currentTemp,
    apparent: num(current.apparent_temperature) ?? currentTemp,
    code: num(current.weather_code) ?? nearestHour?.code ?? 0,
    isDay: (num(current.is_day) ?? 1) !== 0,
    humidity: clamp(num(current.relative_humidity_2m) ?? nearestHour?.humidity ?? 0, 0, 100),
    cloudCover: clamp(num(current.cloud_cover) ?? nearestHour?.cloudCover ?? 0, 0, 100),
    precipitation: Math.max(0, num(current.precipitation) ?? nearestHour?.precipitation ?? 0),
    pressure: num(current.pressure_msl) ?? num(current.surface_pressure) ?? 1013,
    windSpeed: Math.max(0, num(current.wind_speed_10m) ?? nearestHour?.windSpeed ?? 0),
    windDirection: clamp(num(current.wind_direction_10m) ?? nearestHour?.windDirection ?? 0, 0, 360),
    windGust: Math.max(0, num(current.wind_gusts_10m) ?? nearestHour?.windGust ?? 0),
    visibility: nearestHour?.visibility ?? null,
    uv: nearestHour?.uv ?? null,
  }

  return {
    place: { latitude, longitude, elevation, timezone, timezoneAbbr, utcOffsetSeconds },
    now,
    hours,
    days,
    fetchedAt: Date.now(),
  }
}

const forecastCache = new Map<string, { at: number; data: Forecast }>()
const inflight = new Map<string, Promise<Forecast>>()

export function forecastCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`
}

export interface LoadOptions {
  force?: boolean
  signal?: AbortSignal
}

export async function loadForecast(latitude: number, longitude: number, options: LoadOptions = {}): Promise<Forecast> {
  const key = forecastCacheKey(latitude, longitude)
  const cached = forecastCache.get(key)
  if (!options.force && cached && Date.now() - cached.at < FORECAST_TTL) {
    return cached.data
  }
  const pending = inflight.get(key)
  if (pending) return pending

  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', latitude.toFixed(4))
  url.searchParams.set('longitude', longitude.toFixed(4))
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
  )
  url.searchParams.set(
    'hourly',
    [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'relative_humidity_2m',
      'visibility',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'is_day',
      'uv_index',
      'pressure_msl',
    ].join(','),
  )
  url.searchParams.set(
    'daily',
    [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'sunrise',
      'sunset',
      'daylight_duration',
      'uv_index_max',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
    ].join(','),
  )
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '8')
  url.searchParams.set('temperature_unit', 'celsius')
  url.searchParams.set('wind_speed_unit', 'kmh')
  url.searchParams.set('precipitation_unit', 'mm')

  const task = (async () => {
    let attempt = 0
    let lastError: unknown
    while (attempt < 2) {
      attempt += 1
      try {
        const raw = await requestJson(url.toString(), options.signal)
        const data = normalizeForecast(raw, { latitude, longitude })
        forecastCache.set(key, { at: Date.now(), data })
        return data
      } catch (error) {
        lastError = error
        if (options.signal?.aborted) throw error
        if (error instanceof WeatherError && error.kind === 'http' && attempt >= 2) throw error
        if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 650))
      }
    }
    throw lastError instanceof Error ? lastError : new WeatherError('network', 'The weather service could not be reached')
  })()

  inflight.set(key, task)
  try {
    return await task
  } finally {
    inflight.delete(key)
  }
}

function placeFromResult(raw: Record<string, unknown>): Place | null {
  const latitude = num(raw.latitude)
  const longitude = num(raw.longitude)
  const name = text(raw.name)
  const country = text(raw.country)
  if (latitude == null || longitude == null || !name || !country) return null
  const id = typeof raw.id === 'number' ? `geo-${raw.id}` : `pt-${latitude.toFixed(3)}-${longitude.toFixed(3)}`
  return {
    id,
    name,
    country,
    admin1: text(raw.admin1) ?? undefined,
    countryCode: text(raw.country_code) ?? undefined,
    latitude,
    longitude,
    timezone: text(raw.timezone) ?? undefined,
    population: num(raw.population) ?? undefined,
    elevation: num(raw.elevation) ?? undefined,
  }
}

const geocodeCache = new Map<string, { at: number; results: Place[] }>()

export async function searchPlaces(query: string, language: Language, signal?: AbortSignal): Promise<Place[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  const key = `${language}:${trimmed.toLowerCase()}`
  const cached = geocodeCache.get(key)
  if (cached && Date.now() - cached.at < GEOCODE_TTL) return cached.results

  const url = new URL(GEOCODE_URL)
  url.searchParams.set('name', trimmed)
  url.searchParams.set('count', '10')
  url.searchParams.set('language', language)
  url.searchParams.set('format', 'json')
  const raw = await requestJson(url.toString(), signal, 10000)
  const root = record(raw)
  const list = root?.results
  const results: Place[] = []
  if (Array.isArray(list)) {
    for (const item of list) {
      const itemRecord = record(item)
      if (!itemRecord) continue
      const place = placeFromResult(itemRecord)
      if (place) results.push(place)
    }
  }
  geocodeCache.set(key, { at: Date.now(), results })
  return results
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  language: Language,
  signal?: AbortSignal,
): Promise<Place | null> {
  const url = new URL(REVERSE_URL)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('localityLanguage', language)
  try {
    const raw = await requestJson(url.toString(), signal, 10000)
    const root = record(raw)
    if (!root) return null
    const name = text(root.city) ?? text(root.locality) ?? text(root.principalSubdivision)
    const country = text(root.countryName)
    if (!name || !country) return null
    return {
      id: `here-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
      name,
      country,
      admin1: text(root.principalSubdivision) ?? undefined,
      countryCode: text(root.countryCode) ?? undefined,
      latitude,
      longitude,
    }
  } catch {
    return null
  }
}

export function describeApiError(error: unknown, hasReading = false): string {
  if (error instanceof WeatherError) {
    switch (error.kind) {
      case 'timeout':
        return t(hasReading ? 'api.timeoutReading' : 'api.timeoutCold')
      case 'http':
        return t(hasReading ? 'api.httpReading' : 'api.httpCold')
      case 'data':
        return t(hasReading ? 'api.dataReading' : 'api.dataCold')
      default:
        return t(hasReading ? 'api.networkReading' : 'api.networkCold')
    }
  }
  return t(hasReading ? 'api.unknownReading' : 'api.unknownCold')
}
