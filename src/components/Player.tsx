import { Fragment, useEffect, useRef, useState } from 'react'
import type { FullTest, Question } from '../lib/types'
import { TYPE_LABELS } from '../lib/types'
import { upsertSession, type AnswerRecord, type Session } from '../lib/storage'
import { BLANK_RE } from '../lib/parse'
import { CORRECT_THRESHOLD, computePoints, gradeChoice, gradeWritten, MAX_POINTS, TIME_LIMITS } from '../lib/quiz'

type Given = number | number[] | boolean | string[] | null

function emptyGiven(q: Question): Given {
  if (q.tipo === 'seleccion_multiple') return []
  if (q.tipo === 'completar') return q.respuestas.map(() => '')
  if (q.tipo === 'texto') return ['']
  return null
}

function canSubmit(q: Question, g: Given) {
  if (q.tipo === 'multiple_choice' || q.tipo === 'verdadero_falso') return g !== null
  if (q.tipo === 'seleccion_multiple') return (g as number[]).length > 0
  return Array.isArray(g) && (g as string[]).some((s) => s.trim())
}

interface Props {
  test: FullTest
  session: Session
  onRoundEnd: () => void
  onExit: () => void
}

export default function Player({ test, session, onRoundEnd, onExit }: Props) {
  const roundIdx = session.rounds.length - 1
  const round = session.rounds[roundIdx]
  const pos = round.qids.findIndex((id) => !(id in round.answers))
  const [shownPos, setShownPos] = useState(pos)
  const qid = round.qids[shownPos]
  const q = test.questions[qid]
  const record = round.answers[qid] as AnswerRecord | undefined

  // La respuesta en curso va atada a su pregunta: al cambiar de pregunta nunca se lee la de la anterior.
  const [draft, setDraft] = useState<{ qid: number; value: Given }>(() => ({ qid, value: emptyGiven(q) }))
  const given = draft.qid === qid ? draft.value : emptyGiven(q)
  const setGiven = (value: Given) => setDraft({ qid, value })
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startRef = useRef(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const nextRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setError(null)
    startRef.current = Date.now()
    setElapsed(0)
  }, [qid])

  useEffect(() => {
    if (record) return
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 250)
    return () => clearInterval(t)
  }, [record, qid])

  useEffect(() => {
    if (record) nextRef.current?.focus()
  }, [record])

  async function submit() {
    if (!canSubmit(q, given) || grading || record) return
    const timeMs = Date.now() - startRef.current
    setGrading(true)
    setError(null)
    try {
      let score: number
      let feedback = ''
      if (q.tipo === 'completar' || q.tipo === 'texto') {
        ;({ score, feedback } = await gradeWritten(q, given as string[]))
      } else {
        score = gradeChoice(q, given)
      }
      const answer: AnswerRecord = {
        correct: score >= CORRECT_THRESHOLD,
        score,
        points: computePoints(score, timeMs, q.tipo),
        timeMs,
        given,
        feedback: feedback || undefined,
      }
      const rounds = [...session.rounds]
      rounds[roundIdx] = { ...round, answers: { ...round.answers, [qid]: answer } }
      upsertSession({ ...session, rounds })
    } catch (e) {
      setError(`No se pudo corregir: ${(e as Error).message}. Probá de nuevo.`)
    } finally {
      setGrading(false)
    }
  }

  function next() {
    if (pos === -1) {
      const rounds = [...session.rounds]
      rounds[roundIdx] = { ...round, finishedAt: Date.now() }
      upsertSession({ ...session, rounds })
      onRoundEnd()
    } else {
      setShownPos(pos)
    }
  }

  // Atajos: números para elegir opciones, Enter para responder / seguir.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA'
      if (e.key === 'Enter' && !e.shiftKey && !(e.target as HTMLElement).closest('button')) {
        e.preventDefault()
        if (record) next()
        else submit()
        return
      }
      if (typing || record || e.metaKey || e.ctrlKey) return
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1) return
      if (q.tipo === 'verdadero_falso' && n <= 2) setGiven(n === 1)
      if (q.tipo === 'multiple_choice' || q.tipo === 'seleccion_multiple') {
        const order = round.optionOrders[qid]
        if (n <= order.length) choose(order[n - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function choose(opt: number) {
    if (record) return
    if (q.tipo === 'seleccion_multiple') {
      const cur = given as number[]
      setGiven(cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt])
    } else {
      setGiven(opt)
    }
  }

  const limitMs = TIME_LIMITS[q.tipo] * 1000
  const shownTime = record ? record.timeMs : elapsed
  const potential = computePoints(1, shownTime, q.tipo)
  const answered = Object.keys(round.answers).length
  const roundLabel = roundIdx === 0 ? (session.mode === 'review' ? 'Repaso' : 'Primer intento') : `Repaso de falladas ${roundIdx}`

  return (
    <div className="card">
      <div className="spread small" style={{ marginBottom: 10 }}>
        <span>
          <strong>{roundLabel}</strong> · Pregunta {shownPos + 1} de {round.qids.length}
        </span>
        <button className="btn" onClick={onExit} title="Tu progreso queda guardado">
          Guardar y salir
        </button>
      </div>
      <div className="progress" aria-hidden>
        <div style={{ width: `${(answered / round.qids.length) * 100}%` }} />
      </div>

      <div className="spread" style={{ marginTop: 18 }}>
        <span className="badge accent">{TYPE_LABELS[q.tipo]}</span>
        <span className="small muted" aria-live="off">
          {record ? (
            <>
              <span className="points">+{record.points}</span> puntos
            </>
          ) : (
            <>
              Hasta <span className="points">{potential}</span> pts
            </>
          )}
        </span>
      </div>
      <div className="progress timer" style={{ marginTop: 8, height: 6 }} aria-hidden>
        <div style={{ width: `${Math.max(0, 1 - shownTime / limitMs) * 100}%` }} />
      </div>

      {q.tipo === 'completar' ? (
        <BlankText q={q} values={given as string[]} disabled={!!record} onChange={setGiven} />
      ) : (
        <p className="question-text">{q.consigna}</p>
      )}

      {(q.tipo === 'multiple_choice' || q.tipo === 'seleccion_multiple') && (
        <div className="options" role={q.tipo === 'multiple_choice' ? 'radiogroup' : 'group'}>
          {q.tipo === 'seleccion_multiple' && !record && (
            <p className="muted small" style={{ margin: 0 }}>Marcá todas las correctas.</p>
          )}
          {round.optionOrders[qid].map((opt, i) => {
            const selected = Array.isArray(record?.given ?? given)
              ? ((record?.given ?? given) as number[]).includes(opt)
              : (record?.given ?? given) === opt
            const isCorrect = q.correctas.includes(opt)
            const cls = record ? (isCorrect ? 'correct' : selected ? 'wrong' : '') : selected ? 'selected' : ''
            return (
              <button
                key={opt}
                className={`option ${cls}`}
                onClick={() => choose(opt)}
                disabled={!!record}
                role={q.tipo === 'multiple_choice' ? 'radio' : 'checkbox'}
                aria-checked={selected}
              >
                <span className="key">{q.tipo === 'seleccion_multiple' ? (selected ? '✓' : i + 1) : i + 1}</span>
                <span>{q.opciones[opt]}</span>
              </button>
            )
          })}
        </div>
      )}

      {q.tipo === 'verdadero_falso' && (
        <div className="options" role="radiogroup" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {[true, false].map((v, i) => {
            const selected = (record ? record.given : given) === v
            const cls = record ? (v === q.respuesta ? 'correct' : selected ? 'wrong' : '') : selected ? 'selected' : ''
            return (
              <button key={String(v)} className={`option ${cls}`} onClick={() => !record && setGiven(v)} disabled={!!record} role="radio" aria-checked={selected}>
                <span className="key">{i + 1}</span>
                <span>{v ? 'Verdadero' : 'Falso'}</span>
              </button>
            )
          })}
        </div>
      )}

      {q.tipo === 'texto' && (
        <textarea
          rows={3}
          value={((record?.given ?? given) as string[])[0]}
          onChange={(e) => setGiven([e.target.value])}
          disabled={!!record}
          placeholder="Escribí tu respuesta… (Enter para enviar, Shift+Enter para nueva línea)"
          aria-label="Tu respuesta"
          autoFocus
        />
      )}

      {error && <div className="alert error" style={{ marginTop: 14 }}>{error}</div>}

      {!record ? (
        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn primary big" onClick={submit} disabled={!canSubmit(q, given) || grading}>
            {grading ? 'Corrigiendo…' : 'Responder'}
          </button>
          {(q.tipo === 'texto' || q.tipo === 'completar') && grading && (
            <span className="muted small">La IA está comparando tu respuesta…</span>
          )}
        </div>
      ) : (
        <Feedback q={q} record={record} onNext={next} nextRef={nextRef} last={pos === -1} />
      )}
    </div>
  )
}

function BlankText({
  q,
  values,
  disabled,
  onChange,
}: {
  q: Extract<Question, { tipo: 'completar' }>
  values: string[]
  disabled: boolean
  onChange: (v: string[]) => void
}) {
  const parts = q.consigna.split(BLANK_RE)
  return (
    <p className="question-text">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <input
              type="text"
              className="blank-input"
              value={values[i] ?? ''}
              disabled={disabled}
              autoFocus={i === 0}
              aria-label={`Hueco ${i + 1}`}
              onChange={(e) => onChange(values.map((v, k) => (k === i ? e.target.value : v)))}
            />
          )}
        </Fragment>
      ))}
    </p>
  )
}

