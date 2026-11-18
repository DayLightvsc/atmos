import { getLanguage } from './i18n'
import type { WeatherGroup } from './types'

export interface Condition {
  code: number
  label: string
  short: string
  group: WeatherGroup
}

const CONDITIONS: Record<number, Condition> = {
  0: { code: 0, label: 'Clear sky', short: 'Clear', group: 'clear' },
  1: { code: 1, label: 'Mainly clear', short: 'Mainly clear', group: 'clear' },
  2: { code: 2, label: 'Partly cloudy', short: 'Partly cloudy', group: 'clear' },
  3: { code: 3, label: 'Overcast', short: 'Overcast', group: 'cloud' },
  45: { code: 45, label: 'Fog', short: 'Fog', group: 'fog' },
  48: { code: 48, label: 'Rime fog', short: 'Rime fog', group: 'fog' },
  51: { code: 51, label: 'Light drizzle', short: 'Drizzle', group: 'drizzle' },
  53: { code: 53, label: 'Moderate drizzle', short: 'Drizzle', group: 'drizzle' },
  55: { code: 55, label: 'Dense drizzle', short: 'Drizzle', group: 'drizzle' },
  56: { code: 56, label: 'Freezing drizzle', short: 'Icy drizzle', group: 'drizzle' },
  57: { code: 57, label: 'Freezing drizzle', short: 'Icy drizzle', group: 'drizzle' },
  61: { code: 61, label: 'Light rain', short: 'Light rain', group: 'rain' },
  63: { code: 63, label: 'Rain', short: 'Rain', group: 'rain' },
  65: { code: 65, label: 'Heavy rain', short: 'Heavy rain', group: 'rain' },
  66: { code: 66, label: 'Freezing rain', short: 'Icy rain', group: 'rain' },
  67: { code: 67, label: 'Freezing rain', short: 'Icy rain', group: 'rain' },
  71: { code: 71, label: 'Light snow', short: 'Light snow', group: 'snow' },
  73: { code: 73, label: 'Snow', short: 'Snow', group: 'snow' },
  75: { code: 75, label: 'Heavy snow', short: 'Heavy snow', group: 'snow' },
  77: { code: 77, label: 'Snow grains', short: 'Snow grains', group: 'snow' },
  80: { code: 80, label: 'Light showers', short: 'Showers', group: 'rain' },
  81: { code: 81, label: 'Showers', short: 'Showers', group: 'rain' },
  82: { code: 82, label: 'Violent showers', short: 'Violent rain', group: 'rain' },
  85: { code: 85, label: 'Snow showers', short: 'Snow showers', group: 'snow' },
  86: { code: 86, label: 'Heavy snow showers', short: 'Heavy snow', group: 'snow' },
  95: { code: 95, label: 'Thunderstorm', short: 'Thunder', group: 'storm' },
  96: { code: 96, label: 'Thunderstorm with hail', short: 'Hail storm', group: 'storm' },
  99: { code: 99, label: 'Severe thunderstorm', short: 'Hail storm', group: 'storm' },
}

const RU_CONDITIONS: Record<number, { label: string; short: string }> = {
  0: { label: 'Ясно', short: 'Ясно' },
  1: { label: 'Преимущественно ясно', short: 'Почти ясно' },
  2: { label: 'Переменная облачность', short: 'Переменная облачность' },
  3: { label: 'Пасмурно', short: 'Пасмурно' },
  45: { label: 'Туман', short: 'Туман' },
  48: { label: 'Туман с изморозью', short: 'Изморозь' },
  51: { label: 'Слабая морось', short: 'Морось' },
  53: { label: 'Умеренная морось', short: 'Морось' },
  55: { label: 'Сильная морось', short: 'Морось' },
  56: { label: 'Ледяная морось', short: 'Ледяная морось' },
  57: { label: 'Ледяная морось', short: 'Ледяная морось' },
  61: { label: 'Небольшой дождь', short: 'Небольшой дождь' },
  63: { label: 'Дождь', short: 'Дождь' },
  65: { label: 'Сильный дождь', short: 'Сильный дождь' },
  66: { label: 'Ледяной дождь', short: 'Ледяной дождь' },
  67: { label: 'Ледяной дождь', short: 'Ледяной дождь' },
  71: { label: 'Небольшой снег', short: 'Небольшой снег' },
  73: { label: 'Снег', short: 'Снег' },
  75: { label: 'Сильный снег', short: 'Сильный снег' },
  77: { label: 'Снежная крупа', short: 'Снежная крупа' },
  80: { label: 'Небольшие ливни', short: 'Ливни' },
  81: { label: 'Ливни', short: 'Ливни' },
  82: { label: 'Сильные ливни', short: 'Сильный дождь' },
  85: { label: 'Снежные ливни', short: 'Снежные ливни' },
  86: { label: 'Сильные снежные ливни', short: 'Сильный снег' },
  95: { label: 'Гроза', short: 'Гроза' },
  96: { label: 'Гроза с градом', short: 'Гроза с градом' },
  99: { label: 'Сильная гроза с градом', short: 'Гроза с градом' },
}

const FALLBACK: Condition = { code: 0, label: 'Conditions unavailable', short: 'Unknown', group: 'cloud' }
const FALLBACK_RU = { label: 'Условия недоступны', short: 'Неизвестно' }

export function describeWeather(code: number | null | undefined): Condition {
  const base = code == null || !Number.isFinite(code) ? FALLBACK : CONDITIONS[code] ?? FALLBACK
  if (getLanguage() !== 'ru') return base
  if (code == null || !Number.isFinite(code) || !RU_CONDITIONS[code]) {
    return { ...base, ...FALLBACK_RU }
  }
  return { ...base, ...RU_CONDITIONS[code] }
}

export function isSnow(code: number | null | undefined): boolean {
  return describeWeather(code).group === 'snow'
}

export function isStorm(code: number | null | undefined): boolean {
  return describeWeather(code).group === 'storm'
}

export function isWet(code: number | null | undefined): boolean {
  const group = describeWeather(code).group
  return group === 'rain' || group === 'drizzle' || group === 'storm'
}

/** Collapse the eight WMO groups into the four visual moods the sky system knows. */
export function visualMood(group: WeatherGroup, cloudCover: number): 'clear' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm' {
  if (group === 'clear') return cloudCover >= 55 ? 'cloud' : 'clear'
  if (group === 'drizzle') return 'rain'
  return group
}

const UV_LABELS = {
  en: ['No reading', 'Low', 'Moderate', 'High', 'Very high', 'Extreme'],
  ru: ['Нет данных', 'Низкий', 'Умеренный', 'Высокий', 'Очень высокий', 'Экстремальный'],
}

export function uvLevel(uv: number | null | undefined): { label: string; tone: number } {
  let tone = 0
  if (uv != null) {
    if (uv < 3) tone = 1
    else if (uv < 6) tone = 2
    else if (uv < 8) tone = 3
    else if (uv < 11) tone = 4
    else tone = 5
  }
  return { label: UV_LABELS[getLanguage()][tone], tone }
}
