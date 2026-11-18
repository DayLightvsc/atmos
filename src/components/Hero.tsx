import { useNow } from '../hooks/useNow'
import {
  cardinal,
  coordinates,
  elevation as formatElevation,
  percent,
  pressure as formatPressure,
  rain,
  speed,
  temperature,
  tempLetter,
  uv as formatUv,
  visibility,
} from '../lib/format'
import { temperatureColor } from '../lib/color'
import { t } from '../lib/i18n'
import { formatClock, formatLongDate, formatRelativeTime, formatUtcOffset } from '../lib/time'
import { describeWeather, uvLevel } from '../lib/weatherCodes'
import type { SkyContext } from '../lib/sky'
import type { DayPoint, Forecast, Place, Units } from '../lib/types'
import { SearchIcon } from './Icons'
import { Sigil } from './Sigil'
import { SkyDial } from './SkyDial'

interface ThermalBandProps {
  day: DayPoint | null
  current: number
  units: Units
  mode: 'light' | 'dark'
}

function ThermalBand({ day, current, units, mode }: ThermalBandProps) {
  if (!day) return null
  const pad = 1.5
  const low = day.min - pad
  const high = day.max + pad
  const span = Math.max(1, high - low)
  const now = Math.min(100, Math.max(0, ((current - low) / span) * 100))
  return (
    <div
      className="thermal"
      aria-label={t('hero.todayBetween', {
        min: temperature(day.min, units),
        max: temperature(day.max, units),
      })}
    >
      <span className="thermal-end">
        <em>{t('hero.low')}</em>
        <b>
          {temperature(day.min, units)}
          <i>°</i>
        </b>
      </span>
      <div className="thermal-track">
        <span
          className="thermal-fill"
          style={{
            background: `linear-gradient(90deg, ${temperatureColor(day.min, mode)}, ${temperatureColor(day.max, mode)})`,
          }}
        />
        <span className="thermal-marker" style={{ left: `${now}%` }} />
      </div>
      <span className="thermal-end is-high">
        <em>{t('hero.high')}</em>
        <b>
          {temperature(day.max, units)}
          <i>°</i>
        </b>
      </span>
    </div>
  )
}

function Compass({ degrees }: { degrees: number }) {
  return (
    <svg viewBox="0 0 24 24" className="compass" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" />
      <line x1="12" y1="2.8" x2="12" y2="5.1" />
      <line x1="12" y1="18.9" x2="12" y2="21.2" />
      <line x1="2.8" y1="12" x2="5.1" y2="12" />
      <line x1="18.9" y1="12" x2="21.2" y2="12" />
      <g transform={`rotate(${degrees} 12 12)`}>
        <line x1="12" y1="13.5" x2="12" y2="18.2" className="compass-tail" />
        <path d="M12 5.4 14.1 9.6H9.9L12 5.4Z" className="compass-needle" />
      </g>
    </svg>
  )
}

interface MetricsProps {
  forecast: Forecast
  units: Units
}

function Metrics({ forecast, units }: MetricsProps) {
  const now = forecast.now
  const wind = speed(now.windSpeed, units)
  const gust = speed(now.windGust, units)
  const rainNow = rain(now.precipitation, units)
  const vis = visibility(now.visibility, units)
  const uvValue = now.uv
  const level = uvLevel(uvValue)

  return (
    <dl className="metrics">
      <div className="metric">
        <dt className="metric-label">{t('hero.metricHumidity')}</dt>
        <dd className="metric-value">
          {percent(now.humidity)}
          <span className="metric-note">{t('hero.noteRelative')}</span>
        </dd>
      </div>
      <div className="metric">
        <dt className="metric-label">{t('hero.metricCloud')}</dt>
        <dd className="metric-value">
          {percent(now.cloudCover)}
          <span className="metric-note">{t('hero.noteSky')}</span>
        </dd>
      </div>
      <div className="metric">
        <dt className="metric-label">{t('hero.metricPrecip')}</dt>
        <dd className="metric-value">
          {rainNow.value}
          <span className="metric-unit">{rainNow.unit}</span>
          <span className="metric-note">{t('hero.notePerHour')}</span>
        </dd>
      </div>
      <div className="metric">
        <dt className="metric-label">{t('hero.metricWind')}</dt>
        <dd className="metric-value">
          {wind.value}
          <span className="metric-unit">{wind.unit}</span>
          <span className="metric-note metric-wind">
            <Compass degrees={now.windDirection} />
            {cardinal(now.windDirection)}
          </span>
        </dd>
      </div>
      <div className="metric">
        <dt className="metric-label">{t('hero.metricGusts')}</dt>
        <dd className="metric-value">
          {gust.value}
          <span className="metric-unit">{gust.unit}</span>
          <span className="metric-note">{t('hero.notePeak')}</span>
        </dd>
      </div>
      <div className="metric">
        <dt className="metric-label">{t('hero.metricVisibility')}</dt>
        <dd className="metric-value">
          {vis.value}
          <span className="metric-unit">{vis.unit}</span>
          <span className="metric-note">{t('hero.noteHorizontal')}</span>
        </dd>
      </div>
      <div className="metric">
        <dt className="metric-label">{t('hero.metricPressure')}</dt>
        <dd className="metric-value">
          {formatPressure(now.pressure)}
          <span className="metric-unit">{t('particulars.hpa')}</span>
          <span className="metric-note">{t('hero.noteSeaLevel')}</span>
        </dd>
      </div>
      <div className="metric">
        <dt className="metric-label">{t('hero.metricUv')}</dt>
        <dd className="metric-value">
          {formatUv(uvValue)}
          <span className="metric-note">{level.label}</span>
        </dd>
      </div>
    </dl>
  )
}

