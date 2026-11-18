import { useEffect, useMemo, useRef, useState } from 'react'
import { searchPlaces } from '../lib/api'
import { coordinates } from '../lib/format'
import { t, pluralize } from '../lib/i18n'
import { FIELD_STATIONS, localizePlace } from '../lib/places'
import type { Language, Place } from '../lib/types'
import { CloseIcon, LocateIcon, SearchIcon, StarIcon } from './Icons'
import { LanguageSwitch } from './LanguageSwitch'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface CitySearchProps {
  open: boolean
  onClose: () => void
  onSelect: (place: Place) => void
  onRemoveFavorite: (place: Place) => void
  favorites: Place[]
  recent: Place[]
  current: Place
  onLocate: () => void
  locating: boolean
  language: Language
  onLanguage: (language: Language) => void
}

function PlaceRow({
  place,
  onSelect,
  active,
  current,
  trailing,
}: {
  place: Place
  onSelect: () => void
  active?: boolean
  current?: boolean
  trailing?: React.ReactNode
}) {
  const shown = localizePlace(place)
  return (
    <div className={`place-row ${active ? 'is-active' : ''} ${current ? 'is-current' : ''}`}>
      <button type="button" className="place-select" onClick={onSelect}>
        <span className="place-name">
          {shown.name}
          {current && <span className="place-current">{t('search.current')}</span>}
        </span>
        <span className="place-region">{[shown.admin1, shown.country].filter(Boolean).join(', ')}</span>
        <span className="place-coords">{coordinates(place.latitude, place.longitude)}</span>
      </button>
      {trailing}
    </div>
  )
}

