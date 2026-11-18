import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Atmosphere } from './components/Atmosphere'
import { Boot } from './components/Boot'
import { CitySearch } from './components/CitySearch'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { HourlyTape } from './components/HourlyTape'
import { Particulars } from './components/Particulars'
import { StationsRail } from './components/StationsRail'
import { Toast } from './components/Toast'
import { TopBar } from './components/TopBar'
import { WeekAhead } from './components/WeekAhead'
import { useNow } from './hooks/useNow'
import { useReducedMotion } from './hooks/useMediaQuery'
import { useSkyTheme } from './hooks/useSkyTheme'
import { useWeather } from './hooks/useWeather'
import { reverseGeocode } from './lib/api'
import { temperature } from './lib/format'
import { setActiveLanguage, t } from './lib/i18n'
import { paletteFor, PALETTES } from './lib/palettes'
import { localizePlace } from './lib/places'
import { currentDay, deriveSky, hourlyFromNow, outlookDays, todayKeyFor } from './lib/sky'
import { DEFAULT_PLACE, loadPreferences, rememberPlace, savePreferences, toggleFavorite } from './lib/storage'
import { describeWeather, visualMood } from './lib/weatherCodes'
import type { Language, Place, ToastMessage, Units } from './lib/types'

const FX_CODES: Record<string, number> = {
  clear: 0,
  cloud: 3,
  fog: 45,
  drizzle: 51,
  rain: 63,
  snow: 73,
  storm: 95,
}

function readOverrides(): { paletteId: string | null; fx: number | null } {
  if (!import.meta.env.DEV) return { paletteId: null, fx: null }
  try {
    const params = new URLSearchParams(window.location.search)
    const paletteId = params.get('sky')
    const fx = params.get('fx')
    return {
      paletteId: paletteId && PALETTES[paletteId] ? paletteId : null,
      fx: fx && fx in FX_CODES ? FX_CODES[fx] : null,
    }
  } catch {
    return { paletteId: null, fx: null }
  }
}

function geolocationMessage(error: GeolocationPositionError): { title: string; detail: string } {
  if (error.code === error.PERMISSION_DENIED) {
    return { title: t('geo.refusedTitle'), detail: t('geo.refusedDetail') }
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return { title: t('geo.noFixTitle'), detail: t('geo.noFixDetail') }
  }
  return { title: t('geo.timeoutTitle'), detail: t('geo.timeoutDetail') }
}

