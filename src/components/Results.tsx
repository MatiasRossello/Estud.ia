import { useEffect, useRef, useState } from 'react'
import type { FullTest } from '../lib/types'
import { setPlayerName, upsertSession, useStore, type Session } from '../lib/storage'
import { api } from '../lib/supabase'
import { cumulativeCorrect, formatDuration, pendingWrong, roundStats } from '../lib/quiz'
import { BLANK_RE } from '../lib/parse'
import { RoundsChart } from './Charts'
import Leaderboard from './Leaderboard'
import Burst from './Burst'
import { useCountUp } from '../lib/motion'

function ScoreRing({ value, total }: { value: number; total: number }) {
  const pct = total ? value / total : 0
  const shown = useCountUp(Math.round(pct * 100))
  const C = 2 * Math.PI * 52
  return (
    <div className="score-ring" role="img" aria-label={`${Math.round(pct * 100)}% aprendido`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="track" cx="60" cy="60" r="52" />
        <circle className="fill" cx="60" cy="60" r="52" strokeDasharray={C} style={{ '--off': C * (1 - pct), '--c': C } as React.CSSProperties} />
      </svg>
      <span className="ring-value" aria-hidden="true">{shown}%</span>
    </div>
  )
}

function CountStat({ label, value, format = (n: number) => n.toLocaleString('es-AR'), hl = false }: {
  label: string
  value: number
  format?: (n: number) => string
  hl?: boolean
}) {
  const shown = useCountUp(value)
  return (
    <div className={`stat${hl ? ' hl' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{format(shown)}</div>
    </div>
  )
}

interface Props {
  test: FullTest
  session: Session
  onRetryWrong: () => void
  onBack: () => void
}

export default function Results({ test, session, onRetryWrong, onBack }: Props) {
  const { playerName } = useStore()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const lastIdx = session.rounds.length - 1
  const lastRound = session.rounds[lastIdx]
  const last = roundStats(lastRound)
  const first = roundStats(session.rounds[0])
  const cumulative = cumulativeCorrect(session)
  const wrong = pendingWrong(session)
  const total = session.qids.length
  const solved = cumulative[lastIdx]

  const [refreshKey, setRefreshKey] = useState(0)
  const [nameInput, setNameInput] = useState('')
  const [sending, setSending] = useState(false)
  const sentRef = useRef(false)

  useEffect(() => {
    headingRef.current?.focus()
  }, [lastIdx])

  async function submit(name: string) {
    if (sentRef.current) return
    sentRef.current = true
    setSending(true)
    try {
      const saved = await api.submitScore(test.id, name, first.points, first.correct, total, first.timeMs)
      upsertSession({ ...session, leaderboard: { status: 'sent', name: saved } })
    } catch (e) {
      sentRef.current = false
      upsertSession({ ...session, leaderboard: { status: 'error', error: (e as Error).message } })
    } finally {
      setSending(false)
      setRefreshKey((k) => k + 1)
    }
  }

  // El primer intento con el banco completo se manda solo al ranking si ya hay un nombre guardado.
  const eligible = session.mode === 'full' && total === test.question_count
  useEffect(() => {
    if (eligible && playerName && !session.leaderboard) submit(playerName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, playerName, session.leaderboard])

  const roundLabels = session.rounds.map((_, i) => (i === 0 ? '1er intento' : `Repaso ${i}`))
  const heading = !wrong.length
    ? lastIdx === 0
      ? '¡Perfecto! Respondiste todo bien'
      : '¡Listo! Ya respondiste bien todas'
    : lastIdx === 0
      ? `Respondiste bien ${last.correct} de ${total}`
      : `En este repaso acertaste ${last.correct} de ${lastRound.qids.length}`

  return (
    <>
      <section className="card results-card">
        {!wrong.length && <Burst big />}
        <div className="results-head">
          <ScoreRing value={solved} total={total} />
          <div>
            <p className="small muted" style={{ marginBottom: 4 }}>{test.title}</p>
            <h1 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>{heading}</h1>
            {wrong.length > 0 && (
              <p style={{ fontSize: '1.05rem', marginBottom: 0 }}>
                Te quedan <strong>{wrong.length} pregunta{wrong.length === 1 ? '' : 's'}</strong> por aprender.
                Repetilas ahora, mientras las tenés frescas.
              </p>
            )}
          </div>
        </div>

        <div className="row" style={{ margin: '18px 0 6px' }}>
          {wrong.length > 0 && (
            <button className="btn primary big" onClick={onRetryWrong}>
              Repetir las {wrong.length} que fallé
            </button>
          )}
          <button className={`btn big${wrong.length ? '' : ' primary'}`} onClick={onBack}>
            Volver al test
          </button>
        </div>

        <div className="stats">
          <CountStat hl label="Primer intento" value={Math.round((first.correct / total) * 100)} format={(n) => `${n}%`} />
          <CountStat label="Aprendidas" value={solved} format={(n) => `${n}/${total}`} />
          <CountStat label="Puntos del 1er intento" value={first.points} />
          <CountStat label="Tiempo de esta ronda" value={last.timeMs} format={formatDuration} />
        </div>

        {session.rounds.length > 1 && (
          <>
            <h2>Cómo fuiste mejorando</h2>
            <p className="small muted">Preguntas que ya respondiste bien después de cada vuelta.</p>
            <RoundsChart labels={roundLabels} values={cumulative} total={total} />
          </>
        )}

        <details className="disclosure" style={{ marginTop: 14 }}>
          <summary>Ver qué respondiste en esta ronda</summary>
          <ul className="review-list">
            {lastRound.qids.map((id) => {
              const a = lastRound.answers[id]
              const q = test.byId.get(id)!
              return (
                <li key={id}>
                  <span className={`mark ${a?.correct ? 'ok' : 'no'}`} aria-hidden="true">{a?.correct ? '✓' : '✗'}</span>
                  <span>
                    <span className="visually-hidden">{a?.correct ? 'Correcta: ' : 'Incorrecta: '}</span>
                    {q.consigna.replace(BLANK_RE, '___')}
                  </span>
                </li>
              )
            })}
          </ul>
        </details>
      </section>

      {eligible && (
        <section aria-labelledby="ranking-entry">
          {!playerName && !session.leaderboard && (
            <div className="card stack">
              <h2 id="ranking-entry">Sumate al ranking</h2>
              <p className="muted">
                Hiciste todas las preguntas, así que tu primer intento cuenta para el ranking. Elegí cómo querés
                aparecer: lo vamos a recordar para la próxima.
              </p>
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault()
                  const name = nameInput.trim()
                  if (name) setPlayerName(name)
                }}
              >
                <label className="visually-hidden" htmlFor="player-name">Tu nombre para el ranking</label>
                <input
                  id="player-name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={40}
                  placeholder="Tu nombre o apodo"
                  autoComplete="nickname"
                />
                <button className="btn primary" disabled={!nameInput.trim()}>Entrar al ranking</button>
              </form>
            </div>
          )}
          {sending && <div className="alert info" role="status"><div className="alert-body">Enviando tu puntaje…</div></div>}
          {session.leaderboard?.status === 'error' && (
            <div className="alert error" role="alert">
              <span className="icon" aria-hidden="true">✗</span>
              <div className="alert-body">
                No se pudo enviar tu puntaje: {session.leaderboard.error}
                <div style={{ marginTop: 8 }}>
                  <button className="btn small" onClick={() => playerName && submit(playerName)}>Intentar de nuevo</button>
                </div>
              </div>
            </div>
          )}
          {session.leaderboard?.status === 'sent' && (
            <div className="alert ok" role="status">
              <span className="icon" aria-hidden="true">✓</span>
              <div className="alert-body">
                Entraste al ranking como <strong>{session.leaderboard.name}</strong>. Si antes tenías un puntaje mejor,
                se mantiene el mejor.
              </div>
            </div>
          )}
          <Leaderboard testId={test.id} refreshKey={refreshKey} />
        </section>
      )}
      {!eligible && (
        <p className="small muted">
          Este intento no suma al ranking: solo cuentan los tests con todas las preguntas del banco.
        </p>
      )}
    </>
  )
}
