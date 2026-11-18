import { describeWeather, isSnow, isStorm } from '../lib/weatherCodes'

type Glyph =
  | 'clear-day'
  | 'clear-night'
  | 'partly-day'
  | 'partly-night'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'sleet'
  | 'storm'
  | 'unknown'

export function glyphFor(code: number | null | undefined, isDay: boolean): Glyph {
  if (code == null || !Number.isFinite(code)) return 'unknown'
  if (code === 1 || code === 2) return isDay ? 'partly-day' : 'partly-night'
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'sleet'
  const { group } = describeWeather(code)
  if (group === 'snow') return 'snow'
  if (group === 'storm') return 'storm'
  if (group === 'fog') return 'fog'
  if (group === 'rain') return 'rain'
  if (group === 'drizzle') return 'drizzle'
  if (group === 'cloud') return 'cloud'
  if (group === 'clear') return isDay ? 'clear-day' : 'clear-night'
  return 'unknown'
}

function Cloud({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M14.5 33.5h19a6.6 6.6 0 0 0 .9-13.1 9.7 9.7 0 0 0-18.5-2A7 7 0 0 0 14.5 33.5Z" />
    </g>
  )
}

function SunRays({ cx, cy, inner, outer }: { cx: number; cy: number; inner: number; outer: number }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <g>
      {rays.map((angle) => {
        const a = (angle * Math.PI) / 180
        return (
          <line
            key={angle}
            x1={cx + Math.cos(a) * inner}
            y1={cy + Math.sin(a) * inner}
            x2={cx + Math.cos(a) * outer}
            y2={cy + Math.sin(a) * outer}
          />
        )
      })}
    </g>
  )
}

function Drop({ x, y, length = 5 }: { x: number; y: number; length?: number }) {
  return <line x1={x + 2.2} y1={y} x2={x - 1} y2={y + length} />
}

function Flake({ x, y, size = 4 }: { x: number; y: number; size?: number }) {
  const d = size * 0.6
  return (
    <g>
      <line x1={x - size} y1={y} x2={x + size} y2={y} />
      <line x1={x - d} y1={y - d} x2={x + d} y2={y + d} />
      <line x1={x - d} y1={y + d} x2={x + d} y2={y - d} />
    </g>
  )
}

export interface SigilProps {
  code: number | null | undefined
  isDay: boolean
  className?: string
  title?: string
}

/** Hand-drawn weather marks. Deliberately drafted like a meteorological
 *  instrument scale rather than borrowed icon-library silhouettes. */
export function Sigil({ code, isDay, className, title }: SigilProps) {
  const glyph = glyphFor(code, isDay)
  const label = title ?? describeWeather(code).label
  return (
    <svg
      viewBox="0 0 48 48"
      className={`sigil ${className ?? ''}`}
      role="img"
      aria-label={label}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {glyph === 'clear-day' && (
        <>
          <SunRays cx={24} cy={24} inner={12.5} outer={17} />
          <circle cx="24" cy="24" r="6.2" />
          <circle cx="24" cy="24" r="1.4" fill="currentColor" stroke="none" opacity="0.55" />
        </>
      )}

      {glyph === 'clear-night' && (
        <>
          <path d="M29.2 12.8a12.2 12.2 0 1 0 6.4 22.4A13.8 13.8 0 0 1 29.2 12.8Z" />
          <path d="M13 13.5v4M11 15.5h4" strokeWidth="1.1" />
          <path d="M38 32v3M36.5 33.5h3" strokeWidth="1.1" />
        </>
      )}

      {(glyph === 'partly-day' || glyph === 'partly-night') && (
        <>
          {glyph === 'partly-day' ? (
            <>
              <SunRays cx={19} cy={18.5} inner={9.5} outer={12.5} />
              <circle cx="19" cy="18.5" r="5" />
            </>
          ) : (
            <path d="M24.5 8.8a9.4 9.4 0 1 0 5.1 17.3 10.6 10.6 0 0 1-5.1-17.3Z" />
          )}
          <g>
            <path d="M14 38.5h20a6.5 6.5 0 0 0 .8-12.9 9.6 9.6 0 0 0-18.2-1.9A6.9 6.9 0 0 0 14 38.5Z" />
          </g>
        </>
      )}

      {glyph === 'cloud' && (
        <>
          <Cloud />
          <line x1="18" y1="40.5" x2="26" y2="40.5" strokeWidth="1.1" opacity="0.5" />
        </>
      )}

      {glyph === 'fog' && (
        <>
          <g transform="translate(0 -3.5)">
            <Cloud />
          </g>
          <line x1="11" y1="38" x2="36" y2="38" strokeWidth="1.2" opacity="0.8" />
          <line x1="15" y1="42" x2="32" y2="42" strokeWidth="1.2" opacity="0.55" />
        </>
      )}

      {glyph === 'drizzle' && (
        <>
          <g transform="translate(0 -4)">
            <Cloud />
          </g>
          <Drop x={19} y={37} length={4} />
          <Drop x={26} y={37} length={4} />
          <Drop x={33} y={37} length={4} />
        </>
      )}

      {glyph === 'rain' && (
        <>
          <g transform="translate(0 -4)">
            <Cloud />
          </g>
          <Drop x={18} y={36} length={7} />
          <Drop x={25} y={38} length={7} />
          <Drop x={32} y={36} length={7} />
        </>
      )}

      {glyph === 'snow' && (
        <>
          <g transform="translate(0 -4.5)">
            <Cloud />
          </g>
          <Flake x={18} y={38} />
          <Flake x={26} y={41} />
          <Flake x={33} y={38} />
        </>
      )}

      {glyph === 'sleet' && (
        <>
          <g transform="translate(0 -4.5)">
            <Cloud />
          </g>
          <Drop x={18} y={36} length={6} />
          <Flake x={27} y={39} />
          <Drop x={33} y={36} length={6} />
        </>
      )}

      {glyph === 'storm' && (
        <>
          <g transform="translate(0 -4.5)">
            <Cloud />
          </g>
          <path d="m24 33-4.6 8h4.2L21.4 46" strokeWidth="1.7" />
          <line x1="30.5" y1="37" x2="28.4" y2="43" strokeWidth="1.2" opacity="0.6" />
        </>
      )}

      {glyph === 'unknown' && (
        <>
          <circle cx="24" cy="24" r="12" strokeDasharray="2 4" />
          <line x1="20" y1="24" x2="28" y2="24" />
        </>
      )}
    </svg>
  )
}

export function isPrecipitating(code: number | null | undefined): boolean {
  return isSnow(code) || isStorm(code) || describeWeather(code).group === 'rain' || describeWeather(code).group === 'drizzle'
}
