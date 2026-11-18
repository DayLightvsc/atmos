import { mixHex, rgbChannels } from './color'
import type { Phase } from './types'

export type SkyMood = 'clear' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm'

export interface Palette {
  id: string
  mode: 'light' | 'dark'
  sky: [string, string, string, string]
  glow: string
  glowOpacity: number
  ink: string
  accent: string
  sun: string
  moon: string
  cloud: string
  precip: string
  star: string
}

function palette(
  id: string,
  mode: 'light' | 'dark',
  sky: [string, string, string, string],
  glow: string,
  glowOpacity: number,
  ink: string,
  accent: string,
  sun: string,
  moon: string,
  cloud: string,
  precip: string,
  star: string,
): Palette {
  return { id, mode, sky, glow, glowOpacity, ink, accent, sun, moon, cloud, precip, star }
}

/** Every sky is a complete, hand-tuned world: paper daylight inverts the interface,
 *  rain deepens it, night turns the page to ink. */
export const PALETTES: Record<string, Palette> = {
  'day-clear': palette(
    'day-clear', 'light',
    ['#f8eed9', '#f5dfbf', '#f1cfa4', '#ecc190'],
    '#ffd489', 0.62, '#2b2116', '#b14318',
    '#fff0c9', '#f4ecd8', '#e4d3b8', '#5d8494', '#6b5c44',
  ),
  'day-cloud': palette(
    'day-cloud', 'light',
    ['#eae8e1', '#e0ded7', '#d3d2cb', '#c8c8c1'],
    '#f7f2e6', 0.26, '#22262a', '#3f6470',
    '#f7f2df', '#eee9db', '#f7f5ef', '#547282', '#5a6068',
  ),
  'day-fog': palette(
    'day-fog', 'light',
    ['#e8e6dd', '#dedcd2', '#d1d0c5', '#c6c6ba'],
    '#f0ecdc', 0.2, '#26261f', '#586a56',
    '#f2eeda', '#e8e4d5', '#f3f1e8', '#64756c', '#585a50',
  ),
  'day-snow': palette(
    'day-snow', 'light',
    ['#eff6f9', '#e5eff3', '#d7e6ec', '#ccdfe7'],
    '#f5fbff', 0.4, '#1d2a32', '#2f6d86',
    '#ffffff', '#edf4fa', '#ffffff', '#5d95aa', '#4a5b66',
  ),
  'day-rain': palette(
    'day-rain', 'dark',
    ['#263741', '#1e2d36', '#17242c', '#111b21'],
    '#a9cbd4', 0.16, '#e7f1f2', '#7cc7d6',
    '#efe5cf', '#e2edf2', '#8ca4ac', '#a7d9e3', '#a8c0c8',
  ),
  'day-storm': palette(
    'day-storm', 'dark',
    ['#191b2a', '#141622', '#10111c', '#0a0b13'],
    '#a9a3e8', 0.18, '#e7e6f2', '#b8b0ff',
    '#e9e4c9', '#e2e0ee', '#77738f', '#aab6f2', '#a8aac8',
  ),

  'night-clear': palette(
    'night-clear', 'dark',
    ['#060a16', '#0a1122', '#101a31', '#182541'],
    '#c9d8ff', 0.18, '#e9eef8', '#e6c68b',
    '#cfd9ef', '#f1eedd', '#7f8da8', '#9fc7dd', '#e9eef8',
  ),
  'night-cloud': palette(
    'night-cloud', 'dark',
    ['#0f1218', '#12161d', '#161b24', '#1c222d'],
    '#cbd3de', 0.08, '#dfe2e8', '#aab7c9',
    '#d7dbe4', '#eceada', '#96a0ae', '#a9c3cf', '#c6cedb',
  ),
  'night-rain': palette(
    'night-rain', 'dark',
    ['#070f18', '#09151f', '#0c1b26', '#112430'],
    '#93c1cf', 0.08, '#dcebef', '#6fc3d9',
    '#d5dbe4', '#e6ecf0', '#6f8b98', '#9ed4df', '#9db6c0',
  ),
  'night-snow': palette(
    'night-snow', 'dark',
    ['#0b141f', '#0f1c29', '#142535', '#1a2e40'],
    '#c9e6f2', 0.1, '#e6f1f6', '#9dd6e8',
    '#dce3ec', '#eff3f4', '#88a1b1', '#d7f0fa', '#bdd3de',
  ),
  'night-storm': palette(
    'night-storm', 'dark',
    ['#0a0b15', '#0d0f1b', '#111526', '#171c30'],
    '#a89ef0', 0.12, '#e4e2f0', '#b3a9f2',
    '#d9d5e8', '#e8e4ee', '#6b6890', '#b0b8ff', '#b3b0d0',
  ),
  'night-fog': palette(
    'night-fog', 'dark',
    ['#11120e', '#161712', '#1b1c17', '#22231e'],
    '#d4cfb8', 0.07, '#e3e1d5', '#c0b48f',
    '#ded9c8', '#ece7d6', '#8b8a7c', '#b9b7a2', '#b6b3a0',
  ),

  'dawn-clear': palette(
    'dawn-clear', 'dark',
    ['#131a2e', '#2b2b44', '#6a4250', '#c47c63'],
    '#ffc08a', 0.5, '#f6ede4', '#ffb184',
    '#ffd6a6', '#efe6df', '#c8a69f', '#c9a6a1', '#e3dbe8',
  ),
  'dawn-cloud': palette(
    'dawn-cloud', 'dark',
    ['#191c28', '#302c35', '#58434a', '#99695f'],
    '#e8a982', 0.3, '#f0eae3', '#e7a887',
    '#f0cbae', '#e7ded7', '#b2a09a', '#b7a5a3', '#d8d2d5',
  ),
  'dawn-rain': palette(
    'dawn-rain', 'dark',
    ['#10141f', '#1b2230', '#2c3341', '#474954'],
    '#caa692', 0.18, '#e9e7e4', '#a3b8bf',
    '#e2d8cd', '#e4e2de', '#7d838e', '#b3c4cb', '#bfc3cc',
  ),

  'dusk-clear': palette(
    'dusk-clear', 'dark',
    ['#0e1020', '#281a33', '#5a2b3d', '#c55f46'],
    '#ff9a63', 0.55, '#f7ebe3', '#ff9d6b',
    '#ffc49a', '#f0e6df', '#c98f83', '#c99a92', '#e2d8e0',
  ),
  'dusk-cloud': palette(
    'dusk-cloud', 'dark',
    ['#14141f', '#292430', '#4d3640', '#946255'],
    '#dd957a', 0.3, '#f1e9e3', '#e59a7c',
    '#edc4a8', '#e9ded7', '#af9a94', '#b8a09c', '#d8d0d2',
  ),
  'dusk-rain': palette(
    'dusk-rain', 'dark',
    ['#0d1119', '#1b1a26', '#312931', '#493b3f'],
    '#b78b80', 0.18, '#e8e6e4', '#a7b9c2',
    '#dcd2c9', '#e3dfdc', '#7e7f88', '#afbec6', '#bec1c9',
  ),
}

