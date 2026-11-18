import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { t } from '../lib/i18n'
import {
  cardinal,
  percent,
  rain as formatRain,
  speed as formatSpeed,
  temperature,
  tempLetter,
  visibility as formatVisibility,
} from '../lib/format'
import {
  clockOf,
  dateOf,
  dayRelation,
  formatClock,
  formatDayNumber,
  monthShort,
  todayKey,
  weekdayShort,
} from '../lib/time'
import { describeWeather } from '../lib/weatherCodes'
import type { HourPoint, Units } from '../lib/types'
import { Sigil } from './Sigil'

const PLOT_TOP = 56
const PLOT_HEIGHT = 108
const COL_DESKTOP = 76
const COL_MOBILE = 66

interface HourlyTapeProps {
  hours: HourPoint[]
  units: Units
  offsetSeconds: number
  now: Date
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`
  let d = `M${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

function WindGlyph({ degrees, className }: { degrees: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      className={`wind-glyph ${className ?? ''}`}
      style={{ transform: `rotate(${degrees}deg)` }}
      aria-hidden="true"
    >
      <line x1="7" y1="12" x2="7" y2="3" />
      <path d="M7 2.5 10 7H4L7 2.5Z" />
    </svg>
  )
}

export function HourlyTape({ hours, units, offsetSeconds, now }: HourlyTapeProps) {
  const compact = useMediaQuery('(max-width: 719px)')
  const col = compact ? COL_MOBILE : COL_DESKTOP
  const [selected, setSelected] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const gradientId = `tape-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const today = todayKey(offsetSeconds, now)

  useEffect(() => {
    setSelected(0)
    scrollRef.current?.scrollTo({ left: 0 })
  }, [hours[0]?.time])

  const geometry = useMemo(() => {
    if (hours.length === 0) return { points: [], path: '', area: '', min: 0, max: 0 }
    const temps = hours.map((h) => h.temperature)
    const low = Math.min(...temps)
    const high = Math.max(...temps)
    const spread = Math.max(2, high - low)
    const pad = spread * 0.28
    const lo = low - pad
    const hi = high + pad
    const points = hours.map((hour, i) => {
      const x = i * col + col / 2
      const norm = (hour.temperature - lo) / (hi - lo)
      const y = 24 + (1 - norm) * (PLOT_HEIGHT - 38)
      return { x, y, hour }
    })
    const path = smoothPath(points)
    const area = points.length
      ? `${path} L${points[points.length - 1].x} ${PLOT_HEIGHT} L${points[0].x} ${PLOT_HEIGHT} Z`
      : ''
    return { points, path, area, min: low, max: high }
  }, [hours, col])

  if (hours.length === 0) {
    return (
      <section className="tape" aria-labelledby="tape-title">
        <header className="section-head">
          <div className="section-heading">
            <span className="section-index">02</span>
            <h2 className="section-title" id="tape-title">
              {t('tape.title')}
            </h2>
          </div>
        </header>
        <p className="empty-note">{t('tape.empty')}</p>
      </section>
    )
  }

  const chosen = hours[Math.min(selected, hours.length - 1)]
  const chosenCondition = describeWeather(chosen.code)
  const chosenDate = dateOf(chosen.time)
  const relation = dayRelation(chosenDate, today)
  const chosenWind = formatSpeed(chosen.windSpeed, units)
  const chosenRain = formatRain(chosen.precipitation, units)
  const chosenVis = formatVisibility(chosen.visibility, units)
  const dateTail = `${formatDayNumber(chosenDate)} ${monthShort(chosenDate)}`
  const dayLabel =
    relation === 'today'
      ? `${t('tape.today')}, ${dateTail}`
      : relation === 'tomorrow'
        ? `${t('tape.tomorrow')}, ${dateTail}`
        : `${weekdayShort(chosenDate)}, ${dateTail}`

  const moveSelection = (next: number) => {
    const index = Math.max(0, Math.min(hours.length - 1, next))
    setSelected(index)
    const button = buttonRefs.current[index]
    button?.focus({ preventScroll: true })
    button?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }

  return (
    <section className="tape" aria-labelledby="tape-title">
      <header className="section-head">
        <div className="section-heading">
          <span className="section-index">02</span>
          <h2 className="section-title" id="tape-title">
            {t('tape.title')}
          </h2>
        </div>
        <div className="section-legend" aria-hidden="true">
          <span className="legend-item">
            <i className="legend-line" />
            {t('tape.airTemp')}
          </span>
          <span className="legend-item">
            <i className="legend-bar" />
            {t('tape.chance')}
          </span>
        </div>
        <span className="section-corner">
          {t('tape.localTime')} · {clockOf(chosen.time)}
        </span>
      </header>

      <div className="hour-readout">
        <div className="readout-when">
          <span className="readout-clock">{selected === 0 ? t('tape.now') : formatClock(chosen.time)}</span>
          <span className="readout-day">{dayLabel}</span>
        </div>
        <div className="readout-condition">
          <Sigil code={chosen.code} isDay={chosen.isDay} />
          <span>{chosenCondition.label}</span>
        </div>
        <dl className="readout-stats">
          <div>
            <dt>{t('tape.feels')}</dt>
            <dd>
              {temperature(chosen.apparent, units)}
              <i>°{tempLetter(units)}</i>
            </dd>
          </div>
          <div>
            <dt>{t('tape.rain')}</dt>
            <dd>
              {percent(chosen.precipProbability)}
              <i>
                {chosenRain.value} {chosenRain.unit}
              </i>
            </dd>
          </div>
          <div>
            <dt>{t('tape.wind')}</dt>
            <dd>
              {cardinal(chosen.windDirection)}
              <i>
                {chosenWind.value} {chosenWind.unit}
              </i>
            </dd>
          </div>
          <div>
            <dt>{t('tape.humidity')}</dt>
            <dd>{percent(chosen.humidity)}</dd>
          </div>
          <div>
            <dt>{t('tape.visibility')}</dt>
            <dd>
              {chosenVis.value}
              <i>{chosenVis.unit}</i>
            </dd>
          </div>
        </dl>
      </div>

      <div
        className="tape-scroll"
        ref={scrollRef}
        role="group"
        aria-label={t('tape.scrubAria')}
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse') return
          const rect = event.currentTarget.getBoundingClientRect()
          const x = event.clientX - rect.left + event.currentTarget.scrollLeft
          const index = Math.max(0, Math.min(hours.length - 1, Math.floor(x / col)))
          if (index !== selected) setSelected(index)
        }}
      >
        <div className="tape-inner" style={{ width: hours.length * col, '--hour-col': `${col}px` } as React.CSSProperties}>
          <svg
            className="tape-curve"
            width={hours.length * col}
            height={PLOT_HEIGHT}
            viewBox={`0 0 ${hours.length * col} ${PLOT_HEIGHT}`}
            style={{ top: PLOT_TOP }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.09" />
                <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1={PLOT_HEIGHT * 0.52} x2={hours.length * col} y2={PLOT_HEIGHT * 0.52} className="tape-gridline" />
            <path d={geometry.area} fill={`url(#${gradientId})`} />
            <path d={geometry.path} className="tape-line" />
            {selected >= 0 && (
              <line
                x1={selected * col + col / 2}
                y1="2"
                x2={selected * col + col / 2}
                y2={PLOT_HEIGHT - 2}
                className="tape-cursor"
              />
            )}
            {geometry.points.map((point, i) => (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={i === selected ? 3.4 : 1.9}
                className={`tape-dot ${i === selected ? 'is-active' : ''}`}
              />
            ))}
          </svg>

          {hours.map((hour, index) => {
            const condition = describeWeather(hour.code)
            const point = geometry.points[index]
            const labelTop = Math.max(0, Math.min(PLOT_HEIGHT - 18, (point?.y ?? 50) - 22))
            const wind = formatSpeed(hour.windSpeed, units)
            const amount = formatRain(hour.precipitation, units)
            const vis = formatVisibility(hour.visibility, units)
            const isNow = index === 0
            const hourLabel = t('tape.hourAria', {
              time: isNow ? t('tape.now') : formatClock(hour.time),
              condition: condition.label,
              temp: temperature(hour.temperature, units),
              feels: temperature(hour.apparent, units),
              chance: Math.round(hour.precipProbability),
              rain: amount.value,
              rainUnit: amount.unit,
              cardinal: cardinal(hour.windDirection),
              wind: wind.value,
              windUnit: wind.unit,
              humidity: Math.round(hour.humidity),
              visibility: vis.value,
              visibilityUnit: vis.unit,
            })
            return (
              <button
                key={hour.time}
                ref={(node) => {
                  buttonRefs.current[index] = node
                }}
                type="button"
                className={`tape-col ${index === selected ? 'is-selected' : ''} ${isNow ? 'is-now' : ''}`}
                tabIndex={index === selected ? 0 : -1}
                aria-pressed={index === selected}
                aria-label={hourLabel}
                onClick={() => setSelected(index)}
                onFocus={() => setSelected(index)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') {
                    event.preventDefault()
                    moveSelection(index + 1)
                  } else if (event.key === 'ArrowLeft') {
                    event.preventDefault()
                    moveSelection(index - 1)
                  } else if (event.key === 'Home') {
                    event.preventDefault()
                    moveSelection(0)
                  } else if (event.key === 'End') {
                    event.preventDefault()
                    moveSelection(hours.length - 1)
                  }
                }}
              >
                <span className="hour-time">{isNow ? t('tape.now') : formatClock(hour.time)}</span>
                <span className="hour-sigil">
                  <Sigil code={hour.code} isDay={hour.isDay} />
                </span>
                <span className="hour-plot">
                  <span className="hour-temp" style={{ top: labelTop }}>
                    {temperature(hour.temperature, units)}
                    <i>°</i>
                  </span>
                </span>
                <span className="hour-rain">
                  <span className="rain-pct">{Math.round(hour.precipProbability)}%</span>
                  <span
                    className="rain-bar"
                    style={{ height: `${2 + hour.precipProbability * 0.3}px` }}
                  />
                </span>
                <span className="hour-wind">
                  <WindGlyph degrees={hour.windDirection} />
                  {wind.value}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="tape-hint">
        <span>{t('tape.drag')}</span>
        <span className="tape-hint-range">
          {t('tape.range', {
            min: temperature(geometry.min, units),
            max: temperature(geometry.max, units),
          })}
        </span>
      </p>

      <div className="sr-only">
        <table>
          <caption>{t('tape.srCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('tape.time')}</th>
            <th scope="col">{t('tape.condition')}</th>
            <th scope="col">{t('tape.temperature')}</th>
            <th scope="col">{t('tape.feelsLike')}</th>
            <th scope="col">{t('tape.chance')}</th>
            <th scope="col">{t('tape.precipitation')}</th>
            <th scope="col">{t('tape.wind')}</th>
            <th scope="col">{t('tape.humidity')}</th>
            <th scope="col">{t('tape.visibility')}</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => {
            const wind = formatSpeed(hour.windSpeed, units)
            const amount = formatRain(hour.precipitation, units)
            const vis = formatVisibility(hour.visibility, units)
            return (
              <tr key={hour.time}>
                <th scope="row">{formatClock(hour.time)}</th>
                <td>{describeWeather(hour.code).label}</td>
                <td>{temperature(hour.temperature, units)}°</td>
                <td>{temperature(hour.apparent, units)}°</td>
                <td>{Math.round(hour.precipProbability)}%</td>
                <td>
                  {amount.value} {amount.unit}
                </td>
                <td>
                  {cardinal(hour.windDirection)} {wind.value} {wind.unit}
                </td>
                <td>{Math.round(hour.humidity)}%</td>
                <td>
                  {vis.value} {vis.unit}
                </td>
              </tr>
            )
          })}
        </tbody>
        </table>
      </div>
    </section>
  )
}
