import { useLayoutEffect, useRef } from 'react'
import { applyPalette, mixPalette, type Palette } from '../lib/palettes'

const DURATION = 1100

/** Cross-fades the entire interface between two sky palettes in OKLab.
 *  The live palette is exposed through a ref so the canvas can read it every
 *  frame without forcing React re-renders. */
export function useSkyTheme(palette: Palette): React.RefObject<Palette> {
  const live = useRef<Palette>(palette)
  const firstRun = useRef(true)

  useLayoutEffect(() => {
    const from = live.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (firstRun.current || reduce || from.id === palette.id) {
      live.current = palette
      applyPalette(palette)
      firstRun.current = false
      return
    }

    let frame = 0
    const start = performance.now()

    const step = (time: number) => {
      const progress = Math.min(1, (time - start) / DURATION)
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2
      const mixed = mixPalette(from, palette, eased)
      live.current = mixed
      applyPalette(mixed)
      if (progress < 1) frame = window.requestAnimationFrame(step)
      else live.current = palette
    }

    frame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frame)
  }, [palette])

  return live
}
