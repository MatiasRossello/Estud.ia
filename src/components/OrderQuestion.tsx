import { useRef, useState } from 'react'
import type { Question } from '../lib/types'

type OrderQ = Extract<Question, { tipo: 'ordenar' }>

interface Props {
  q: OrderQ
  /** Orden actual: índices de `q.pasos` de arriba hacia abajo. */
  value: number[]
  onChange: (v: number[]) => void
  locked: boolean
}

function move(list: number[], from: number, to: number) {
  const next = [...list]
  const [x] = next.splice(from, 1)
  next.splice(to, 0, x)
  return next
}

/** Lista para ordenar arrastrando desde la manija o con los botones ↑ ↓. */
export default function OrderQuestion({ q, value, onChange, locked }: Props) {
  const listRef = useRef<HTMLOListElement>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [announce, setAnnounce] = useState('')
  const focusAfter = useRef<{ step: number; dir: 'up' | 'down' } | null>(null)

  function shift(pos: number, delta: number) {
    const to = pos + delta
    if (to < 0 || to >= value.length) return
    onChange(move(value, pos, to))
    setAnnounce(`"${q.pasos[value[pos]]}" ahora está en el lugar ${to + 1} de ${value.length}.`)
    focusAfter.current = { step: value[pos], dir: delta < 0 ? 'up' : 'down' }
  }

  function onPointerDown(e: React.PointerEvent, pos: number) {
    if (locked || e.button !== 0) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDragging(value[pos])
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragging === null || !listRef.current) return
    const items = [...listRef.current.querySelectorAll<HTMLElement>('.order-item')]
    const from = value.indexOf(dragging)
    // El destino es el primer elemento cuyo centro queda debajo del puntero.
    let to = items.findIndex((el) => {
      const r = el.getBoundingClientRect()
      return e.clientY < r.top + r.height / 2
    })
    if (to === -1) to = items.length - 1
    else if (to > from) to -= 1
    if (to !== from) onChange(move(value, from, to))
  }

  function endDrag() {
    if (dragging !== null) {
      setAnnounce(`"${q.pasos[dragging]}" quedó en el lugar ${value.indexOf(dragging) + 1}.`)
    }
    setDragging(null)
  }

  return (
    <>
      <ol className={`order-list${dragging !== null ? ' is-dragging' : ''}`} ref={listRef}>
        {value.map((step, pos) => {
          const result = locked ? (step === pos ? ' ok' : ' bad') : ''
          return (
            <li
              key={step}
              className={`order-item${dragging === step ? ' dragging' : ''}${result}`}
              style={{ '--i': pos } as React.CSSProperties}
            >
              <span
                className="order-handle"
                aria-hidden="true"
                onPointerDown={(e) => onPointerDown(e, pos)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
                  {[4, 10, 16].map((y) => (
                    <g key={y}>
                      <circle cx="4" cy={y} r="1.6" />
                      <circle cx="10" cy={y} r="1.6" />
                    </g>
                  ))}
                </svg>
              </span>
              <span className="order-num">{pos + 1}</span>
              <span className="order-text">{q.pasos[step]}</span>
              {locked ? (
                <span className="order-verdict">{step === pos ? '✓' : `va en el ${step + 1}`}</span>
              ) : (
                <span className="order-btns">
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => shift(pos, -1)}
                    disabled={pos === 0}
                    aria-label={`Subir "${q.pasos[step]}"`}
                    ref={(el) => {
                      const f = focusAfter.current
                      if (el && f?.step === step && f.dir === 'up') {
                        if (!el.disabled) el.focus()
                        focusAfter.current = null
                      }
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => shift(pos, 1)}
                    disabled={pos === value.length - 1}
                    aria-label={`Bajar "${q.pasos[step]}"`}
                    ref={(el) => {
                      const f = focusAfter.current
                      if (el && f?.step === step && f.dir === 'down') {
                        if (!el.disabled) el.focus()
                        focusAfter.current = null
                      }
                    }}
                  >
                    ↓
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <p className="visually-hidden" aria-live="polite">{announce}</p>
      {!locked && (
        <p className="small muted" style={{ margin: '10px 0 0' }}>
          Arrastrá desde los puntitos o usá las flechas ↑ ↓ para mover cada paso.
        </p>
      )}
    </>
  )
}
