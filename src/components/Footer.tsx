import { useNow } from '../hooks/useNow'
import { coordinates } from '../lib/format'
import { t } from '../lib/i18n'
import { formatRelativeTime, formatUtcOffset } from '../lib/time'
import type { Forecast, Place } from '../lib/types'
import { Mark } from './Mark'

interface FooterProps {
  place: Place
  forecast: Forecast
}

export function Footer({ place, forecast }: FooterProps) {
  const now = useNow(60000)
  const updated = formatRelativeTime(forecast.fetchedAt, now.getTime())

  return (
    <footer className="footer">
      <div className="footer-brand">
        <Mark progress={0.5} night={false} />
        <div>
          <span className="footer-name">ATMOS</span>
          <span className="footer-tag">{t('app.footerTagline')}</span>
        </div>
      </div>

      <div className="footer-data">
        <p>
          {t('footer.dataBy')}{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.{' '}
          {t('footer.creditExtra')}
        </p>
        <p className="footer-fine">{t('footer.privacy')}</p>
      </div>

      <div className="footer-station">
        <span>{place.name}</span>
        <span>{coordinates(place.latitude, place.longitude)}</span>
        <span>
          {formatUtcOffset(forecast.place.utcOffsetSeconds)} · {t('footer.updated', { when: updated })}
        </span>
      </div>
    </footer>
  )
}
