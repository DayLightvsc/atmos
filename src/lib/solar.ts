import { t } from './i18n'
import { parseStamp, stampToMs } from './time'
import type { LocalStamp } from './types'

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export interface SkyPosition {
  elevation: number // degrees above the horizon
  azimuth: number // degrees clockwise from true north
}

function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

function obliquity(jd: number): number {
  const T = (jd - 2451545) / 36525
  const seconds = 21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))
  return 23 + (26 + seconds / 60) / 60
}

function eclipticToEquatorial(lonDeg: number, latDeg: number, jd: number): { ra: number; dec: number } {
  const eps = obliquity(jd) * RAD
  const lon = lonDeg * RAD
  const lat = latDeg * RAD
  const x = Math.cos(lat) * Math.cos(lon)
  const y = Math.cos(lat) * Math.sin(lon)
  const z = Math.sin(lat)
  const yq = y * Math.cos(eps) - z * Math.sin(eps)
  const zq = y * Math.sin(eps) + z * Math.cos(eps)
  return { ra: mod(Math.atan2(yq, x) * DEG, 360), dec: Math.atan2(zq, Math.hypot(x, yq)) * DEG }
}

function horizonFromEquatorial(raDeg: number, decDeg: number, jd: number, lat: number, lon: number): SkyPosition {
  const gmst = mod(280.46061837 + 360.98564736629 * (jd - 2451545), 360)
  const hourAngle = mod(gmst + lon - raDeg, 360)
  const H = hourAngle * RAD
  const dec = decDeg * RAD
  const phi = lat * RAD
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  const elevation = Math.asin(clamp(sinAlt, -1, 1)) * DEG
  const azimuth =
    mod(Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) * DEG + 180, 360)
  return { elevation, azimuth }
}

function sunEcliptic(date: Date): { lon: number; ra: number; dec: number } {
  const jd = julianDay(date)
  const T = (jd - 2451545) / 36525
  const L0 = mod(280.46646 + T * (36000.76983 + T * 0.0003032), 360)
  const M = 357.52911 + T * (35999.05029 - T * 0.0001537)
  const C =
    Math.sin(M * RAD) * (1.914602 - T * (0.004817 + T * 0.000014)) +
    Math.sin(2 * M * RAD) * (0.019993 - T * 0.000101) +
    Math.sin(3 * M * RAD) * 0.000289
  const omega = 125.04 - 1934.136 * T
  const lon = mod(L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD), 360)
  const { ra, dec } = eclipticToEquatorial(lon, 0, jd)
  return { lon, ra, dec }
}

export function sunPosition(date: Date, lat: number, lon: number): SkyPosition {
  const { ra, dec } = sunEcliptic(date)
  return horizonFromEquatorial(ra, dec, julianDay(date), lat, lon)
}

export interface MoonInfo {
  position: SkyPosition
  illumination: number // 0..1
  phaseFraction: number // 0 = new, .5 = full
  phaseName: string
  waxing: boolean
}

export function moonInfo(date: Date, lat: number, lon: number): MoonInfo {
  const jd = julianDay(date)
  const d = jd - 2451543.5
  const N = 125.1228 - 0.0529538083 * d
  const i = 5.1454
  const w = 318.0634 + 0.1643573223 * d
  const a = 60.2666
  const e = 0.0549
  const M = 115.3654 + 13.0649929509 * d
  const mr = M * RAD
  let E = mr + e * Math.sin(mr) * (1 + e * Math.cos(mr))
  for (let k = 0; k < 6; k += 1) {
    E -= (E - e * Math.sin(E) - mr) / (1 - e * Math.cos(E))
  }
  const xv = a * (Math.cos(E) - e)
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const v = Math.atan2(yv, xv)
  const r = Math.hypot(xv, yv)
  const nr = N * RAD
  const ir = i * RAD
  const vw = v + w * RAD
  const xh = r * (Math.cos(nr) * Math.cos(vw) - Math.sin(nr) * Math.sin(vw) * Math.cos(ir))
  const yh = r * (Math.sin(nr) * Math.cos(vw) + Math.cos(nr) * Math.sin(vw) * Math.cos(ir))
  const zh = r * Math.sin(vw) * Math.sin(ir)
  let lonE = Math.atan2(yh, xh) * DEG
  let latE = Math.atan2(zh, Math.hypot(xh, yh)) * DEG

  const Ms = mod(356.047 + 0.9856002585 * d, 360)
  const Mm = mod(M, 360)
  const D = mod(297.8502 + 0.9856474 * d, 360)
  const F = mod(93.2721 + 13.2293502 * d, 360)

  lonE +=
    -1.274 * Math.sin((Mm - 2 * D) * RAD) +
    0.658 * Math.sin(2 * D * RAD) -
    0.186 * Math.sin(Ms * RAD) -
    0.059 * Math.sin((2 * Mm - 2 * D) * RAD) -
    0.057 * Math.sin((Mm - 2 * D + Ms) * RAD) +
    0.053 * Math.sin((Mm + 2 * D) * RAD) +
    0.046 * Math.sin((2 * D - Ms) * RAD) +
    0.041 * Math.sin((Mm - Ms) * RAD) -
    0.035 * Math.sin(D * RAD) -
    0.031 * Math.sin((Mm + Ms) * RAD) -
    0.015 * Math.sin((2 * F - 2 * D) * RAD) +
    0.011 * Math.sin((Mm - 4 * D) * RAD)

  latE +=
    -0.173 * Math.sin((F - 2 * D) * RAD) -
    0.055 * Math.sin((Mm - F - 2 * D) * RAD) -
    0.046 * Math.sin((Mm + F - 2 * D) * RAD) +
    0.033 * Math.sin((F + 2 * D) * RAD) +
    0.017 * Math.sin((2 * Mm + F) * RAD)

  lonE = mod(lonE, 360)
  const { ra, dec } = eclipticToEquatorial(lonE, latE, jd)
  const position = horizonFromEquatorial(ra, dec, jd, lat, lon)

  const sun = sunEcliptic(date)
  const diff = mod(lonE - sun.lon, 360)
  const elongation = Math.acos(clamp(Math.cos(latE * RAD) * Math.cos(diff * RAD), -1, 1)) * DEG
  const illumination = (1 - Math.cos(elongation * RAD)) / 2

  let phaseName = t('moon.new')
  if (diff >= 12 && diff < 78) phaseName = t('moon.waxingCrescent')
  else if (diff >= 78 && diff < 102) phaseName = t('moon.firstQuarter')
  else if (diff >= 102 && diff < 168) phaseName = t('moon.waxingGibbous')
  else if (diff >= 168 && diff < 192) phaseName = t('moon.full')
  else if (diff >= 192 && diff < 258) phaseName = t('moon.waningGibbous')
  else if (diff >= 258 && diff < 282) phaseName = t('moon.lastQuarter')
  else if (diff >= 282 && diff < 348) phaseName = t('moon.waningCrescent')

  return { position, illumination, phaseFraction: diff / 360, phaseName, waxing: diff < 180 }
}

/** Convert the place's wall-clock stamp to an absolute Date. */
export function localToDate(stamp: LocalStamp, offsetSeconds: number): Date | null {
  if (!parseStamp(stamp)) return null
  return new Date(stampToMs(stamp) - offsetSeconds * 1000)
}

export function sunAltitudeAt(stamp: LocalStamp, offsetSeconds: number, lat: number, lon: number): number | null {
  const date = localToDate(stamp, offsetSeconds)
  if (!date) return null
  return sunPosition(date, lat, lon).elevation
}
