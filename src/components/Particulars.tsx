import { useId } from 'react'
import { formatClock, formatLength, todayKey } from '../lib/time'
import { pressure as formatPressure, uv as formatUv } from '../lib/format'
import { t } from '../lib/i18n'
import { uvLevel } from '../lib/weatherCodes'
import type { SkyContext } from '../lib/sky'
import type { DayPoint, Forecast, HourPoint } from '../lib/types'
import { MoonPhase } from './MoonPhase'

interface ParticularsProps {
  forecast: Forecast
  sky: SkyContext
  today: DayPoint | null
  now: Date
  hours24: HourPoint[]
}

function DaylightArc({ progress, polar }: { progress: number | null; polar: 'day' | 'night' | null }) {
  const p = progress ?? (polar === 'day' ? 1 : 0)
  const x = (1 - p) * (1 - p) * 10 + 2 * (1 - p) * p * 100 + p * p * 190
  const y = (1 - p) * (1 - p) * 52 + 2 * (1 - p) * p * 4 + p * p * 52
  const samples = 24
  let trace = ''
  for (let i = 0; i <= samples; i += 1) {
    const t = (i / samples) * p
    const px = (1 - t) * (1 - t) * 10 + 2 * (1 - t) * t * 100 + t * t * 190
    const py = (1 - t) * (1 - t) * 52 + 2 * (1 - t) * t * 4 + t * t * 52
    trace += `${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)} `
  }
  return (
    <svg viewBox="0 0 200 64" className="daylight-arc" aria-hidden="true">
      <path d="M10 52 Q100 4 190 52" className="arc-track" />
      {progress != null && <path d={trace} className="arc-progress" />}
      <line x1="4" y1="52" x2="196" y2="52" className="arc-horizon" />
      {progress != null && <circle cx={x} cy={y} r="3.6" className="arc-sun" />}
    </svg>
  )
}

function PressureSpark({ hours }: { hours: HourPoint[] }) {
  const gradientId = `pressure-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const points = hours
    .map((hour, index) => ({ index, value: hour.pressure }))
    .filter((item): item is { index: number; value: number } => item.value != null)
  if (points.length < 2) return null

  const values = points.map((p) => p.value)
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = Math.max(1, high - low)
  const width = 200
  const height = 52
  const coords = points.map((point) => {
    const x = (point.index / Math.max(1, hours.length - 1)) * width
    const y = 8 + (1 - (point.value - low) / span) * (height - 18)
    return { x, y }
  })
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)} ${height} L${coords[0].x.toFixed(1)} ${height} Z`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="pressure-spark" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} className="spark-line" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="2.6" className="spark-dot" />
    </svg>
  )
}

