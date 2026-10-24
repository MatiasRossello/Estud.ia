import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../lib/motion'

const DEMO = [
  { q: '¿En qué año fue la Revolución de Mayo?', opts: ['1806', '1810', '1816'], ok: 1, pts: 940 },
  { q: 'La mitocondria produce energía para la célula.', opts: ['Verdadero', 'Falso'], ok: 0, pts: 980 },
  { q: '¿Cuál es la derivada de x²?', opts: ['x', '2x', 'x²/2'], ok: 1, pts: 870 },
]

/** Mini ficha que se responde sola en el menú: muestra de un vistazo cómo funciona la app. */
export default function HeroDemo() {
  const reduced = prefersReducedMotion()
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<0 | 1 | 2>(reduced ? 2 : 0)

  useEffect(() => {
    if (reduced) return
    const t1 = setTimeout(() => setPhase(1), 1300)
    const t2 = setTimeout(() => setPhase(2), 2100)
    const t3 = setTimeout(() => {
      setPhase(0)
      setI((x) => (x + 1) % DEMO.length)
    }, 4200)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [i, reduced])

  const d = DEMO[i]
  return (
    <div className="hero-demo" aria-hidden="true">
      <div className="demo-card" key={i}>
        <div className="demo-head">
          <span>Pregunta {i + 1} de 3</span>
          <span className={`demo-pts${phase === 2 ? ' show' : ''}`}>+{d.pts}</span>
        </div>
        <div className="demo-timer"><div className={phase === 0 ? 'run' : 'stop'} /></div>
        <p className="demo-q">{d.q}</p>
        <div className="demo-opts">
          {d.opts.map((o, k) => (
            <div
              key={o}
              className={`demo-opt${phase >= 1 && k === d.ok ? ' picked' : ''}${phase === 2 && k === d.ok ? ' ok' : ''}`}
              style={{ '--i': k } as React.CSSProperties}
            >
              <span className="demo-key">{phase === 2 && k === d.ok ? '✓' : k + 1}</span>
              {o}
            </div>
          ))}
        </div>
      </div>
      <div className="demo-card ghost one" />
      <div className="demo-card ghost two" />
    </div>
  )
}
