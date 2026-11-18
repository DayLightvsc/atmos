import { useId, useMemo } from 'react'
import { t } from '../lib/i18n'
import { formatClock, formatLength, todayKey } from '../lib/time'
import { localToDate, moonInfo, sunPosition } from '../lib/solar'
import { describeWeather } from '../lib/weatherCodes'
import type { SkyContext } from '../lib/sky'
import type { LocalStamp } from '../lib/types'
import { Sigil } from './Sigil'

const W = 420
const H = 440
const CX = 210
const CY = 222
const R_OUT = 201
const HORIZON = 306
const ARC_RX = 172
const ARC_RY = 158

interface Point {
  x: number
  y: number
}

function project(elevation: number, azimuth: number): Point {
  const x = CX - Math.sin((azimuth * Math.PI) / 180) * ARC_RX
  const y = HORIZON - (Math.max(0, Math.min(90, elevation)) / 90) * ARC_RY
  return { x, y }
}

function toPath(points: Point[]): string {
  if (points.length === 0) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

function sampleSun(rise: LocalStamp | null, set: LocalStamp | null, offset: number, lat: number, lon: number): Point[] {
  if (!rise || !set) return []
  const start = localToDate(rise, offset)
  const end = localToDate(set, offset)
  if (!start || !end || end.getTime() <= start.getTime()) return []
  const points: Point[] = []
  for (let i = 0; i <= 64; i += 1) {
    const date = new Date(start.getTime() + ((end.getTime() - start.getTime()) * i) / 64)
    const position = sunPosition(date, lat, lon)
    points.push(project(position.elevation, position.azimuth))
  }
  return points
}

function sampleSunPolar(today: string, offset: number, lat: number, lon: number): Point[] {
  const start = localToDate(`${today}T00:00`, offset)
  if (!start) return []
  const points: Point[] = []
  for (let i = 0; i <= 96; i += 1) {
    const date = new Date(start.getTime() + (i / 96) * 86400000)
    const position = sunPosition(date, lat, lon)
    points.push(project(position.elevation, position.azimuth))
  }
  return points
}

function sampleMoon(today: string, offset: number, lat: number, lon: number): Point[][] {
  const start = localToDate(`${today}T00:00`, offset)
  if (!start) return []
  const segments: Point[][] = []
  let current: Point[] = []
  for (let i = 0; i <= 96; i += 1) {
    const date = new Date(start.getTime() + (i / 96) * 86400000)
    const info = moonInfo(date, lat, lon)
    if (info.position.elevation > 0.5) {
      current.push(project(info.position.elevation, info.position.azimuth))
    } else if (current.length > 1) {
      segments.push(current)
      current = []
    } else {
      current = []
    }
  }
  if (current.length > 1) segments.push(current)
  return segments
}

interface SkyDialProps {
  sky: SkyContext
  now: Date
  offsetSeconds: number
  latitude: number
  longitude: number
  conditionCode: number
  isDay: boolean
  cloudCover: number
  placeName: string
  tzAbbr: string | null
}

export function SkyDial({
  sky,
  now,
  offsetSeconds,
  latitude,
  longitude,
  conditionCode,
  isDay,
  cloudCover,
  placeName,
  tzAbbr,
}: SkyDialProps) {
  const moonMaskId = `dial-moon-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const dayFillId = `dial-day-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const today = todayKey(offsetSeconds, now)
  const condition = describeWeather(conditionCode)

  const sunPoints = useMemo(() => {
    const sampled = sampleSun(sky.daylight.sunrise, sky.daylight.sunset, offsetSeconds, latitude, longitude)
    if (sampled.length > 1) return sampled
    if (sky.daylight.polar === 'day') return sampleSunPolar(today, offsetSeconds, latitude, longitude)
    return []
  }, [sky.daylight.sunrise, sky.daylight.sunset, sky.daylight.polar, offsetSeconds, latitude, longitude, today])

  const moonPaths = useMemo(
    () => sampleMoon(today, offsetSeconds, latitude, longitude),
    [today, offsetSeconds, latitude, longitude],
  )

  const progress = useMemo(() => {
    const { sunrise, sunset } = sky.daylight
    if (!sunrise || !sunset) return null
    const rise = localToDate(sunrise, offsetSeconds)
    const set = localToDate(sunset, offsetSeconds)
    if (!rise || !set) return null
    const nowMs = now.getTime() + offsetSeconds * 1000
    return Math.max(0, Math.min(1, (nowMs - rise.getTime()) / (set.getTime() - rise.getTime())))
  }, [sky.daylight, now, offsetSeconds])

  const sunVisible = sky.sun.elevation > -0.5
  const sunMarker = project(sky.sun.elevation, sky.sun.azimuth)
  const moonVisible = sky.moon.position.elevation > 0.5
  const moonMarker = project(sky.moon.position.elevation, sky.moon.position.azimuth)

  const progressPoints = useMemo(() => {
    if (progress == null || sunPoints.length < 2) return []
    const last = Math.max(1, Math.round(progress * (sunPoints.length - 1)))
    return sunPoints.slice(0, last + 1)
  }, [progress, sunPoints])

  const daylightArea = useMemo(() => {
    if (sunPoints.length < 2) return ''
    const first = sunPoints[0]
    const last = sunPoints[sunPoints.length - 1]
    return `${toPath(sunPoints)} L${last.x.toFixed(1)} ${HORIZON} L${first.x.toFixed(1)} ${HORIZON} Z`
  }, [sunPoints])

  let kicker = t('dial.daylightLeft')
  let figure = formatLength(sky.daylight.remainingSeconds)
  if (sky.daylight.polar === 'day') {
    kicker = t('dial.polarDay')
    figure = formatLength(86400)
  } else if (sky.daylight.polar === 'night') {
    kicker = t('dial.polarNight')
    figure = formatLength(0)
  } else if (sky.phase === 'dawn') {
    kicker = t('dial.sunrise')
    figure = formatClock(sky.daylight.sunrise)
  } else if (sky.phase === 'dusk') {
    kicker = t('dial.sunset')
    figure = formatClock(sky.daylight.sunset)
  } else if (sky.phase === 'night') {
    kicker = t('dial.nextSunrise')
    figure = formatClock(sky.daylight.nextSunrise ?? sky.daylight.sunrise)
  } else if (sky.daylight.remainingSeconds == null) {
    figure = '—'
  }

  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = (i * 5 * Math.PI) / 180
    const major = i % 6 === 0
    const inner = R_OUT - (major ? 10 : 4)
    return {
      x1: CX + Math.cos(angle) * inner,
      y1: CY + Math.sin(angle) * inner,
      x2: CX + Math.cos(angle) * R_OUT,
      y2: CY + Math.sin(angle) * R_OUT,
      major,
    }
  })

  return (
    <figure className="dial" aria-labelledby="dial-caption">
      <div className="dial-frame">
        <svg className="dial-svg" viewBox={`0 0 ${W} ${H}`} role="presentation">
          <defs>
            <radialGradient id="dial-sun-halo">
              <stop offset="0%" stopColor="var(--sun)" stopOpacity="0.55" />
              <stop offset="45%" stopColor="var(--sun)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--sun)" stopOpacity="0" />
            </radialGradient>
            <mask id={moonMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <rect width={W} height={H} fill="#000" />
              <circle cx={moonMarker.x} cy={moonMarker.y} r="7.5" fill="#fff" />
              <circle
                cx={moonMarker.x + (sky.moon.waxing ? -1 : 1) * sky.moon.illumination * 15}
                cy={moonMarker.y}
                r="7.5"
                fill="#000"
              />
            </mask>
            <linearGradient id={dayFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14" />
              <stop offset="65%" stopColor="var(--accent)" stopOpacity="0.035" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <circle className="dial-ring" cx={CX} cy={CY} r={R_OUT} />
          <circle className="dial-inner" cx={CX} cy={CY} r="152" />
          <g className="dial-ticks">
            {ticks.map((tick, i) => (
              <line
                key={i}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                className={tick.major ? 'is-major' : undefined}
              />
            ))}
          </g>

          <line className="dial-horizon" x1="9" y1={HORIZON} x2="411" y2={HORIZON} />
          <g className="dial-horizon-ticks">
            {Array.from({ length: 41 }, (_, i) => (
              <line key={i} x1={9 + i * 10} y1={HORIZON} x2={9 + i * 10} y2={HORIZON + (i % 5 === 0 ? 6 : 3)} />
            ))}
          </g>
          <text className="dial-cardinal" x="18" y={HORIZON - 8}>
            {t('dial.east')}
          </text>
          <text className="dial-cardinal" x="402" y={HORIZON - 8} textAnchor="end">
            {t('dial.west')}
          </text>
          <text className="dial-horizon-label" x={CX} y={HORIZON - 8} textAnchor="middle">
            {t('dial.horizon')}
          </text>

          {moonPaths.map((path, i) => (
            <path key={i} className="dial-moon-path" d={toPath(path)} />
          ))}
          {daylightArea && <path className="dial-day-area" d={daylightArea} fill={`url(#${dayFillId})`} />}
          {sunPoints.length > 1 && <path className="dial-sun-path" d={toPath(sunPoints)} />}
          {progressPoints.length > 1 && sunVisible && (
            <path className="dial-sun-path is-travelled" d={toPath(progressPoints)} />
          )}

          {sunVisible && (
            <g className="dial-marker dial-sun">
              <circle cx={sunMarker.x} cy={sunMarker.y} r="26" fill="url(#dial-sun-halo)" />
              <circle cx={sunMarker.x} cy={sunMarker.y} r="4.6" />
              <circle cx={sunMarker.x} cy={sunMarker.y} r="9" className="dial-sun-ring" />
            </g>
          )}

          {moonVisible && (
            <g className="dial-marker dial-moon">
              <circle cx={moonMarker.x} cy={moonMarker.y} r="17" fill="url(#dial-sun-halo)" opacity="0.15" />
              <circle
                cx={moonMarker.x}
                cy={moonMarker.y}
                r="7.5"
                fill="var(--moon)"
                mask={`url(#${moonMaskId})`}
              />
              <circle cx={moonMarker.x} cy={moonMarker.y} r="7.5" className="dial-moon-edge" />
            </g>
          )}
        </svg>

        <div className="dial-center">
          <span className="dial-kicker">{kicker}</span>
          <span className="dial-figure">{figure}</span>
          <span className="dial-sub">
            <Sigil code={conditionCode} isDay={isDay} className="dial-sub-sigil" />
            <span>
              {condition.label}
              <span className="dial-cloud"> · {t('dial.cloud', { value: Math.round(cloudCover) })}</span>
            </span>
          </span>
        </div>

        <div className="dial-foot">
          <div className="dial-foot-cell">
            <span>{t('dial.sunrise')}</span>
            <b>{formatClock(sky.daylight.sunrise)}</b>
          </div>
          <div className="dial-foot-cell is-center">
            <span>{t('dial.daylight')}</span>
            <b>{formatLength(sky.daylight.lengthSeconds)}</b>
          </div>
          <div className="dial-foot-cell is-end">
            <span>{t('dial.sunset')}</span>
            <b>{formatClock(sky.daylight.sunset)}</b>
          </div>
        </div>
      </div>

      <figcaption id="dial-caption" className="sr-only">
        {t('dial.caption', {
          place: placeName,
          sunrise: formatClock(sky.daylight.sunrise),
          sunset: formatClock(sky.daylight.sunset),
          daylight: formatLength(sky.daylight.lengthSeconds),
          elevation: sky.sun.elevation.toFixed(0),
          zone: tzAbbr ?? t('dial.local'),
        })}
      </figcaption>
    </figure>
  )
}
