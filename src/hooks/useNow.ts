import { useEffect, useState } from 'react'

/** A wall clock that stays aligned to the requested interval and resumes on tab focus. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer = 0
    let disposed = false

    const tick = () => {
      if (disposed) return
      setNow(new Date())
      schedule()
    }

    const schedule = () => {
      const delay = intervalMs - (Date.now() % intervalMs)
      timer = window.setTimeout(tick, Math.max(80, delay))
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }

    schedule()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      disposed = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs])

  return now
}
