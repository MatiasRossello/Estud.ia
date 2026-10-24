import { useEffect, useRef, useState } from 'react'

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Anima un número desde 0 hasta `value` (o lo muestra directo si se pidió menos movimiento). */
export function useCountUp(value: number, duration = 900) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0))
  const from = useRef(0)
  useEffect(() => {
    if (prefersReducedMotion()) return setShown(value)
    const start = performance.now()
    const initial = from.current
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(initial + (value - initial) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return shown
}
