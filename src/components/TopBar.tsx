import { useNow } from '../hooks/useNow'
import { t } from '../lib/i18n'
import { formatClockWithSeconds, formatDayNumber, monthShort, wallClockParts, weekdayShort } from '../lib/time'
import type { Language, Units } from '../lib/types'
import { LocateIcon, RefreshIcon, SearchIcon, StarIcon } from './Icons'
import { LanguageSwitch } from './LanguageSwitch'
import { Mark } from './Mark'

interface TopBarProps {
  offsetSeconds: number
  tzAbbr: string | null
  units: Units
  onUnits: (units: Units) => void
  language: Language
  onLanguage: (language: Language) => void
  onSearch: () => void
  onLocate: () => void
  onRefresh: () => void
  onToggleFavorite: () => void
  isFavorite: boolean
  refreshing: boolean
  locating: boolean
  progress: number | null
  night: boolean
  placeName: string
}

export function TopBar({
  offsetSeconds,
  tzAbbr,
  units,
  onUnits,
  language,
  onLanguage,
  onSearch,
  onLocate,
  onRefresh,
  onToggleFavorite,
  isFavorite,
  refreshing,
  locating,
  progress,
  night,
  placeName,
}: TopBarProps) {
  const now = useNow(1000)
  const parts = wallClockParts(offsetSeconds, now)
  const dateStr = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
  const time = formatClockWithSeconds(parts, now.getSeconds())

  return (
    <header className="topbar">
      <a className="brand" href="./" aria-label={t('topbar.reload')}>
        <Mark progress={progress} night={night} />
        <span className="brand-name">ATMOS</span>
        <span className="brand-tag">{t('app.tagline')}</span>
      </a>

      <div className="topbar-clock" aria-label={t('topbar.localTime')}>
        <span className="clock-time">
          {time}
          <span className="clock-zone">{tzAbbr ?? t('topbar.local')}</span>
        </span>
        <span className="clock-date">
          {weekdayShort(dateStr)} {formatDayNumber(dateStr)} {monthShort(dateStr)} {parts.year}
        </span>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className={`icon-btn ${isFavorite ? 'is-pinned' : ''}`}
          onClick={onToggleFavorite}
          aria-pressed={isFavorite}
          aria-label={t(isFavorite ? 'topbar.removeFavorite' : 'topbar.saveFavorite', { name: placeName })}
          title={t(isFavorite ? 'topbar.removeTitle' : 'topbar.saveTitle')}
        >
          <StarIcon filled={isFavorite} />
        </button>

        <div className="units" role="group" aria-label={t('topbar.units')}>
          <button
            type="button"
            className={units === 'metric' ? 'is-active' : ''}
            aria-pressed={units === 'metric'}
            onClick={() => onUnits('metric')}
          >
            °C
          </button>
          <button
            type="button"
            className={units === 'imperial' ? 'is-active' : ''}
            aria-pressed={units === 'imperial'}
            onClick={() => onUnits('imperial')}
          >
            °F
          </button>
        </div>

        <LanguageSwitch language={language} onLanguage={onLanguage} className="topbar-lang" />

        <button type="button" className="search-trigger" onClick={onSearch} aria-label={t('topbar.searchAria')}>
          <SearchIcon />
          <span className="search-trigger-label">{t('topbar.search')}</span>
          <kbd>⌘K</kbd>
        </button>

        <button
          type="button"
          className={`icon-btn locate-btn ${locating ? 'is-locating' : ''}`}
          onClick={onLocate}
          disabled={locating}
          aria-busy={locating}
          aria-label={t('topbar.locate')}
          title={t('topbar.locate')}
        >
          <LocateIcon />
        </button>

        <button
          type="button"
          className="icon-btn refresh-btn"
          onClick={onRefresh}
          disabled={refreshing}
          aria-busy={refreshing}
          aria-label={t('topbar.refresh')}
          title={t('topbar.refreshTitle')}
        >
          <RefreshIcon className={refreshing ? 'spin' : ''} />
        </button>
      </div>
    </header>
  )
}