export function Particulars({ forecast, sky, today, now, hours24 }: ParticularsProps) {
  const offset = forecast.place.utcOffsetSeconds
  const dateKey = todayKey(offset, now)

  const uvHours = forecast.hours.filter((hour) => hour.time.startsWith(dateKey) && hour.uv != null)
  const uvPeak = uvHours.reduce<HourPoint | null>((best, hour) => {
    if (!best) return hour
    return (hour.uv ?? 0) > (best.uv ?? 0) ? hour : best
  }, null)
  const uvMax = today?.uvMax ?? uvPeak?.uv ?? forecast.now.uv
  const uvToday = uvLevel(uvMax)

  const pressureNow = forecast.now.pressure
  const nowHourIndex = forecast.hours.findIndex((hour) => hour.time.slice(0, 13) === forecast.now.time.slice(0, 13))
  const pressureStart = forecast.hours[nowHourIndex]?.pressure ?? pressureNow
  const pressureLater = forecast.hours[Math.min(forecast.hours.length - 1, Math.max(0, nowHourIndex) + 3)]?.pressure ?? null
  const pressureDelta = pressureLater != null ? pressureLater - pressureStart : 0
  const pressureTrend: 'particulars.steady' | 'particulars.rising' | 'particulars.falling' =
    Math.abs(pressureDelta) < 0.9 ? 'particulars.steady' : pressureDelta > 0 ? 'particulars.rising' : 'particulars.falling'
  const pressureValue = `${pressureDelta > 0 ? '+' : ''}${pressureDelta.toFixed(1)}`

  const arcProgress = sky.daylight.progress

  return (
    <section className="particulars" aria-labelledby="particulars-title">
      <header className="section-head">
        <div className="section-heading">
          <span className="section-index">04</span>
          <h2 className="section-title" id="particulars-title">
            {t('particulars.title')}
          </h2>
        </div>
        <p className="section-note">{t('particulars.note')}</p>
      </header>

      <div className="particular-grid">
        <article className="particular">
          <h3 className="part-label">{t('particulars.daylight')}</h3>
          <p className="part-figure">
            {formatLength(sky.daylight.lengthSeconds)}
            <span className="part-suffix">{t('particulars.ofLight')}</span>
          </p>
          <DaylightArc progress={arcProgress} polar={sky.daylight.polar} />
          <p className="part-note">
            <span>
              {t('particulars.sunrise')} {formatClock(sky.daylight.sunrise)}
            </span>
            <span>
              {t('particulars.sunset')} {formatClock(sky.daylight.sunset)}
            </span>
          </p>
          <p className="part-sub">
            {sky.daylight.polar === 'day'
              ? t('particulars.polarDay')
              : sky.daylight.polar === 'night'
                ? t('particulars.polarNight')
                : sky.daylight.remainingSeconds != null && sky.daylight.remainingSeconds > 0
                  ? t('particulars.lightAhead', { length: formatLength(sky.daylight.remainingSeconds) })
                  : t('particulars.lightGone')}
          </p>
        </article>

        <article className="particular">
          <h3 className="part-label">{t('particulars.moon')}</h3>
          <p className="part-figure">
            {Math.round(sky.moon.illumination * 100)}
            <span className="part-suffix">{t('particulars.lit')}</span>
          </p>
          <div className="moon-visual">
            <MoonPhase
              fraction={sky.moon.illumination}
              waxing={sky.moon.waxing}
              title={t('particulars.moonAria', {
                phase: sky.moon.phaseName,
                percent: Math.round(sky.moon.illumination * 100),
              })}
            />
          </div>
          <p className="part-note">
            <span>{sky.moon.phaseName}</span>
            <span>{sky.moon.waxing ? t('particulars.waxing') : t('particulars.waning')}</span>
          </p>
          <p className="part-sub">
            {sky.moon.position.elevation > 0
              ? t('particulars.aboveHorizon', {
                  elevation: Math.round(sky.moon.position.elevation),
                  azimuth: Math.round(sky.moon.position.azimuth),
                })
              : t('particulars.belowHorizon')}
          </p>
        </article>

        <article className="particular">
          <h3 className="part-label">{t('particulars.ultraviolet')}</h3>
          <p className="part-figure">
            {formatUv(uvMax)}
            <span className="part-suffix">{uvToday.label}</span>
          </p>
          <div className="uv-scale" aria-hidden="true">
            <span className="uv-track">
              {uvMax != null && <span className="uv-marker" style={{ left: `${Math.min(100, (uvMax / 11) * 100)}%` }} />}
            </span>
            <span className="uv-ticks">
              <i>0</i>
              <i>3</i>
              <i>6</i>
              <i>9</i>
              <i>11</i>
            </span>
          </div>
          <p className="part-note">
            <span>{t('particulars.dailyMax')}</span>
            <span>{uvPeak ? t('particulars.peak', { time: formatClock(uvPeak.time) }) : t('particulars.noPeak')}</span>
          </p>
          <p className="part-sub">
            {uvMax != null && uvMax >= 3 ? t('particulars.sunAdvice') : t('particulars.lowRisk')}
          </p>
        </article>

        <article className="particular">
          <h3 className="part-label">{t('particulars.pressure')}</h3>
          <p className="part-figure">
            {formatPressure(pressureNow)}
            <span className="part-suffix">{t('particulars.hpa')}</span>
          </p>
          <PressureSpark hours={hours24} />
          <p className="part-note">
            <span>{t(pressureTrend)}</span>
            <span>{t('particulars.pressureDelta', { value: pressureValue })}</span>
          </p>
          <p className="part-sub">
            {pressureDelta > 0.9
              ? t('particulars.pressureRise')
              : pressureDelta < -0.9
                ? t('particulars.pressureFall')
                : t('particulars.pressureSteady')}
          </p>
        </article>
      </div>
    </section>
  )
}
