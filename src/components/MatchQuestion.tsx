import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { Question } from '../lib/types'

type MatchQ = Extract<Question, { tipo: 'unir' }>
type Side = 'L' | 'R'

interface Props {
  q: MatchQ
  /** Orden en que se muestra la columna derecha (índices de `q.pares`). */
  rightOrder: number[]
  /** value[i] = par cuya derecha está unida con la izquierda i, o -1. */
  value: number[]
  onChange: (v: number[]) => void
  /** Después de responder: bloquea y colorea cada flecha según si es correcta. */
  locked: boolean
}

interface Line {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  state: 'on' | 'ok' | 'bad' | 'drag'
}

const DRAG_THRESHOLD = 6

/** Une cada elemento de la izquierda con uno de la derecha: tocando uno y después el otro, o arrastrando. */
export default function MatchQuestion({ q, rightOrder, value, onChange, locked }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const dots = useRef(new Map<string, HTMLSpanElement>())
  const [active, setActive] = useState<{ side: Side; idx: number } | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [drag, setDrag] = useState<{ side: Side; idx: number; x: number; y: number } | null>(null)
  const pointer = useRef<{ side: Side; idx: number; x0: number; y0: number; moved: boolean } | null>(null)

  const rightToLeft = new Map<number, number>()
  value.forEach((r, l) => r >= 0 && rightToLeft.set(r, l))

  function connect(left: number, right: number) {
    // Cada elemento se une con uno solo: si la derecha ya estaba usada, se libera.
    const next = value.map((r) => (r === right ? -1 : r))
    next[left] = right
    onChange(next)
  }

  function disconnectLeft(left: number) {
    onChange(value.map((r, l) => (l === left ? -1 : r)))
  }

  function tap(side: Side, idx: number) {
    if (locked) return
    if (!active) {
      // Tocar algo ya unido lo suelta y lo deja elegido para unirlo de nuevo.
      if (side === 'L' && value[idx] >= 0) disconnectLeft(idx)
      if (side === 'R' && rightToLeft.has(idx)) disconnectLeft(rightToLeft.get(idx)!)
      setActive({ side, idx })
      return
    }
    if (active.side === side) {
      setActive(active.idx === idx ? null : { side, idx })
      return
    }
    const left = side === 'L' ? idx : active.idx
    const right = side === 'R' ? idx : active.idx
    connect(left, right)
    setActive(null)
  }

  const center = useCallback((key: string) => {
    const el = dots.current.get(key)
    const box = boxRef.current?.getBoundingClientRect()
    if (!el || !box) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }
  }, [])

  // Recalcula las flechas cuando cambian las uniones o el tamaño de la pantalla.
  const measure = useCallback(() => {
    const next: Line[] = []
    value.forEach((r, l) => {
      if (r < 0) return
      const a = center(`L${l}`)
      const b = center(`R${r}`)
      if (!a || !b) return
      const state = locked ? (q.pares[r][1] === q.pares[l][1] ? 'ok' : 'bad') : 'on'
      next.push({ key: `${l}-${r}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, state })
    })
    setLines(next)
  }, [value, locked, q.pares, center])

  useLayoutEffect(() => {
    measure()
    const box = boxRef.current
    if (!box) return
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [measure])

  function onPointerDown(e: React.PointerEvent, side: Side, idx: number) {
    if (locked || e.button !== 0) return
    pointer.current = { side, idx, x0: e.clientX, y0: e.clientY, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const p = pointer.current
    if (!p) return
    if (!p.moved && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < DRAG_THRESHOLD) return
    p.moved = true
    const box = boxRef.current!.getBoundingClientRect()
    setDrag({ side: p.side, idx: p.idx, x: e.clientX - box.left, y: e.clientY - box.top })
  }

  function onPointerUp(e: React.PointerEvent) {
    const p = pointer.current
    pointer.current = null
    setDrag(null)
    if (!p) return
    if (!p.moved) return tap(p.side, p.idx)
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-match]')
    if (!target) return
    const [side, idx] = [target.dataset.match![0] as Side, Number(target.dataset.match!.slice(1))]
    if (side === p.side) return
    connect(p.side === 'L' ? p.idx : idx, p.side === 'R' ? p.idx : idx)
    setActive(null)
  }

  const dragStart = drag ? center(`${drag.side}${drag.idx}`) : null
  const allLines: Line[] =
    drag && dragStart ? [...lines, { key: 'drag', x1: dragStart.x, y1: dragStart.y, x2: drag.x, y2: drag.y, state: 'drag' }] : lines

  const item = (side: Side, idx: number, text: string, n: number) => {
    const linked = side === 'L' ? value[idx] >= 0 : rightToLeft.has(idx)
    const isActive = active?.side === side && active.idx === idx
    const leftIdx = side === 'L' ? idx : rightToLeft.get(idx)
    const result =
      locked && leftIdx !== undefined && value[leftIdx] >= 0
        ? q.pares[value[leftIdx]][1] === q.pares[leftIdx][1]
          ? ' ok'
          : ' bad'
        : ''
    const label =
      side === 'L'
        ? `${text}${linked ? `, unido con ${q.pares[value[idx]][1]}` : ', sin unir'}`
        : `${text}${linked ? `, unido con ${q.pares[rightToLeft.get(idx)!][0]}` : ', sin unir'}`
    return (
      <button
        key={`${side}${idx}`}
        type="button"
        className={`match-item ${side === 'L' ? 'left' : 'right'}${linked ? ' linked' : ''}${isActive ? ' active' : ''}${result}`}
        data-match={`${side}${idx}`}
        aria-pressed={isActive}
        aria-label={label}
        disabled={locked}
        onPointerDown={(e) => onPointerDown(e, side, idx)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          pointer.current = null
          setDrag(null)
        }}
        onClick={(e) => {
          // Teclado: Enter/Espacio generan un click sin pointer.
          if (e.detail === 0) tap(side, idx)
        }}
        style={{ '--i': n } as React.CSSProperties}
      >
        {side === 'R' && <span className="match-dot" ref={(el) => void (el ? dots.current.set(`R${idx}`, el) : dots.current.delete(`R${idx}`))} />}
        <span className="match-text">{text}</span>
        {side === 'L' && <span className="match-dot" ref={(el) => void (el ? dots.current.set(`L${idx}`, el) : dots.current.delete(`L${idx}`))} />}
      </button>
    )
  }

  const done = value.filter((r) => r >= 0).length

  return (
    <div className="match">
      <div className="match-board" ref={boxRef}>
        <svg className="match-lines" aria-hidden="true">
          <defs>
            {(['on', 'ok', 'bad', 'drag'] as const).map((s) => (
              <marker key={s} id={`arrow-${s}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" className={`arrow-${s}`} />
              </marker>
            ))}
          </defs>
          {allLines.map((l) => {
            const dx = Math.max(40, Math.abs(l.x2 - l.x1) * 0.45)
            return (
              <path
                key={l.key}
                className={`match-line ${l.state}`}
                d={`M${l.x1},${l.y1} C${l.x1 + dx},${l.y1} ${l.x2 - dx},${l.y2} ${l.x2},${l.y2}`}
                markerEnd={`url(#arrow-${l.state})`}
              />
            )
          })}
        </svg>
        <div className="match-col">{q.pares.map((p, i) => item('L', i, p[0], i))}</div>
        <div className="match-col">{rightOrder.map((r, k) => item('R', r, q.pares[r][1], k))}</div>
      </div>
      {!locked && (
        <p className="small muted" aria-live="polite" style={{ margin: '10px 0 0' }}>
          {active
            ? 'Ahora tocá su pareja en la otra columna.'
            : `Uniste ${done} de ${q.pares.length}. Tocá un elemento y después su pareja, o arrastrá de uno al otro.`}
        </p>
      )}
    </div>
  )
}
