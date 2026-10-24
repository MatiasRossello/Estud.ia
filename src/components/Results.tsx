import { useEffect, useRef, useState } from 'react'
import type { FullTest } from '../lib/types'
import { setPlayerName, upsertSession, useStore, type Session } from '../lib/storage'
import { api } from '../lib/supabase'
import { cumulativeCorrect, formatDuration, pendingWrong, roundStats } from '../lib/quiz'
import { RoundsChart } from './Charts'
import Leaderboard from './Leaderboard'

interface Props {
  test: FullTest
  session: Session
  onRetryWrong: () => void
  onBack: () => void
}

export default function Results({ test, session, onRetryWrong, onBack }: Props) {
  const { playerName } = useStore()
  const lastIdx = session.rounds.length - 1
  const last = roundStats(session.rounds[lastIdx])
  const first = roundStats(session.rounds[0])
  const cumulative = cumulativeCorrect(session)
  const wrong = pendingWrong(session)
  const total = session.qids.length

  const [refreshKey, setRefreshKey] = useState(0)
  const [nameInput, setNameInput] = useState('')
  const [sending, setSending] = useState(false)
  const sentRef = useRef(false)

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

  return (
    <>
      <div className="card">
        <h1>{wrong.length ? 'Ronda terminada' : '¡Test completado! 🎉'}</h1>
        <div className="stats">
          <div className="stat">
            <div className="label">{lastIdx === 0 ? 'Correctas' : `Correctas en el repaso ${lastIdx}`}</div>
            <div className="value">
              {last.correct}/{session.rounds[lastIdx].qids.length}
            </div>
          </div>
          <div className="stat">
            <div className="label">Primer intento</div>
            <div className="value">{Math.round((first.correct / total) * 100)}%</div>
          </div>
          <div className="stat">
            <div className="label">Acumulado</div>
            <div className="value">
              {cumulative[lastIdx]}/{total}
            </div>
          </div>
          <div className="stat">
            <div className="label">Puntos (1er intento)</div>
            <div className="value">{first.points.toLocaleString('es-AR')}</div>
          </div>
          <div className="stat">
            <div className="label">Tiempo</div>
            <div className="value">{formatDuration(last.timeMs)}</div>
          </div>
        </div>

        {session.rounds.length > 1 && (
          <>
            <h3>Tu progreso en esta sesión</h3>
            <RoundsChart labels={roundLabels} values={cumulative} total={total} />
          </>
        )}

        <div className="row" style={{ marginTop: 18 }}>
          {wrong.length > 0 && (
            <button className="btn primary big" onClick={onRetryWrong} autoFocus>
              Rehacer solo las que fallé ({wrong.length})
            </button>
          )}
          <button className="btn big" onClick={onBack}>Volver al test</button>
        </div>
      </div>

      {eligible && (
        <>
          {!playerName && !session.leaderboard && (
            <div className="card stack">
              <h2>Entrá al ranking</h2>
              <p className="muted" style={{ margin: 0 }}>
                Hiciste el banco completo. Elegí tu nombre para el ranking: se guarda en este navegador y se usa en
                todos los tests.
              </p>
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault()
                  const name = nameInput.trim()
                  if (name) setPlayerName(name)
                }}
              >
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={40}
                  placeholder="Tu nombre"
                  aria-label="Tu nombre para el ranking"
                  autoFocus
                />
                <button className="btn primary" disabled={!nameInput.trim()}>Guardar y enviar</button>
              </form>
            </div>
          )}
          {sending && <div className="alert warn">Enviando tu puntaje…</div>}
          {session.leaderboard?.status === 'error' && (
            <div className="alert error">
              No se pudo enviar al ranking: {session.leaderboard.error}{' '}
              <button className="btn" onClick={() => playerName && submit(playerName)}>Reintentar</button>
            </div>
          )}
          {session.leaderboard?.status === 'sent' && (
            <div className="alert ok">
              Puntaje enviado como <strong>{session.leaderboard.name}</strong> (si ya tenías uno mejor, se mantiene el
              mejor).
            </div>
          )}
          <Leaderboard testId={test.id} refreshKey={refreshKey} />
        </>
      )}
      {!eligible && (
        <p className="muted small">
          Este intento no cuenta para el ranking: solo cuentan los tests con el banco completo de preguntas.
        </p>
      )}
    </>
  )
}