export function CitySearch({
  open,
  onClose,
  onSelect,
  onRemoveFavorite,
  favorites,
  recent,
  current,
  onLocate,
  locating,
  language,
  onLanguage,
}: CitySearchProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [results, setResults] = useState<Place[]>([])
  const [active, setActive] = useState(0)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
      document.body.classList.add('is-dialog-open')
      setQuery('')
      setResults([])
      setStatus('idle')
      setActive(0)
      const timer = window.setTimeout(() => inputRef.current?.focus(), 60)
      return () => window.clearTimeout(timer)
    }
    if (dialog.open) dialog.close()
    document.body.classList.remove('is-dialog-open')
    return undefined
  }, [open])

  useEffect(() => {
    return () => document.body.classList.remove('is-dialog-open')
  }, [])

  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([])
      setStatus('idle')
      return undefined
    }
    setStatus('loading')
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(trimmed, language, controller.signal)
        .then((places) => {
          if (controller.signal.aborted) return
          setResults(places)
          setStatus('ready')
          setActive(0)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setStatus('error')
        })
    }, 300)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [trimmed, retryToken, language])

  useEffect(() => {
    if (status !== 'ready') return
    const node = document.getElementById(`search-option-${active}`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [active, status])

  const suggestions = useMemo(() => {
    const taken = new Set([...favorites.map((p) => p.id), ...recent.map((p) => p.id)])
    return FIELD_STATIONS.filter((p) => !taken.has(p.id))
  }, [favorites, recent])

  const choose = (place: Place) => {
    onSelect(place)
    onClose()
  }

  const placeWord = pluralize(results.length, {
    one: t('search.placeOne'),
    few: t('search.placeFew'),
    many: t('search.placesMany'),
  })

  return (
    <dialog
      ref={dialogRef}
      className="search-dialog"
      aria-label={t('search.findStation')}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="search-panel">
        <header className="search-head">
          <span className="search-eyebrow">{t('search.findStation')}</span>
          <span className="search-count" aria-live="polite">
            {status === 'ready' && trimmed.length >= 2
              ? t('search.placesCount', { count: results.length, word: placeWord })
              : t('search.gazetteer')}
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('search.close')}>
            <CloseIcon />
          </button>
        </header>

        <div className="search-field">
          <SearchIcon size={22} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={trimmed.length >= 2}
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-activedescendant={status === 'ready' && results.length > 0 ? `search-option-${active}` : undefined}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                if (results.length > 0) setActive((value) => (value + 1) % results.length)
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                if (results.length > 0) setActive((value) => (value - 1 + results.length) % results.length)
              } else if (event.key === 'Enter') {
                event.preventDefault()
                if (status === 'ready' && results[active]) choose(results[active])
              } else if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>

        <button type="button" className="locate-row" onClick={onLocate} disabled={locating}>
          <LocateIcon />
          <span>{locating ? t('search.locating') : t('search.useLocation')}</span>
          <span className="locate-tag">{locating ? t('search.locatingTag') : 'GPS'}</span>
        </button>

        <div className="search-body">
          {trimmed.length >= 2 ? (
            <div id="search-results" role="listbox" aria-label={t('search.results')}>
              {status === 'loading' && (
                <div className="search-skeleton" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              )}
              {status === 'error' && (
                <div className="search-empty">
                  <p>{t('search.unreachable')}</p>
                  <p>{t('search.checkConnection')}</p>
                  <button type="button" className="text-button" onClick={() => setRetryToken((value) => value + 1)}>
                    {t('search.tryAgain')}
                  </button>
                </div>
              )}
              {status === 'ready' && results.length === 0 && (
                <div className="search-empty">
                  <p>{t('search.noPlace', { query: trimmed })}</p>
                  <p>{t('search.tryHint')}</p>
                </div>
              )}
              {status === 'ready' && results.length > 0 && (
                <ul className="result-list">
                  {results.map((place, index) => {
                    const shown = localizePlace(place)
                    return (
                      <li
                        key={`${place.id}-${index}`}
                        id={`search-option-${index}`}
                        role="option"
                        aria-selected={index === active}
                        className={`result-row ${index === active ? 'is-active' : ''}`}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => choose(place)}
                      >
                        <span className="result-name">{shown.name}</span>
                        <span className="result-region">
                          {[shown.admin1, shown.country].filter(Boolean).join(', ')}
                        </span>
                        <span className="result-coords">{coordinates(place.latitude, place.longitude)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="search-idle">
              {favorites.length > 0 && (
                <section className="search-group">
                  <h3>{t('search.saved')}</h3>
                  {favorites.map((place) => (
                    <PlaceRow
                      key={place.id}
                      place={place}
                      current={place.id === current.id}
                      onSelect={() => choose(place)}
                      trailing={
                        <button
                          type="button"
                          className="place-remove"
                          aria-label={t('search.removeFavorite', { name: localizePlace(place).name })}
                          onClick={() => onRemoveFavorite(place)}
                        >
                          <StarIcon size={14} filled />
                        </button>
                      }
                    />
                  ))}
                </section>
              )}
              {recent.length > 0 && (
                <section className="search-group">
                  <h3>{t('search.recent')}</h3>
                  {recent.map((place) => (
                    <PlaceRow
                      key={place.id}
                      place={place}
                      current={place.id === current.id}
                      onSelect={() => choose(place)}
                    />
                  ))}
                </section>
              )}
              <section className="search-group">
                <h3>{t('search.field')}</h3>
                {suggestions.map((place) => (
                  <PlaceRow key={place.id} place={place} onSelect={() => choose(place)} />
                ))}
              </section>
            </div>
          )}
        </div>

        <footer className="search-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {t('search.browse')}
          </span>
          <span>
            <kbd>↵</kbd> {t('search.select')}
          </span>
          <span>
            <kbd>esc</kbd> {t('search.closeKey')}
          </span>
          <LanguageSwitch
            language={language}
            onLanguage={onLanguage}
            className="search-foot-lang"
          />
          <span className="search-foot-credit">{t('search.credit')}</span>
        </footer>
      </div>
    </dialog>
  )
}
