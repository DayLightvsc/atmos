import { temperature, rain as formatRain, speed as formatSpeed, uv as formatUv, tempLetter } from '../lib/format'
import { temperatureColor } from '../lib/color'
import { t } from '../lib/i18n'
import { formatClock, formatDayNumber, monthShort, weekdayShort, dayRelation } from '../lib/time'
import { describeWeather } from '../lib/weatherCodes'
import type { DayPoint, Units } from '../lib/types'
import { Sigil } from './Sigil'

interface WeekAheadProps {
  days: DayPoint[]
  units: Units
  today: string
  mode: 'light' | 'dark'
}

export function WeekAhead({ days, units, today, mode }: WeekAheadProps) {
  if (days.length === 0) return null

  const rawLow = Math.min(...days.map((d) => d.min))
  const rawHigh = Math.max(...days.map((d) => d.max))
  const pad = Math.max(1, (rawHigh - rawLow) * 0.12)
  const scaleLow = rawLow - pad
  const scaleHigh = rawHigh + pad
  const span = Math.max(1, scaleHigh - scaleLow)

  return (
    <section className="week" aria-labelledby="week-title">
      <header className="section-head">
        <div className="section-heading">
          <span className="section-index">03</span>
          <h2 className="section-title" id="week-title">
            {t('week.title')}
          </h2>
        </div>
        <p className="section-note">{t('week.note', { letter: tempLetter(units) })}</p>
      </header>

      <div className="week-table" aria-hidden="true">
        <div className="week-header">
          <span className="week-h-day">{t('week.day')}</span>
          <span className="week-h-sky">{t('week.sky')}</span>
          <span className="week-h-range">
            <i>{temperature(rawLow, units)}°</i>
            <em />
            <i>{temperature(rawHigh, units)}°</i>
          </span>
          <span className="week-h-rain">{t('week.precip')}</span>
          <span className="week-h-uv">{t('week.uv')}</span>
          <span className="week-h-wind">{t('week.wind')}</span>
          <span className="week-h-sun">{t('week.sun')}</span>
        </div>

        {days.map((day) => {
          const relation = dayRelation(day.date, today)
          const left = ((day.min - scaleLow) / span) * 100
          const width = Math.max(3, ((day.max - day.min) / span) * 100)
          const condition = describeWeather(day.code)
          const amount = formatRain(day.precipSum, units)
          const wind = formatSpeed(day.windMax ?? 0, units)
          return (
            <div className={`week-row ${relation === 'today' ? 'is-today' : ''}`} key={day.date}>
              <span className="day-id">
                <span className="day-name">{relation === 'today' ? t('week.today') : weekdayShort(day.date)}</span>
                <span className="day-date">
                  {formatDayNumber(day.date)} {monthShort(day.date)}
                </span>
              </span>
              <span className="day-sky">
                <Sigil code={day.code} isDay />
                <span>{condition.short}</span>
              </span>
              <span className="day-range">
                <b>
                  {temperature(day.min, units)}
                  <i>°</i>
                </b>
                <span className="range-track">
                  <span
                    className="range-fill"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background: `linear-gradient(90deg, ${temperatureColor(day.min, mode)}, ${temperatureColor(day.max, mode)})`,
                    }}
                  />
                </span>
                <b className="is-high">
                  {temperature(day.max, units)}
                  <i>°</i>
                </b>
              </span>
              <span className="day-rain">
                <b>{day.precipProbabilityMax == null ? '—' : `${Math.round(day.precipProbabilityMax)}%`}</b>
                <i>
                  {amount.value} {amount.unit}
                </i>
              </span>
              <span className="day-uv">
                <b>{formatUv(day.uvMax)}</b>
                <i>{t('week.uv')}</i>
              </span>
              <span className="day-wind">
                <b>{wind.value}</b>
                <i>{wind.unit}</i>
              </span>
              <span className="day-sun">
                <span>
                  <i className="sun-up" aria-hidden="true" />
                  {formatClock(day.sunrise)}
                </span>
                <span>
                  <i className="sun-down" aria-hidden="true" />
                  {formatClock(day.sunset)}
                </span>
              </span>
              {/* Narrow layouts fold the UV, wind and sun columns into this line
                  so no forecast field is lost on small screens. */}
              <span className="day-extras">
                <span>
                  <i>{t('week.uv')}</i> {formatUv(day.uvMax)}
                </span>
                <span>
                  <i>{t('week.wind')}</i> {wind.value} {wind.unit}
                </span>
                <span>
                  <i>{t('week.sun')}</i> {formatClock(day.sunrise)}–{formatClock(day.sunset)}
                </span>
              </span>
            </div>
          )
        })}
      </div>

      <div className="sr-only">
        <table>
          <caption>{t('week.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('week.day')}</th>
            <th scope="col">{t('tape.condition')}</th>
            <th scope="col">{t('week.min')}</th>
            <th scope="col">{t('week.max')}</th>
            <th scope="col">{t('tape.chance')}</th>
            <th scope="col">{t('tape.precipitation')}</th>
            <th scope="col">{t('week.uvIndex')}</th>
            <th scope="col">{t('week.maxWind')}</th>
            <th scope="col">{t('week.sunrise')}</th>
            <th scope="col">{t('week.sunset')}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const amount = formatRain(day.precipSum, units)
            const wind = formatSpeed(day.windMax ?? 0, units)
            return (
              <tr key={day.date}>
                <th scope="row">
                  {weekdayShort(day.date)} {formatDayNumber(day.date)} {monthShort(day.date)}
                  {day.date === today ? t('week.todaySuffix') : ''}
                </th>
                <td>{describeWeather(day.code).label}</td>
                <td>{temperature(day.min, units)}°</td>
                <td>{temperature(day.max, units)}°</td>
                <td>{day.precipProbabilityMax == null ? '—' : `${Math.round(day.precipProbabilityMax)}%`}</td>
                <td>
                  {amount.value} {amount.unit}
                </td>
                <td>{formatUv(day.uvMax)}</td>
                <td>
                  {wind.value} {wind.unit}
                </td>
                <td>{formatClock(day.sunrise)}</td>
                <td>{formatClock(day.sunset)}</td>
              </tr>
            )
          })}
        </tbody>
        </table>
      </div>
    </section>
  )
}
