import { useId } from 'react'
import { mixHex } from '../lib/color'
import { t } from '../lib/i18n'

interface MoonPhaseProps {
  fraction: number
  waxing: boolean
  className?: string
  title?: string
}

/** A moon drawn with a real terminator mask rather than a crescent icon. */
export function MoonPhase({ fraction, waxing, className, title }: MoonPhaseProps) {
  const rawId = useId()
  const maskId = `moon-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const f = Math.max(0, Math.min(1, fraction))
  const r = 14
  const offset = f * 2 * r
  const dx = waxing ? -offset : offset
  return (
    <svg viewBox="0 0 40 40" className={`moon-phase ${className ?? ''}`} role="img" aria-label={title ?? t('moon.phase')}>
      <defs>
        <mask id={maskId}>
          <rect width="40" height="40" fill="#000" />
          <circle cx="20" cy="20" r={r} fill="#fff" />
          <circle cx={`${20 + dx}`} cy="20" r={r} fill="#000" />
        </mask>
      </defs>
      <circle cx="20" cy="20" r={r} className="moon-lit" mask={`url(#${maskId})`} />
      <circle cx="20" cy="20" r={r} className="moon-edge" />
      <circle cx="16.6" cy="15.2" r="2.3" className="moon-crater" opacity={0.35} mask={`url(#${maskId})`} />
      <circle cx="24.2" cy="24.6" r="1.7" className="moon-crater" opacity={0.28} mask={`url(#${maskId})`} />
      <circle cx="22.8" cy="13.4" r="1.1" className="moon-crater" opacity={0.22} mask={`url(#${maskId})`} />
    </svg>
  )
}

export function moonGlowColor(ink: string, moon: string, fraction: number): string {
  return mixHex(ink, moon, 0.35 + fraction * 0.5)
}
