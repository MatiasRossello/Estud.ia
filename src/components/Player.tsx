import { Fragment, useEffect, useRef, useState } from 'react'
import type { FullTest, Question } from '../lib/types'
import { TYPE_LABELS } from '../lib/types'
import { upsertSession, type AnswerRecord, type Session } from '../lib/storage'
import { BLANK_RE } from '../lib/parse'
import Burst from './Burst'
import { computePoints, gradeChoice, gradeWritten, isCorrect, MAX_POINTS, TIME_LIMITS } from '../lib/quiz'

type Given = number | number[] | boolean | string[] | null

function emptyGiven(q: Question): Given {
  if (q.tipo === 'seleccion_multiple') return []
  if (q.tipo === 'completar') return q.respuestas.map(() => '')
  if (q.tipo === 'texto') return ['']
  return null
}

function canSubmit(q: Question, g: Given) {
  if (q.tipo === 'multiple_choice' || q.tipo === 'verdadero_falso') return g !== null
  if (q.tipo === 'seleccion_multiple') return Array.isArray(g) && g.length > 0
  return Array.isArray(g) && (g as string[]).some((s) => s.trim())
}

const INSTRUCTIONS: Record<Question['tipo'], string> = {
  multiple_choice: 'Elegí una opción.',
  seleccion_multiple: 'Marcá todas las opciones correctas.',
  verdadero_falso: 'Elegí verdadero o falso.',
  completar: 'Escribí la palabra que falta en cada hueco.',
  texto: 'Escribí tu respuesta con tus palabras.',
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
  const optionOrder = round.optionOrders[qid]

  // La respuesta en curso va atada a su pregunta: al cambiar de pregunta nunca se lee la de la anterior.
  const [draft, setDraft] = useState<{ qid: number; value: Given }>(() => ({ qid, value: emptyGiven(q) }))
  const given = draft.qid === qid ? draft.value : emptyGiven(q)
  const setGiven = (value: Given) => setDraft({ qid, value })
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startRef = useRef(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const questionRef = useRef<HTMLHeadingElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  // Pregunta nueva: reinicia el reloj y mueve el foco a la consigna.
  useEffect(() => {
    setError(null)
    startRef.current = Date.now()
    setElapsed(0)
    if (!record) questionRef.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid])

  // El reloj se detiene mientras se corrige: la espera de la IA no le resta puntos al alumno.
  useEffect(() => {
    if (record || grading) return
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 250)
    return () => clearInterval(t)
  }, [record, grading, qid])

  useEffect(() => {
    if (record) feedbackRef.current?.focus()
  }, [record])

  async function submit() {
    if (!canSubmit(q, given) || grading || record) return
    const submittedAt = Date.now()
    const timeMs = submittedAt - startRef.current
    setElapsed(timeMs)
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
        correct: isCorrect(q, score),
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
      // Si falla y hay que reintentar, el tiempo que tardó la corrección tampoco cuenta.
      startRef.current += Date.now() - submittedAt
      setError(`No se pudo corregir tu respuesta (${(e as Error).message}). Revisá tu conexión y tocá "Responder" de nuevo.`)
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

  // Atajos: números para elegir opciones, Enter para responder o seguir.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'text')
      if (e.key === 'Enter' && !e.shiftKey && !el.closest('button, a, summary')) {
        e.preventDefault()
        if (record) next()
        else submit()
        return
      }
      if (typing || record || e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1) return
      if (q.tipo === 'verdadero_falso' && n <= 2) setGiven(n === 1)
      if ((q.tipo === 'multiple_choice' || q.tipo === 'seleccion_multiple') && n <= optionOrder.length) {
        choose(optionOrder[n - 1])
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
  const roundLabel =
    roundIdx === 0 ? (session.mode === 'review' ? 'Repaso de errores' : 'Primer intento') : `Repaso de falladas · vuelta ${roundIdx}`
  const shown = record ? record.given : given
  const isChoice = q.tipo === 'multiple_choice' || q.tipo === 'seleccion_multiple'

  return (
    <>
      <div className="play-top">
        <div>
          <div className="title">{test.title}</div>
          <div className="small muted">{roundLabel}</div>
        </div>
        <button className="btn small" onClick={onExit}>
          Pausar y salir
          <span className="visually-hidden"> (tu progreso queda guardado)</span>
        </button>
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-label="Avance de la ronda"
        aria-valuemin={0}
        aria-valuemax={round.qids.length}
        aria-valuenow={answered}
        aria-valuetext={`${answered} de ${round.qids.length} respondidas`}
        style={{ marginBottom: 16 }}
      >
        <div style={{ width: `${(answered / round.qids.length) * 100}%` }} />
      </div>

      <section className="ficha" aria-labelledby="consigna">
        <div className="ficha-head">
          <span>
            <strong>Pregunta {shownPos + 1}</strong> de {round.qids.length} · {TYPE_LABELS[q.tipo]}
          </span>
          <span className="row" style={{ gap: 6 }}>
            {!record && (
              <span className="small" aria-hidden="true">
                Hasta <span className="points">{potential}</span> pts
              </span>
            )}
            {record && (
              <span className="small">
                <span className="points pts-pop">+{record.points}</span> pts
              </span>
            )}
          </span>
        </div>
        <div className="progress timer" aria-hidden="true">
          <div style={{ width: `${Math.max(0, 1 - shownTime / limitMs) * 100}%` }} />
        </div>

        <div className="ficha-body q-enter" key={qid}>
          {q.tipo === 'completar' ? (
            <BlankText
              q={q}
              values={(shown as string[]) ?? []}
              disabled={!!record}
              onChange={setGiven}
              headingRef={questionRef}
            />
          ) : (
            <h2 id="consigna" className="question-text" tabIndex={-1} ref={questionRef}>
              {q.consigna}
            </h2>
          )}
          <p className="small muted" id="instr" style={{ marginTop: -10 }}>
            {INSTRUCTIONS[q.tipo]}
          </p>

          {isChoice && (
            <fieldset className="options" aria-describedby="instr">
              <legend className="visually-hidden">{q.consigna}</legend>
              {optionOrder.map((opt, i) => {
                const multi = q.tipo === 'seleccion_multiple'
                const selected = multi ? ((shown as number[]) ?? []).includes(opt) : shown === opt
                const isCorrect = q.correctas.includes(opt)
                const state = record ? (isCorrect ? 'correct' : selected ? 'wrong' : '') : ''
                return (
                  <label
                    key={opt}
                    className={`option${multi ? ' multi' : ''} ${state}${record ? ' locked' : ''}`}
                    style={{ '--i': i } as React.CSSProperties}
                  >
                    <input
                      type={multi ? 'checkbox' : 'radio'}
                      name={`q-${qid}`}
                      checked={selected}
                      disabled={!!record}
                      onChange={() => choose(opt)}
                    />
                    <span className="box">
                      <span className="key" aria-hidden="true">{multi && selected ? '✓' : i + 1}</span>
                      <span>{q.opciones[opt]}</span>
                      {record && (isCorrect || selected) && (
                        <span className="verdict">
                          {isCorrect ? (selected ? '✓ Correcta' : '✓ Era correcta') : '✗ Incorrecta'}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}

          {q.tipo === 'verdadero_falso' && (
            <fieldset className="options two" aria-describedby="instr">
              <legend className="visually-hidden">{q.consigna}</legend>
              {[true, false].map((v, i) => {
                const selected = shown === v
                const state = record ? (v === q.respuesta ? 'correct' : selected ? 'wrong' : '') : ''
                return (
                  <label key={String(v)} className={`option ${state}${record ? ' locked' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                    <input
                      type="radio"
                      name={`q-${qid}`}
                      checked={selected}
                      disabled={!!record}
                      onChange={() => setGiven(v)}
                    />
                    <span className="box">
                      <span className="key" aria-hidden="true">{i + 1}</span>
                      <span>{v ? 'Verdadero' : 'Falso'}</span>
                      {record && (v === q.respuesta || selected) && (
                        <span className="verdict">{v === q.respuesta ? '✓ Correcta' : '✗ Incorrecta'}</span>
                      )}
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}

          {q.tipo === 'texto' && (
            <>
              <label htmlFor={`ans-${qid}`} className="visually-hidden">Tu respuesta</label>
              <textarea
                id={`ans-${qid}`}
                className="answer-area"
                rows={3}
                value={((shown as string[]) ?? [''])[0]}
                onChange={(e) => setGiven([e.target.value])}
                disabled={!!record}
                aria-describedby="instr"
                placeholder="Escribí acá…"
              />
            </>
          )}

          {error && (
            <div className="alert error" role="alert" style={{ marginTop: 16, marginBottom: 0 }}>
              <span className="icon" aria-hidden="true">✗</span>
              <div className="alert-body">{error}</div>
            </div>
          )}

          {!record ? (
            <div className="row" style={{ marginTop: 22 }}>
              <button className="btn primary big" onClick={submit} disabled={!canSubmit(q, given) || grading}>
                {grading ? 'Corrigiendo…' : 'Responder'}
              </button>
              <span className="kbd-hint" aria-live="polite">
                {grading && (q.tipo === 'texto' || q.tipo === 'completar')
                  ? 'Una IA está comparando tu respuesta con la correcta…'
                  : (
                    <span aria-hidden="true">
                      {isChoice || q.tipo === 'verdadero_falso' ? <>Atajos: <kbd>1</kbd>–<kbd>{isChoice ? optionOrder.length : 2}</kbd> para elegir, </> : null}
                      <kbd>Enter</kbd> para responder
                    </span>
                  )}
              </span>
            </div>
          ) : (
            <Feedback q={q} record={record} onNext={next} feedbackRef={feedbackRef} last={pos === -1} />
          )}
        </div>
      </section>
    </>
  )
}

function BlankText({
  q,
  values,
  disabled,
  onChange,
  headingRef,
}: {
  q: Extract<Question, { tipo: 'completar' }>
  values: string[]
  disabled: boolean
  onChange: (v: string[]) => void
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  const parts = q.consigna.split(BLANK_RE)
  return (
    <>
      <h2 id="consigna" className="visually-hidden" tabIndex={-1} ref={headingRef}>
        {q.consigna.replace(BLANK_RE, '(espacio en blanco)')}
      </h2>
      <p className="question-text" aria-hidden={false}>
        {parts.map((part, i) => (
          <Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                type="text"
                className="blank-input"
                value={values[i] ?? ''}
                disabled={disabled}
                aria-label={`Hueco ${i + 1} de ${parts.length - 1}`}
                autoComplete="off"
                onChange={(e) => onChange(values.map((v, k) => (k === i ? e.target.value : v)))}
              />
            )}
          </Fragment>
        ))}
      </p>
    </>
  )
}

function Feedback({
  q,
  record,
  onNext,
  feedbackRef,
  last,
}: {
  q: Question
  record: AnswerRecord
  onNext: () => void
  feedbackRef: React.RefObject<HTMLDivElement | null>
  last: boolean
}) {
  const written = q.tipo === 'texto' || q.tipo === 'completar'
  const kind = record.correct ? 'good' : record.score > 0 ? 'partial' : 'bad'
  const title = record.correct ? '✓ ¡Correcto!' : record.score > 0 ? '≈ Casi' : '✗ Incorrecto'
  return (
    <div className={`feedback ${kind}`} ref={feedbackRef} tabIndex={-1} role="status">
      <div className="title">
        <span className="title-text">{title}</span>
        {record.correct && <Burst />}
        <span className="float-pts" aria-hidden="true">+{record.points}</span>
      </div>
      {written && <p className="small">La IA evaluó tu respuesta con un {Math.round(record.score * 100)}%.</p>}
      {q.tipo === 'seleccion_multiple' && !record.correct && (() => {
        const picked = (record.given as number[]) ?? []
        const hits = picked.filter((c) => q.correctas.includes(c)).length
        const misses = picked.length - hits
        return (
          <p className="small">
            Marcaste {hits} de {q.correctas.length} correctas
            {misses > 0 && ` y ${misses} incorrecta${misses === 1 ? '' : 's'} (cada una descuenta)`}: sumás el{' '}
            {Math.round(record.score * 100)}% de los puntos.
          </p>
        )
      })()}
      {record.feedback && <p>{record.feedback}</p>}
      {q.tipo === 'verdadero_falso' && !record.correct && (
        <p>La respuesta correcta es <strong>{q.respuesta ? 'Verdadero' : 'Falso'}</strong>.</p>
      )}
      {(q.tipo === 'multiple_choice' || q.tipo === 'seleccion_multiple') && !record.correct && (
        <p>
          {q.correctas.length > 1 ? 'Las correctas son' : 'La correcta es'}{' '}
          <strong>{q.correctas.map((c) => q.opciones[c]).join(', ')}</strong>.
        </p>
      )}
      {q.tipo === 'texto' && (
        <p>Respuesta esperada: <strong>{q.respuestas.join(' / ')}</strong></p>
      )}
      {q.tipo === 'completar' && (
        <p>
          {q.respuestas.length > 1 ? 'Las palabras eran' : 'La palabra era'}{' '}
          {q.respuestas.map((r, i) => (
            <Fragment key={i}>
              {i > 0 && ', '}
              <strong>{r[0]}</strong>
            </Fragment>
          ))}
          .
        </p>
      )}
      {q.explicacion && <p className="small"><strong>Por qué:</strong> {q.explicacion}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn primary big" onClick={onNext}>
          {last ? 'Ver mis resultados' : 'Siguiente pregunta'}
        </button>
        <span className="small muted">
          Sumaste {record.points} de {MAX_POINTS} puntos
        </span>
      </div>
    </div>
  )
}
