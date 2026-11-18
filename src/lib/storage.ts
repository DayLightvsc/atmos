import type { Forecast, Language, Place, Units } from './types'
import { forecastCacheKey } from './api'

const PREFIX = 'atmos.v1.'

export const DEFAULT_PLACE: Place = {
  id: 'geo-3413829',
  name: 'Reykjavík',
  country: 'Iceland',
  countryCode: 'IS',
  admin1: 'Capital Region',
  latitude: 64.1466,
  longitude: -21.9426,
  timezone: 'Atlantic/Reykjavik',
  population: 131136,
  elevation: 61,
}

export interface Preferences {
  lastPlace: Place | null
  favorites: Place[]
  recent: Place[]
  units: Units
  language: Language
}

export const DEFAULT_PREFERENCES: Preferences = {
  lastPlace: null,
  favorites: [],
  recent: [],
  units: 'metric',
  language: 'ru',
}

function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.country === 'string' &&
    typeof p.latitude === 'number' &&
    Number.isFinite(p.latitude) &&
    typeof p.longitude === 'number' &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  )
}

function sanitizePlace(value: unknown): Place | null {
  if (!isPlace(value)) return null
  const p = value as unknown as Place
  return {
    id: p.id,
    name: p.name,
    country: p.country,
    countryCode: typeof p.countryCode === 'string' ? p.countryCode : undefined,
    admin1: typeof p.admin1 === 'string' ? p.admin1 : undefined,
    latitude: p.latitude,
    longitude: p.longitude,
    timezone: typeof p.timezone === 'string' ? p.timezone : undefined,
    population: typeof p.population === 'number' ? p.population : undefined,
    elevation: typeof p.elevation === 'number' ? p.elevation : undefined,
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable (private browsing, quota). The app still works in memory.
  }
}

export function loadPreferences(): Preferences {
  const raw = read<Record<string, unknown>>('preferences')
  if (!raw) return { ...DEFAULT_PREFERENCES }
  const favorites = Array.isArray(raw.favorites)
    ? raw.favorites.map(sanitizePlace).filter((p): p is Place => p != null).slice(0, 12)
    : []
  const recent = Array.isArray(raw.recent)
    ? raw.recent.map(sanitizePlace).filter((p): p is Place => p != null).slice(0, 6)
    : []
  return {
    lastPlace: sanitizePlace(raw.lastPlace),
    favorites,
    recent,
    units: raw.units === 'imperial' ? 'imperial' : 'metric',
    // Preferences written before the bilingual interface existed load in Russian.
    language: raw.language === 'en' ? 'en' : 'ru',
  }
}

export function savePreferences(prefs: Preferences): void {
  write('preferences', prefs)
}

interface Snapshot {
  key: string
  data: Forecast
}

export function readSnapshot(place: Place): Forecast | null {
  const snapshot = read<Snapshot>('snapshot')
  if (!snapshot || !snapshot.data) return null
  const key = forecastCacheKey(place.latitude, place.longitude)
  if (snapshot.key !== key) return null
  const data = snapshot.data
  const valid =
    typeof data.fetchedAt === 'number' &&
    data.now != null &&
    typeof data.now.temperature === 'number' &&
    Array.isArray(data.hours) &&
    Array.isArray(data.days) &&
    data.place != null &&
    typeof data.place.utcOffsetSeconds === 'number'
  return valid ? data : null
}

export function writeSnapshot(place: Place, data: Forecast): void {
  write('snapshot', { key: forecastCacheKey(place.latitude, place.longitude), data })
}

export function rememberPlace(prefs: Preferences, place: Place): Preferences {
  const recent = [place, ...prefs.recent.filter((p) => p.id !== place.id)].slice(0, 6)
  return { ...prefs, lastPlace: place, recent }
}

export function toggleFavorite(prefs: Preferences, place: Place): { prefs: Preferences; added: boolean } {
  const exists = prefs.favorites.some((p) => p.id === place.id)
  const favorites = exists
    ? prefs.favorites.filter((p) => p.id !== place.id)
    : [...prefs.favorites, place].slice(0, 12)
  return { prefs: { ...prefs, favorites }, added: !exists }
}
