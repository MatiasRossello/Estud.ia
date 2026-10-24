import { useMemo } from 'react'
import { prefersReducedMotion } from '../lib/motion'

const COLORS = ['#21a67a', '#147557', '#eef6ef', '#171a1a']

/** Ráfaga de partículas decorativa. `big` la convierte en confeti para pantalla de resultados. */
export default function Burst({ big = false }: { big?: boolean }) {
  const parts = useMemo(() => {
    const n = big ? 42 : 14
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * Math.PI * 2 + Math.random() * 0.4
      const dist = (big ? 140 : 46) + Math.random() * (big ? 160 : 34)
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - (big ? 60 : 0),
        r: Math.random() * 360,
        c: COLORS[i % COLORS.length],
        d: Math.random() * 120,
        w: big ? 6 + Math.random() * 6 : 6,
        h: big ? 10 + Math.random() * 8 : 6,
      }
    })
  }, [big])

  if (prefersReducedMotion()) return null
  return (
    <span className={`burst${big ? ' big' : ''}`} aria-hidden="true">
      {parts.map((p, i) => (
        <i
          key={i}
          style={
            {
              '--x': `${p.x}px`,
              '--y': `${p.y}px`,
              '--r': `${p.r}deg`,
              '--d': `${p.d}ms`,
              background: p.c,
              width: p.w,
              height: p.h,
              borderRadius: big ? 2 : '50%',
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )
}
