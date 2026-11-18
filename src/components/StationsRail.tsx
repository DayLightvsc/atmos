import { t } from '../lib/i18n'
import { localizePlace } from '../lib/places'
import type { Place } from '../lib/types'
import { StarIcon } from './Icons'

interface StationsRailProps {
  favorites: Place[]
  current: Place
  onSelect: (place: Place) => void
  onOpenSearch: () => void
}

export function StationsRail({ favorites, current, onSelect, onOpenSearch }: StationsRailProps) {
  return (
    <div className="stations-rail">
      <span className="rail-label">{t('stations.saved')}</span>
      <div className="rail-list">
        {favorites.length === 0 && (
          <span className="rail-empty">
            <StarIcon size={12} /> {t('stations.empty')}
          </span>
        )}
        {favorites.map((place) => {
          const active = place.id === current.id
          const shown = localizePlace(place)
          return (
            <button
              key={place.id}
              type="button"
              className={`station-chip ${active ? 'is-active' : ''}`}
              onClick={() => onSelect(place)}
              aria-current={active ? 'true' : undefined}
              title={`${shown.admin1 ? `${shown.admin1}, ` : ''}${shown.country}`}
            >
              <span className="chip-dot" aria-hidden="true" />
              {shown.name}
            </button>
          )
        })}
      </div>
      <button type="button" className="rail-add" onClick={onOpenSearch}>
        {t('stations.add')} <span aria-hidden="true">+</span>
      </button>
    </div>
  )
}
