interface MarkProps {
  progress?: number | null
  night?: boolean
  className?: string
}

/** The ATMOS mark is a working miniature of the sky dial: a horizon and a
 *  light source placed at the current point of the solar (or lunar) arc. */
export function Mark({ progress, night = false, className }: MarkProps) {
  const p = progress == null ? 0.5 : Math.max(0, Math.min(1, progress))
  const x = 20 - Math.cos(p * Math.PI) * 13.5
  const y = 28 - Math.sin(p * Math.PI) * 13.5
  return (
    <svg viewBox="0 0 40 40" className={`mark ${className ?? ''}`} aria-hidden="true">
      <circle cx="20" cy="20" r="17.4" className="mark-ring" />
      <line x1="1.6" y1="28" x2="38.4" y2="28" className="mark-horizon" />
      <line x1="3.4" y1="24.6" x2="3.4" y2="28" className="mark-tick" />
      <line x1="36.6" y1="24.6" x2="36.6" y2="28" className="mark-tick" />
      <g className="mark-light" style={{ transform: `translate(${x - 20}px, ${y - 28}px)` }}>
        <circle cx="20" cy="28" r="4.6" className="mark-halo" />
        <circle cx="20" cy="28" r="2.15" className="mark-dot" />
      </g>
      {night && <circle cx="29.5" cy="12.8" r="0.85" className="mark-star" />}
    </svg>
  )
}