const TWILIGHT_VARIANT: Record<SkyMood, 'clear' | 'cloud' | 'rain'> = {
  clear: 'clear',
  cloud: 'cloud',
  fog: 'cloud',
  snow: 'cloud',
  rain: 'rain',
  storm: 'rain',
}

export function paletteFor(phase: Phase, mood: SkyMood): Palette {
  if (phase === 'dawn' || phase === 'dusk') {
    return PALETTES[`${phase}-${TWILIGHT_VARIANT[mood]}`]
  }
  return PALETTES[`${phase}-${mood}`] ?? PALETTES['night-cloud']
}

export function mixPalette(from: Palette, to: Palette, t: number): Palette {
  const c = (a: string, b: string) => mixHex(a, b, t)
  return {
    ...to,
    sky: [
      c(from.sky[0], to.sky[0]),
      c(from.sky[1], to.sky[1]),
      c(from.sky[2], to.sky[2]),
      c(from.sky[3], to.sky[3]),
    ],
    glow: c(from.glow, to.glow),
    glowOpacity: from.glowOpacity + (to.glowOpacity - from.glowOpacity) * t,
    ink: c(from.ink, to.ink),
    accent: c(from.accent, to.accent),
    sun: c(from.sun, to.sun),
    moon: c(from.moon, to.moon),
    cloud: c(from.cloud, to.cloud),
    precip: c(from.precip, to.precip),
    star: c(from.star, to.star),
  }
}

export function applyPalette(p: Palette): void {
  const root = document.documentElement
  const style = root.style
  style.setProperty('--sky-1', p.sky[0])
  style.setProperty('--sky-2', p.sky[1])
  style.setProperty('--sky-3', p.sky[2])
  style.setProperty('--sky-4', p.sky[3])
  style.setProperty('--glow', p.glow)
  style.setProperty('--glow-rgb', rgbChannels(p.glow))
  style.setProperty('--glow-op', p.glowOpacity.toFixed(3))
  style.setProperty('--ink', p.ink)
  style.setProperty('--ink-rgb', rgbChannels(p.ink))
  style.setProperty('--accent', p.accent)
  style.setProperty('--accent-rgb', rgbChannels(p.accent))
  style.setProperty('--sun', p.sun)
  style.setProperty('--moon', p.moon)
  style.setProperty('--cloud', p.cloud)
  style.setProperty('--precip', p.precip)
  style.setProperty('--star', p.star)
  root.style.colorScheme = p.mode
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', p.sky[0])
}
