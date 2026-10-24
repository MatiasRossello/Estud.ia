import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/supabase'
import { useAsync } from '../lib/useAsync'
import { upsertSession, useStore, type Session, type SessionMode } from '../lib/storage'
import {
  cumulativeCorrect,
  isRoundDone,
  isSessionDone,
  newRound,
  newSession,
  pendingWrong,
  pickRandom,
  roundStats,
  shuffle,
  wrongCounts,
} from '../lib/quiz'
import Player from '../components/Player'
import Results from '../components/Results'
import Leaderboard from '../components/Leaderboard'
import { SessionsChart } from '../components/Charts'

type View = { kind: 'home' } | { kind: 'play'; sessionId: string } | { kind: 'results'; sessionId: string }

const MODE_LABELS: Record<SessionMode, string> = {
  full: 'Banco completo',
  partial: 'Parcial',
  review: 'Repaso de falladas',
}

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function TestPage() {
  const { id = '' } = useParams()
  const { data: test, error, loading } = useAsync(() => api.getTest(id), [id])
  const store = useStore()
  const [view, setView] = useState<View>({ kind: 'home' })
  const [count, setCount] = useState(10)
  const [copied, setCopied] = useState(false)

  const sessions = useMemo(
    () => store.sessions.filter((s) => s.testId === id).sort((a, b) => a.createdAt - b.createdAt),
    [store.sessions, id],
  )
  const counts = useMemo(() => wrongCounts(sessions), [sessions])

  if (loading) return <p className="muted">Cargando test…</p>
  if (error) return <div className="alert error">{error}</div>
  if (!test)
    return (
      <div className="card">
        Este test no existe o es privado. <Link to="/explorar">Ver tests públicos</Link>
      </div>
    )

  const current = view.kind !== 'home' ? sessions.find((s) => s.id === view.sessionId) : undefined
  const total = test.question_count

  function start(mode: SessionMode, qids: number[]) {
    const s = newSession(test!, mode, qids)
    upsertSession(s)
    setView({ kind: 'play', sessionId: s.id })
    scrollTo({ top: 0 })
  }

  function retryWrong(s: Session) {
    const wrong = pendingWrong(s)
    if (!wrong.length) return
    upsertSession({ ...s, rounds: [...s.rounds, newRound(wrong, test!.questions)] })
    setView({ kind: 'play', sessionId: s.id })
    scrollTo({ top: 0 })
  }

  if (current && view.kind === 'play' && !isSessionDone(current)) {
    return (
      <>
        <h2 style={{ marginBottom: 14 }}>{test.title}</h2>
        <Player
          key={`${current.id}-${current.rounds.length}`}
          test={test}
          session={current}
          onRoundEnd={() => setView({ kind: 'results', sessionId: current.id })}
          onExit={() => setView({ kind: 'home' })}
        />
      </>
    )
  }
  if (current && view.kind !== 'home') {
    return (
      <Results
        test={test}
        session={current}
        onRetryWrong={() => retryWrong(current)}
        onBack={() => setView({ kind: 'home' })}
      />
    )
  }

  const unfinished = [...sessions].reverse().find((s) => !isSessionDone(s))
  const wrongOnce = [...counts.keys()]
  const wrongTwice = wrongOnce.filter((q) => (counts.get(q) ?? 0) >= 2)
  const finished = sessions.filter((s) => isRoundDone(s.rounds[0]))
  const n = Math.min(Math.max(1, count || 1), total)

  return (
    <>
      <div className="spread">
        <div>
          <h1 style={{ marginBottom: 4 }}>{test.title}</h1>
          <div className="row small muted">
            <span>{total} preguntas</span>
            <span className={`badge${test.is_public ? ' public' : ''}`}>{test.is_public ? 'Público' : 'Privado'}</span>
            {test.is_owner && <span className="badge accent">Tuyo</span>}
          </div>
        </div>
        <button
          className="btn"
          onClick={() => {
            navigator.clipboard.writeText(location.href)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? '¡Link copiado!' : 'Compartir link'}
        </button>
      </div>
      {test.description && <p className="muted" style={{ marginTop: 10 }}>{test.description}</p>}
      {!test.is_public && test.is_owner && (
        <p className="small muted">
          Solo vos podés ver este test. Hacelo público desde <Link to="/mis-tests">Mis tests</Link>.
        </p>
      )}

      {unfinished && (
        <div className="alert warn spread">
          <span>
            Tenés un test sin terminar ({MODE_LABELS[unfinished.mode]}, {fmtDate(unfinished.createdAt)}).
          </span>
          <button className="btn primary" onClick={() => setView({ kind: 'play', sessionId: unfinished.id })}>
            Continuar
          </button>
        </div>
      )}

      <div className="grid" style={{ marginTop: 18 }}>
        <div className="card stack" style={{ marginBottom: 0 }}>
          <h2>Banco completo</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Las {total} preguntas en orden aleatorio. <strong>Cuenta para el ranking.</strong>
          </p>
          <button className="btn primary big" onClick={() => start('full', shuffle([...Array(total).keys()]))}>
            Empezar banco completo
          </button>
        </div>
        <div className="card stack" style={{ marginBottom: 0 }}>
          <h2>Test parcial</h2>
          <p className="muted small" style={{ margin: 0 }}>Preguntas elegidas al azar del banco. No cuenta para el ranking.</p>
          <div className="row">
            <input
              type="number"
              min={1}
              max={total}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              style={{ width: 90 }}
              aria-label="Cantidad de preguntas"
            />
            <span className="muted small">de {total}</span>
          </div>
          <button className="btn big" onClick={() => start('partial', pickRandom(total, n))}>
            Empezar con {n} pregunta{n === 1 ? '' : 's'}
          </button>
        </div>
        <div className="card stack" style={{ marginBottom: 0 }}>
          <h2>Repasar errores</h2>
          <p className="muted small" style={{ margin: 0 }}>Según todo tu historial con este test.</p>
          <button className="btn" disabled={!wrongTwice.length} onClick={() => start('review', shuffle(wrongTwice))}>
            Falladas más de una vez ({wrongTwice.length})
          </button>
          <button className="btn" disabled={!wrongOnce.length} onClick={() => start('review', shuffle(wrongOnce))}>
            Falladas alguna vez ({wrongOnce.length})
          </button>
        </div>
      </div>

      {finished.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h2>Tu progreso</h2>
          <p className="muted small">
            Porcentaje de respuestas correctas en el primer intento de cada sesión y después de repasar las falladas.
          </p>
          <SessionsChart
            labels={finished.map((s) => fmtDate(s.createdAt))}
            first={finished.map((s) => Math.round((roundStats(s.rounds[0]).correct / s.qids.length) * 100))}
            final={finished.map((s) => {
              const c = cumulativeCorrect(s)
              return Math.round((c[c.length - 1] / s.qids.length) * 100)
            })}
          />
          <h3 style={{ marginTop: 22 }}>Historial de intentos</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Modo</th>
                  <th className="num">1er intento</th>
                  <th className="num">Final</th>
                  <th className="num">Repasos</th>
                  <th className="num">Puntos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...finished].reverse().map((s) => {
                  const c = cumulativeCorrect(s)
                  const pending = isSessionDone(s) ? pendingWrong(s).length : 0
                  return (
                    <tr key={s.id}>
                      <td>{fmtDate(s.createdAt)}</td>
                      <td>{MODE_LABELS[s.mode]}</td>
                      <td className="num">{c[0]}/{s.qids.length}</td>
                      <td className="num">{c[c.length - 1]}/{s.qids.length}</td>
                      <td className="num">{s.rounds.length - 1}</td>
                      <td className="num">{roundStats(s.rounds[0]).points.toLocaleString('es-AR')}</td>
                      <td className="num">
                        {!isSessionDone(s) ? (
                          <button className="btn small" onClick={() => setView({ kind: 'play', sessionId: s.id })}>
                            Continuar
                          </button>
                        ) : pending > 0 ? (
                          <button className="btn small" onClick={() => retryWrong(s)}>
                            Rehacer {pending} fallada{pending === 1 ? '' : 's'}
                          </button>
                        ) : (
                          <button className="btn small" onClick={() => setView({ kind: 'results', sessionId: s.id })}>
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <Leaderboard testId={test.id} />
      </div>
    </>
  )
}
