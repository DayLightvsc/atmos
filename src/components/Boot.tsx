import { coordinates } from '../lib/format'
import { t } from '../lib/i18n'
import type { Place } from '../lib/types'
import { RefreshIcon, SearchIcon } from './Icons'

interface BootProps {
  place: Place
  status: 'loading' | 'error'
  error: string | null
  onRetry: () => void
  onSearch: () => void
}

export function Boot({ place, status, error, onRetry, onSearch }: BootProps) {
  const region = [place.admin1, place.country].filter(Boolean).join(', ')
  return (
    <section className="boot" aria-live="polite">
      <p className="boot-eyebrow">
        <span className="signal-dot is-syncing" aria-hidden="true" />
        {status === 'error' ? t('app.signalInterrupted') : t('boot.acquiring')}
      </p>
      <h1 className="boot-city">{place.name}</h1>
      <p className="boot-region">
        {region} · {coordinates(place.latitude, place.longitude)}
      </p>
      <div className={`boot-rule ${status === 'error' ? 'is-error' : ''}`} aria-hidden="true">
        <span />
      </div>
      <p className="boot-message">
        {status === 'error'
          ? error ?? t('boot.unreachable')
          : t('boot.listening')}
      </p>
      {status === 'error' && (
        <div className="boot-actions">
          <button type="button" className="button-primary" onClick={onRetry}>
            <RefreshIcon size={16} /> {t('boot.tryAgain')}
          </button>
          <button type="button" className="button-quiet" onClick={onSearch}>
            <SearchIcon size={16} /> {t('boot.chooseOther')}
          </button>
        </div>
      )}
    </section>
  )
}
