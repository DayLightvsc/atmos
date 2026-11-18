/** Small, dependency-free OKLab colour utilities for smooth atmospheric cross-fades. */

type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = Number.parseInt(h, 16)
  if (!Number.isFinite(n) || h.length !== 6) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, c * 255))
}

function toOklab([r, g, b]: RGB): [number, number, number] {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function fromOklab([L, A, B]: [number, number, number]): RGB {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

export function mixHex(from: string, to: string, t: number): string {
  if (t <= 0) return from
  if (t >= 1) return to
  const a = toOklab(hexToRgb(from))
  const b = toOklab(hexToRgb(to))
  return rgbToHex(fromOklab([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]))
}

export function rgbChannels(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return `${r} ${g} ${b}`
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

/** A cool → warm ramp used by temperature rails. Kept independent of the sky palette
 *  so that a -8°C morning is still legible on a pale dawn background. */
export function temperatureColor(celsius: number, mode: 'light' | 'dark'): string {
  const stops: Array<[number, string]> = mode === 'light'
    ? [
        [-25, '#4f7fa8'],
        [-5, '#74a4bf'],
        [8, '#b9ab7c'],
        [18, '#c98a56'],
        [28, '#bd6440'],
        [38, '#a8442c'],
      ]
    : [
        [-25, '#7ea8cf'],
        [-5, '#8fb9d3'],
        [8, '#d3c08a'],
        [18, '#e0a06b'],
        [28, '#dc7a53'],
        [38, '#c9583c'],
      ]
  if (celsius <= stops[0][0]) return stops[0][1]
  if (celsius >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let i = 0; i < stops.length - 1; i += 1) {
    const [t0, c0] = stops[i]
    const [t1, c1] = stops[i + 1]
    if (celsius >= t0 && celsius <= t1) {
      return mixHex(c0, c1, (celsius - t0) / (t1 - t0))
    }
  }
  return stops[0][1]
}
