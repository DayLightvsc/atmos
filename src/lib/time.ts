import { localeOf, t } from './i18n'
import type { LocalStamp } from './types'

export interface StampParts {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
}

const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = localeOf()
  const key = `${locale}:${JSON.stringify(options)}`
  let cached = formatterCache.get(key)
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' })
    formatterCache.set(key, cached)
  }
  return cached
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function parseStamp(stamp: string | null | undefined): StampParts | null {
  if (!stamp) return null
  const m = STAMP_RE.exec(stamp)
  if (!m) return null
  const parts = {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  }
  if (!Number.isFinite(parts.year) || parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return null
  if (parts.hour > 23 || parts.minute > 59) return null
  return parts
}

export function stampFromDate(date: Date): LocalStamp {
  // Reads the UTC clock of `date`; used for wall-clock arithmetic.
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(
    date.getUTCMinutes(),
  )}`
}

export function stampFromParts(p: StampParts): LocalStamp {
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

/** Treats a locale-free stamp as if it were UTC so that arithmetic is clean. */
export function stampToMs(stamp: LocalStamp): number {
  const p = parseStamp(stamp)
  if (!p) return NaN
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
}

export function dateToStamp(dateStr: string, hour = 0, minute = 0): LocalStamp {
  return `${dateStr}T${pad(hour)}:${pad(minute)}`
}

export function wallClockParts(offsetSeconds: number, now: Date = new Date()): StampParts {
  const shifted = new Date(now.getTime() + offsetSeconds * 1000)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  }
}

export function currentStamp(offsetSeconds: number, now: Date = new Date()): LocalStamp {
  return stampFromParts(wallClockParts(offsetSeconds, now))
}

export function todayKey(offsetSeconds: number, now: Date = new Date()): string {
  const p = wallClockParts(offsetSeconds, now)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  dt.setUTCDate(dt.getUTCDate() + days)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

export function dateOf(stamp: LocalStamp): string {
  return stamp.slice(0, 10)
}

export function clockOf(stamp: LocalStamp): string {
  return stamp.slice(11, 16)
}

export function hourLabel(stamp: LocalStamp): string {
  return stamp.slice(11, 13)
}

export function minutesBetween(a: LocalStamp, b: LocalStamp): number {
  return (stampToMs(a) - stampToMs(b)) / 60000
}

export function formatClock(stamp: LocalStamp | null | undefined): string {
  if (!stamp) return '—'
  return clockOf(stamp)
}

export function formatClockParts(p: StampParts): string {
  return `${pad(p.hour)}:${pad(p.minute)}`
}

export function formatClockWithSeconds(p: StampParts, second: number): string {
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(second)}`
}

function dateFromKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

export function weekdayLong(dateStr: string): string {
  return formatter({ weekday: 'long' }).format(dateFromKey(dateStr))
}

export function weekdayShort(dateStr: string): string {
  return formatter({ weekday: 'short' }).format(dateFromKey(dateStr)).replace(/\.$/, '').toUpperCase()
}

export function monthShort(dateStr: string): string {
  return formatter({ month: 'short' }).format(dateFromKey(dateStr)).replace(/\.$/, '').toUpperCase()
}

export function monthLong(dateStr: string): string {
  return formatter({ month: 'long' }).format(dateFromKey(dateStr))
}

export function formatDayNumber(dateStr: string): string {
  return String(Number(dateStr.slice(8, 10)))
}

export function formatLongDate(offsetSeconds: number, now: Date = new Date()): string {
  const p = wallClockParts(offsetSeconds, now)
  const dateStr = `${p.year}-${pad(p.month)}-${pad(p.day)}`
  return formatter({ weekday: 'long', day: 'numeric', month: 'long' }).format(dateFromKey(dateStr))
}

export function dayRelation(dateStr: string, today: string): 'today' | 'tomorrow' | 'later' {
  if (dateStr === today) return 'today'
  if (dateStr === addDays(today, 1)) return 'tomorrow'
  return 'later'
}

export function formatLength(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'
  const total = Math.round(seconds / 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return t('time.hoursMinutes', { h, m: pad(m) })
}

export function formatRelativeTime(then: number, now: number = Date.now()): string {
  const sec = Math.max(0, Math.round((now - then) / 1000))
  if (sec < 45) return t('time.justNow')
  const min = Math.round(sec / 60)
  if (min < 60) return t('time.minutesAgo', { n: min })
  const h = Math.round(min / 60)
  return t('time.hoursAgo', { n: h })
}

export function formatUtcOffset(offsetSeconds: number): string {
  const sign = offsetSeconds < 0 ? '−' : '+'
  const abs = Math.abs(offsetSeconds)
  return `UTC${sign}${pad(Math.floor(abs / 3600))}:${pad(Math.floor((abs % 3600) / 60))}`
}

export function localHourAngle(stamp: LocalStamp): number {
  const p = parseStamp(stamp)
  if (!p) return 0
  return (p.hour + p.minute / 60) / 24
}