function Feedback({
  q,
  record,
  onNext,
  nextRef,
  last,
}: {
  q: Question
  record: AnswerRecord
  onNext: () => void
  nextRef: React.RefObject<HTMLButtonElement | null>
  last: boolean
}) {
  const written = q.tipo === 'texto' || q.tipo === 'completar'
  return (
    <div className={`feedback ${record.correct ? 'good' : 'bad'}`} role="status">
      <div className="title">
        {record.correct ? '✓ ¡Correcto!' : record.score > 0 ? '≈ Casi' : '✗ Incorrecto'}
        {written && <span className="small muted"> · la IA te dio {Math.round(record.score * 100)}%</span>}
      </div>
      {record.feedback && <p style={{ margin: '6px 0 0' }}>{record.feedback}</p>}
      {q.tipo === 'verdadero_falso' && !record.correct && (
        <p style={{ margin: '6px 0 0' }}>La respuesta era <strong>{q.respuesta ? 'Verdadero' : 'Falso'}</strong>.</p>
      )}
      {q.tipo === 'texto' && (
        <p style={{ margin: '6px 0 0' }}>Respuesta esperada: <strong>{q.respuestas.join(' / ')}</strong></p>
      )}
      {q.tipo === 'completar' && (
        <p style={{ margin: '6px 0 0' }}>
          Respuestas: {q.respuestas.map((r, i) => <strong key={i}>{i ? ' · ' : ''}{r.join(' / ')}</strong>)}
        </p>
      )}
      {q.explicacion && <p style={{ margin: '8px 0 0' }} className="small">💡 {q.explicacion}</p>}
      <div className="row" style={{ marginTop: 14 }}>
        <button ref={nextRef} className="btn primary big" onClick={onNext}>
          {last ? 'Ver resultados' : 'Siguiente →'}
        </button>
        <span className="small muted">+{record.points} de {MAX_POINTS} pts</span>
      </div>
    </div>
  )
}
