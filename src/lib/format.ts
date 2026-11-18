import { getLanguage, t } from './i18n'
import { formatLength } from './time'
import type { Units } from './types'

export function temperature(celsius: number, units: Units): number {
  const value = units === 'imperial' ? (celsius * 9) / 5 + 32 : celsius
  return Math.round(value) || 0
}

export function temperatureExact(celsius: number, units: Units): number {
  const value = units === 'imperial' ? (celsius * 9) / 5 + 32 : celsius
  return value
}

export function tempUnit(units: Units): string {
  return units === 'imperial' ? '°F' : '°C'
}

export function tempLetter(units: Units): string {
  return units === 'imperial' ? 'F' : 'C'
}

export function speed(kmh: number, units: Units): { value: number; unit: string } {
  return units === 'imperial'
    ? { value: Math.round(kmh * 0.621371), unit: t('unit.mph') }
    : { value: Math.round(kmh), unit: t('unit.kmh') }
}

export function distance(km: number | null | undefined, units: Units): { value: string; unit: string } {
  const unit = units === 'imperial' ? t('unit.mi') : t('unit.km')
  if (km == null || !Number.isFinite(km)) return { value: '—', unit }
  const value = units === 'imperial' ? km * 0.621371 : km
  if (value >= 100) return { value: String(Math.round(value)), unit }
  if (value >= 10) return { value: value.toFixed(0), unit }
  return { value: value.toFixed(1), unit }
}

export function rain(mm: number | null | undefined, units: Units): { value: string; unit: string } {
  const unit = units === 'imperial' ? t('unit.in') : t('unit.mm')
  if (mm == null || !Number.isFinite(mm)) return { value: '—', unit }
  if (units === 'imperial') {
    const inches = mm / 25.4
    if (inches > 0 && inches < 0.01) return { value: '<0.01', unit }
    return { value: inches.toFixed(2), unit }
  }
  if (mm > 0 && mm < 0.1) return { value: '0.1', unit }
  return { value: mm >= 10 ? mm.toFixed(0) : mm.toFixed(1), unit }
}

export function pressure(hPa: number): string {
  return Math.round(hPa).toString()
}

export function visibility(km: number | null | undefined, units: Units): { value: string; unit: string } {
  const unit = units === 'imperial' ? t('unit.mi') : t('unit.km')
  if (km == null || !Number.isFinite(km)) return { value: '—', unit }
  if (units === 'imperial') {
    const mi = km * 0.621371
    return { value: mi >= 10 ? Math.round(mi).toString() : mi.toFixed(1), unit }
  }
  return { value: km >= 10 ? Math.round(km).toString() : km.toFixed(1), unit }
}

const CARDINALS_EN = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const CARDINALS_RU = ['С', 'ССВ', 'СВ', 'ВСВ', 'В', 'ВЮВ', 'ЮВ', 'ЮЮВ', 'Ю', 'ЮЮЗ', 'ЮЗ', 'ЗЮЗ', 'З', 'ЗСЗ', 'СЗ', 'ССЗ']

export function cardinal(degrees: number | null | undefined): string {
  if (degrees == null || !Number.isFinite(degrees)) return '—'
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16
  return getLanguage() === 'ru' ? CARDINALS_RU[index] : CARDINALS_EN[index]
}

export function percent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${Math.round(value)}%`
}

export function uv(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value >= 10 ? Math.round(value).toString() : (Math.round(value * 10) / 10).toFixed(value < 1 ? 1 : 0)
}

export function coordinates(latitude: number, longitude: number): string {
  const north = getLanguage() === 'ru' ? 'С' : 'N'
  const south = getLanguage() === 'ru' ? 'Ю' : 'S'
  const east = getLanguage() === 'ru' ? 'В' : 'E'
  const west = getLanguage() === 'ru' ? 'З' : 'W'
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? north : south}`
  const lon = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? east : west}`
  return `${lat} · ${lon}`
}

export function elevation(meters: number | null | undefined, units: Units): string {
  if (meters == null || !Number.isFinite(meters)) return '—'
  return units === 'imperial'
    ? `${Math.round(meters * 3.28084)} ${t('unit.ft')}`
    : `${Math.round(meters)} ${t('unit.m')}`
}

export function population(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}${t('unit.million')}`
  if (value >= 1000) return `${Math.round(value / 1000)}${t('unit.thousand')}`
  return String(value)
}

export function dayLengthLabel(seconds: number | null | undefined): string {
  return formatLength(seconds)
}

export function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}
