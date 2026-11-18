import { getLanguage } from './i18n'
import type { Place } from './types'

/** A small editorial atlas used as search suggestions. Every entry is a real
 *  station with real coordinates; selecting one loads live data. */
export const FIELD_STATIONS: Place[] = [
  {
    id: 'field-reykjavik',
    name: 'Reykjavík',
    country: 'Iceland',
    countryCode: 'IS',
    admin1: 'Capital Region',
    latitude: 64.1466,
    longitude: -21.9426,
    timezone: 'Atlantic/Reykjavik',
  },
  {
    id: 'field-tromso',
    name: 'Tromsø',
    country: 'Norway',
    countryCode: 'NO',
    admin1: 'Troms',
    latitude: 69.6492,
    longitude: 18.9553,
    timezone: 'Europe/Oslo',
  },
  {
    id: 'field-lisbon',
    name: 'Lisbon',
    country: 'Portugal',
    countryCode: 'PT',
    admin1: 'Lisboa',
    latitude: 38.7223,
    longitude: -9.1393,
    timezone: 'Europe/Lisbon',
  },
  {
    id: 'field-kyoto',
    name: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    admin1: 'Kyoto',
    latitude: 35.0116,
    longitude: 135.7681,
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'field-capetown',
    name: 'Cape Town',
    country: 'South Africa',
    countryCode: 'ZA',
    admin1: 'Western Cape',
    latitude: -33.9249,
    longitude: 18.4241,
    timezone: 'Africa/Johannesburg',
  },
  {
    id: 'field-ushuaia',
    name: 'Ushuaia',
    country: 'Argentina',
    countryCode: 'AR',
    admin1: 'Tierra del Fuego',
    latitude: -54.8019,
    longitude: -68.303,
    timezone: 'America/Argentina/Ushuaia',
  },
  {
    id: 'field-singapore',
    name: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: 'Asia/Singapore',
  },
]

interface LocalizedMeta {
  name: string
  country: string
  admin1?: string
}

const RUSSIAN_STATIONS: Record<string, LocalizedMeta> = {
  'geo-3413829': { name: 'Рейкьявик', country: 'Исландия', admin1: 'Столичный регион' },
  'field-reykjavik': { name: 'Рейкьявик', country: 'Исландия', admin1: 'Столичный регион' },
  'field-tromso': { name: 'Тромсё', country: 'Норвегия', admin1: 'Тромс' },
  'field-lisbon': { name: 'Лиссабон', country: 'Португалия', admin1: 'Лиссабон' },
  'field-kyoto': { name: 'Киото', country: 'Япония', admin1: 'Киото' },
  'field-capetown': { name: 'Кейптаун', country: 'ЮАР', admin1: 'Западный Кейп' },
  'field-ushuaia': { name: 'Ушуая', country: 'Аргентина', admin1: 'Огненная Земля' },
  'field-singapore': { name: 'Сингапур', country: 'Сингапур' },
}

/** Known stations keep a Russian reading; geocoded places arrive localized
 *  from Open-Meteo in the language they were searched in. */
export function localizePlace(place: Place): Place {
  if (getLanguage() !== 'ru') return place
  const meta = RUSSIAN_STATIONS[place.id]
  if (!meta) return place
  return {
    ...place,
    name: meta.name,
    country: meta.country,
    admin1: meta.admin1 ?? place.admin1,
  }
}