export default function App() {
  const [prefs, setPrefs] = useState(() => loadPreferences())
  const [searchOpen, setSearchOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const now = useNow(30000)
  const reducedMotion = useReducedMotion()
  const manualChoiceAt = useRef(0)
  const locateStartedAt = useRef(0)

  // Pure formatters read the active language; set it before any child renders.
  setActiveLanguage(prefs.language)

  const place = useMemo(
    () => localizePlace(prefs.lastPlace ?? DEFAULT_PLACE),
    [prefs.lastPlace, prefs.language],
  )

  const pushToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    setToast({ ...message, id: Date.now() })
  }, [])

  const onWeatherError = useCallback(
    (message: string) => {
      pushToast({ tone: 'warn', title: t('app.signalInterrupted'), detail: message })
    },
    [pushToast],
  )

  const weather = useWeather(place, onWeatherError)
  const forecast = weather.data

  useEffect(() => {
    savePreferences(prefs)
  }, [prefs])

  useEffect(() => {
    document.documentElement.lang = prefs.language
  }, [prefs.language])

  const notFound = weather.status === 'error' && !forecast
  const overrides = useMemo(readOverrides, [])
  const fxCloud =
    overrides.fx == null
      ? null
      : overrides.fx === 0
        ? 4
        : overrides.fx === 3
          ? 82
          : overrides.fx === 45
            ? 92
            : 98

  const sky = useMemo(() => {
    const base = deriveSky(forecast, place, now)
    if (overrides.paletteId) {
      return { ...base, palette: PALETTES[overrides.paletteId] }
    }
    if (overrides.fx != null) {
      const group = describeWeather(overrides.fx).group
      const cloud = fxCloud ?? forecast?.now.cloudCover ?? 65
      const mood = visualMood(group, cloud)
      return { ...base, mood, palette: paletteFor(base.phase, mood) }
    }
    return base
  }, [forecast, place, now, overrides, fxCloud, prefs.language])

  const paletteRef = useSkyTheme(sky.palette)

  const fxCode = overrides.fx
  const hours24 = forecast ? hourlyFromNow(forecast, now).hours : []
  const today = forecast ? currentDay(forecast, now) : null
  const outlook = forecast ? outlookDays(forecast, now) : []
  const todayStamp = forecast ? todayKeyFor(forecast, now) : ''
  const isFavorite = prefs.favorites.some((favorite) => favorite.id === place.id)
  const currentHour = forecast
    ? forecast.hours.find((hour) => hour.time.slice(0, 13) === forecast.now.time.slice(0, 13)) ?? null
    : null

  const atmosphereCode = fxCode ?? forecast?.now.code ?? 0
  const atmospherePrecip = forecast?.now.precipitation ?? 0
  const atmosphereProbability = currentHour?.precipProbability ?? 0

  useEffect(() => {
    if (!forecast) {
      document.title = t('title.loading', { place: place.name })
      return
    }
    const condition = describeWeather(forecast.now.code)
    document.title = t('title.ready', {
      place: place.name,
      temp: temperature(forecast.now.temperature, prefs.units),
      condition: condition.label,
    })
  }, [forecast, place.name, prefs.units, prefs.language])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (typing) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        return
      }
      if (event.key === '/') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const choosePlace = useCallback(
    (next: Place, note?: { title: string; detail: string }) => {
      if (!note) manualChoiceAt.current = Date.now()
      setPrefs((previous) => rememberPlace(previous, next))
      setSearchOpen(false)
      if (note) pushToast({ tone: 'info', ...note })
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      window.scrollTo({ top: 0, behavior })
    },
    [pushToast],
  )

  const onToggleFavorite = useCallback(() => {
    const wasFavorite = prefs.favorites.some((favorite) => favorite.id === place.id)
    setPrefs((previous) => toggleFavorite(previous, place).prefs)
    pushToast({
      tone: 'info',
      title: wasFavorite ? t('toast.stationRemoved') : t('toast.stationPinned'),
      detail: t(wasFavorite ? 'toast.removedDetail' : 'toast.pinnedDetail', { name: place.name }),
    })
  }, [place, prefs.favorites, pushToast])

  const onRemoveFavorite = useCallback(
    (target: Place) => {
      setPrefs((previous) => toggleFavorite(previous, target).prefs)
      const shown = localizePlace(target)
      pushToast({
        tone: 'info',
        title: t('toast.stationRemoved'),
        detail: t('toast.removedDetail', { name: shown.name }),
      })
    },
    [pushToast],
  )

  const onUnits = useCallback((units: Units) => {
    setPrefs((previous) => ({ ...previous, units }))
  }, [])

  const onLanguage = useCallback((language: Language) => {
    setPrefs((previous) => ({ ...previous, language }))
  }, [])

  const onLocate = useCallback(() => {
    if (!window.isSecureContext) {
      pushToast({
        tone: 'warn',
        title: t('geo.secureTitle'),
        detail: t('geo.secureDetail'),
      })
      return
    }
    if (!('geolocation' in navigator)) {
      pushToast({
        tone: 'warn',
        title: t('geo.unavailableTitle'),
        detail: t('geo.unavailableDetail'),
      })
      return
    }
    setLocating(true)
    locateStartedAt.current = Date.now()
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const found = await reverseGeocode(latitude, longitude, prefs.language)
        // A place chosen while the fix was in flight wins over the device fix.
        if (manualChoiceAt.current > locateStartedAt.current) {
          setLocating(false)
          return
        }
        const next: Place =
          found ?? {
            id: `here-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
            name: t('app.currentPosition'),
            country: t('app.nearby'),
            latitude,
            longitude,
          }
        setLocating(false)
        choosePlace(next, {
          title: t('geo.acquiredTitle'),
          detail: found ? t('geo.acquiredDetail', { name: found.name }) : t('geo.acquiredUnknown'),
        })
      },
      (error) => {
        setLocating(false)
        const message = geolocationMessage(error)
        pushToast({ tone: 'warn', ...message })
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    )
  }, [choosePlace, prefs.language, pushToast])

  const appStyle = {
    '--glow-x': `${sky.glow.x}%`,
    '--glow-y': `${sky.glow.y}%`,
    '--glow-strength': sky.glow.strength.toFixed(3),
  } as React.CSSProperties

  return (
    <div
      className="app"
      data-mode={sky.palette.mode}
      data-phase={sky.phase}
      data-mood={sky.mood}
      data-palette={sky.palette.id}
      style={appStyle}
    >
      <div className="sky" aria-hidden="true">
        <div className="sky-wash" />
        <div className="sky-glow" />
        <Atmosphere
          palette={sky.palette}
          paletteRef={paletteRef}
          cloudCover={fxCloud ?? forecast?.now.cloudCover ?? 0}
          precipitation={atmospherePrecip}
          precipProbability={atmosphereProbability}
          windSpeed={forecast?.now.windSpeed ?? 0}
          code={atmosphereCode}
          stars={sky.stars}
          reducedMotion={reducedMotion}
        />
        <div className="sky-vignette" />
        <div className="sky-grain" />
      </div>

      <a className="skip-link" href="#main">
        {t('app.skipLink')}
      </a>

      <TopBar
        offsetSeconds={forecast?.place.utcOffsetSeconds ?? 0}
        tzAbbr={forecast?.place.timezoneAbbr ?? null}
        units={prefs.units}
        onUnits={onUnits}
        language={prefs.language}
        onLanguage={onLanguage}
        onSearch={() => setSearchOpen(true)}
        onLocate={onLocate}
        onRefresh={weather.refresh}
        onToggleFavorite={onToggleFavorite}
        isFavorite={isFavorite}
        refreshing={weather.refreshing}
        locating={locating}
        progress={sky.daylight.progress}
        night={sky.sun.elevation < 0}
        placeName={place.name}
      />

      <div className="shell">
        <StationsRail
          favorites={prefs.favorites}
          current={place}
          onSelect={(next) => choosePlace(next)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        <div className="column">
          <main id="main" className="main">
            {forecast ? (
              <>
                <Hero
                  place={place}
                  forecast={forecast}
                  sky={sky}
                  units={prefs.units}
                  today={today}
                  now={now}
                  onOpenSearch={() => setSearchOpen(true)}
                  onRefresh={weather.refresh}
                  stale={Boolean(weather.error)}
                  refreshing={weather.refreshing}
                  isFavorite={isFavorite}
                  onToggleFavorite={onToggleFavorite}
                />
                <div className="console">
                  <HourlyTape
                    hours={hours24}
                    units={prefs.units}
                    offsetSeconds={forecast.place.utcOffsetSeconds}
                    now={now}
                  />
                  <WeekAhead
                    days={outlook}
                    units={prefs.units}
                    today={todayStamp}
                    mode={sky.palette.mode}
                  />
                  <Particulars forecast={forecast} sky={sky} today={today} now={now} hours24={hours24} />
                </div>
              </>
            ) : (
              <Boot
                place={place}
                status={notFound ? 'error' : 'loading'}
                error={weather.error}
                onRetry={weather.refresh}
                onSearch={() => setSearchOpen(true)}
              />
            )}
          </main>

          {forecast ? (
            <Footer place={place} forecast={forecast} />
          ) : (
            <footer className="footer footer--slim">
              <p>
                {t('footer.dataBy')}{' '}
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                  Open-Meteo
                </a>{' '}
                ·{' '}
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
                  CC BY 4.0
                </a>
                .
              </p>
            </footer>
          )}
        </div>
      </div>

      <CitySearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(next) => choosePlace(next)}
        onRemoveFavorite={onRemoveFavorite}
        favorites={prefs.favorites}
        recent={prefs.recent}
        current={place}
        onLocate={onLocate}
        locating={locating}
        language={prefs.language}
        onLanguage={onLanguage}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