interface HeroProps {
  place: Place
  forecast: Forecast
  sky: SkyContext
  units: Units
  today: DayPoint | null
  now: Date
  onOpenSearch: () => void
  onRefresh: () => void
  stale: boolean
  refreshing: boolean
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function Hero({
  place,
  forecast,
  sky,
  units,
  today,
  now,
  onOpenSearch,
  onRefresh,
  stale,
  refreshing,
  isFavorite,
  onToggleFavorite,
}: HeroProps) {
  const tick = useNow(30000)
  const condition = describeWeather(forecast.now.code)
  const localDate = formatLongDate(forecast.place.utcOffsetSeconds, now)
  const region = [place.admin1, place.country].filter(Boolean).join(', ')
  const synced = formatRelativeTime(forecast.fetchedAt, tick.getTime())

  return (
    <section className="hero" aria-labelledby="city-heading">
      <div className="hero-meta">
        <div className="meta-station">
          <span>
            <i>{t('hero.station')}</i> {coordinates(place.latitude, place.longitude)}
          </span>
          <span>
            <i>{t('hero.elevation')}</i> {formatElevation(place.elevation ?? forecast.place.elevation, units)}
          </span>
          <span>
            <i>{t('hero.zone')}</i> {forecast.place.timezoneAbbr ?? t('hero.local')} ·{' '}
            {formatUtcOffset(forecast.place.utcOffsetSeconds)}
          </span>
        </div>
        <button
          type="button"
          className={`meta-signal ${stale ? 'is-stale' : ''}`}
          onClick={onRefresh}
          disabled={refreshing}
          title={t('topbar.refresh')}
          aria-label={t('topbar.refresh')}
        >
          <span className={`signal-dot ${refreshing ? 'is-syncing' : ''}`} aria-hidden="true" />
          {stale ? t('hero.stale') : refreshing ? t('hero.syncing') : t('hero.synced', { when: synced })}
        </button>
      </div>

      <div className="hero-main">
        <div className="hero-city">
          <p className="hero-eyebrow">
            <span className="hero-index">01</span>
            {t('hero.currentConditions')} <span className="hero-sep" aria-hidden="true">/</span> {localDate}
          </p>
          <h1 className="city-name" id="city-heading">
            <button
              type="button"
              className="city-button"
              onClick={onOpenSearch}
              aria-label={t('hero.changeStation', { name: place.name })}
            >
              {place.name}
            </button>
            <span className="city-search-mark" aria-hidden="true">
              <SearchIcon size={20} />
            </span>
          </h1>
          <p className="city-region">{region}</p>
        </div>

        <div className="hero-reading">
          <div className="temp-block">
            <div
              className="temp-value"
              aria-label={t('hero.tempAria', {
                temp: temperature(forecast.now.temperature, units),
                letter: tempLetter(units),
              })}
            >
              <span>{temperature(forecast.now.temperature, units)}</span>
              <span className="temp-degree" aria-hidden="true">
                °
              </span>
            </div>
            <p className="temp-caption">
              <span className="temp-caption-dot" aria-hidden="true" />
              {t('hero.feelsLike', {
                temp: temperature(forecast.now.apparent, units),
                dayPart: forecast.now.isDay ? t('hero.day') : t('hero.night'),
                time: formatClock(forecast.now.time),
              })}
            </p>
          </div>

          <div className="reading-aside">
            <div className="condition">
              <Sigil code={forecast.now.code} isDay={forecast.now.isDay} className="condition-sigil" />
              <div className="condition-text">
                <p className="condition-label">{condition.label}</p>
                <p className="condition-detail">
                  {t('hero.cloudHumidity', {
                    cloud: percent(forecast.now.cloudCover),
                    humidity: percent(forecast.now.humidity),
                  })}
                </p>
              </div>
            </div>
            <ThermalBand day={today} current={forecast.now.temperature} units={units} mode={sky.palette.mode} />
            <button
              type="button"
              className={`pin-button ${isFavorite ? 'is-pinned' : ''}`}
              onClick={onToggleFavorite}
              aria-pressed={isFavorite}
            >
              <span className="pin-glyph" aria-hidden="true">
                {isFavorite ? '★' : '☆'}
              </span>
              {isFavorite ? t('hero.pinned') : t('hero.pin')}
            </button>
          </div>
        </div>
      </div>

      <div className="hero-dial">
        <SkyDial
          sky={sky}
          now={now}
          offsetSeconds={forecast.place.utcOffsetSeconds}
          latitude={place.latitude}
          longitude={place.longitude}
          conditionCode={forecast.now.code}
          isDay={forecast.now.isDay}
          cloudCover={forecast.now.cloudCover}
          placeName={place.name}
          tzAbbr={forecast.place.timezoneAbbr}
        />
      </div>

      <Metrics forecast={forecast} units={units} />
    </section>
  )
}
