interface IconProps {
  size?: number
  className?: string
}

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function SearchIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.6" />
      <line x1="15.7" y1="15.7" x2="20.5" y2="20.5" />
    </svg>
  )
}

export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function StarIcon({ size = 18, className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...base}
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden="true"
    >
      <path d="M12 3.4l2.62 5.4 5.93.82-4.31 4.16 1.05 5.9L12 16.85l-5.29 2.83 1.05-5.9-4.31-4.16 5.93-.82L12 3.4Z" />
    </svg>
  )
}

export function LocateIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="6.2" />
      <line x1="12" y1="2.5" x2="12" y2="5.4" />
      <line x1="12" y1="18.6" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5.4" y2="12" />
      <line x1="18.6" y1="12" x2="21.5" y2="12" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function RefreshIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.4-5.72" />
      <path d="M20.2 4.2v4.4h-4.4" />
    </svg>
  )
}

export function ChevronIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} aria-hidden="true">
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  )
}

export function ArrowUpRight({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} aria-hidden="true">
      <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" />
      <path d="M8.5 6.5h9v9" />
    </svg>
  )
}

export function SlashGlyph({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} aria-hidden="true">
      <line x1="16" y1="5" x2="8" y2="19" />
    </svg>
  )
}
