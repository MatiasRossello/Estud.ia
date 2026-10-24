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
  sanitizeSession,
  roundStats,
  shuffle,
  wrongCounts,
} from '../lib/quiz'
import { useTitle } from '../lib/useTitle'
import Player from '../components/Player'
import Results from '../components/Results'
import Leaderboard from '../components/Leaderboard'
import { SessionsChart } from '../components/Charts'
import { copyText } from '../components/Toast'

type View = { kind: 'home' } | { kind: 'play'; sessionId: string } | { kind: 'results'; sessionId: string }

const MODE_LABELS: Record<SessionMode, string> = {
  full: 'Todas las preguntas',
  partial: 'Algunas preguntas',
  review: 'Repaso de errores',
}

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function TestPage() {
  const { id = '' } = useParams()
  const { data: test, error, loading } = useAsync(() => api.getTest(id), [id])
  useTitle(test?.title)
  const store = useStore()
  const [view, setView] = useState<View>({ kind: 'home' })
  const [count, setCount] = useState(10)

  const sessions = useMemo(
    () =>
      store.sessions
        .filter((s) => s.testId === id)
        .map((s) => (test ? sanitizeSession(s, test.byId) : s))
        .filter((s): s is Session => s !== null)
        .sort((a, b) => a.createdAt - b.createdAt),
    [store.sessions, id, test],
  )
  const counts = useMemo(() => wrongCounts(sessions), [sessions])

  if (loading) return <p className="muted" role="status">Cargando el test…</p>
  if (error)
    return (
      <div className="alert error" role="alert">
        <span className="icon" aria-hidden="true">✗</span>
        <div className="alert-body">No se pudo cargar el test: {error}</div>
      </div>
    )
  if (!test)
    return (
      <div className="card empty">
        <h1>No encontramos este test</h1>
        <p className="muted">Puede que lo hayan borrado o que sea privado.</p>
        <Link viewTransition to="/explorar" className="btn primary">Ver tests públicos</Link>
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
    upsertSession({ ...s, rounds: [...s.rounds, newRound(wrong, test!.byId)] })
    setView({ kind: 'play', sessionId: s.id })
    scrollTo({ top: 0 })
  }

  if (current && view.kind === 'play' && !isSessionDone(current)) {
    return (
      <Player
        key={`${current.id}-${current.rounds.length}`}
        test={test}
        session={current}
        onRoundEnd={() => setView({ kind: 'results', sessionId: current.id })}
        onExit={() => setView({ kind: 'home' })}
      />
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

  const allIds = test.questions.map((q) => q.id)
  const unfinished = [...sessions].reverse().find((s) => !isSessionDone(s))
  const wrongOnce = [...counts.keys()]
  const wrongTwice = wrongOnce.filter((q) => (counts.get(q) ?? 0) >= 2)
  const finished = sessions.filter((s) => isRoundDone(s.rounds[0]))
  const n = Math.min(Math.max(1, count || 1), total)

  return (
    <>
      <div className="spread page-head">
        <div>
          <h1 style={{ marginBottom: 6 }}>{test.title}</h1>
          <div className="row small">
            <span className="badge">{total} preguntas</span>
            <span className={`badge${test.is_public ? ' public' : ''}`}>{test.is_public ? '● Público' : '○ Privado'}</span>
            {test.is_owner && <span className="badge">Lo subiste vos</span>}
          </div>
          {test.description && <p style={{ marginTop: 12, marginBottom: 0 }}>{test.description}</p>}
        </div>
        <div className="row">
          {test.is_owner && (
            <Link viewTransition to={`/test/${test.id}/editar`} className="btn">
              Editar test
            </Link>
          )}
          <button className="btn" onClick={() => copyText(`${location.origin}/test/${test.id}`, 'Link copiado')}>
            Copiar link para compartir
          </button>
        </div>
      </div>

      {!test.is_public && test.is_owner && (
        <p className="small muted">
          Solo vos ves este test. Para compartirlo, hacelo público en <Link viewTransition to="/mis-tests">Mis tests</Link>.
        </p>
      )}

      {unfinished && (
        <div className="alert info" role="status">
          <span className="icon" aria-hidden="true">⏸</span>
          <div className="alert-body spread">
            <span>
              Dejaste un test por la mitad ({MODE_LABELS[unfinished.mode].toLowerCase()}, {fmtDate(unfinished.createdAt)}).
            </span>
            <button className="btn primary small" onClick={() => setView({ kind: 'play', sessionId: unfinished.id })}>
              Seguir donde lo dejé
            </button>
          </div>
        </div>
      )}

      <h2 className="visually-hidden">Empezar</h2>
      <div className="choice-grid">
        <section className="card choice-main stack" aria-labelledby="full-title">
          <h3 id="full-title" style={{ fontSize: '1.3rem' }}>
            Todas las preguntas <span className="badge brand">Suma al ranking</span>
          </h3>
          <p className="muted">
            Las {total} preguntas en orden al azar. Tu primer intento compite en el ranking: acertar rápido da más puntos.
          </p>
          <button className="btn primary big block" onClick={() => start('full', shuffle(allIds))}>
            Empezar con las {total}
          </button>
        </section>

        <section className="card stack" aria-labelledby="partial-title">
          <h3 id="partial-title" style={{ fontSize: '1.3rem' }}>Algunas preguntas</h3>
          <p className="muted">Para practicar un rato. Se eligen al azar y no suman al ranking.</p>
          <div className="row">
            <label htmlFor="q-count" className="small" style={{ fontWeight: 700 }}>Cantidad</label>
            <div className="stepper">
              <button type="button" onClick={() => setCount(Math.max(1, n - 5))} disabled={n <= 1} aria-label="Restar 5 preguntas">−</button>
              <input
                id="q-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={total}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                onBlur={() => setCount(n)}
              />
              <button type="button" onClick={() => setCount(Math.min(total, n + 5))} disabled={n >= total} aria-label="Sumar 5 preguntas">+</button>
            </div>
            <span className="small muted">de {total}</span>
          </div>
          <button className="btn big block" onClick={() => start('partial', pickRandom(allIds, n))}>
            Empezar con {n}
          </button>
        </section>
      </div>

      <section className="card section" aria-labelledby="review-title">
        <h2 id="review-title">Repasar tus errores</h2>
        {wrongOnce.length ? (
          <>
            <p className="muted">Según todo lo que respondiste en este test hasta ahora.</p>
            <div className="row">
              <button className="btn primary" disabled={!wrongTwice.length} onClick={() => start('review', shuffle(wrongTwice))}>
                Las que fallé más de una vez ({wrongTwice.length})
              </button>
              <button className="btn" onClick={() => start('review', shuffle(wrongOnce))}>
                Todas las que fallé alguna vez ({wrongOnce.length})
              </button>
            </div>
          </>
        ) : (
          <p className="muted">Cuando te equivoques en alguna pregunta, vas a poder repasarla desde acá.</p>
        )}
      </section>

      {finished.length > 0 && (
        <section className="card section" aria-labelledby="progress-title">
          <h2 id="progress-title">Tu progreso</h2>
          <p className="muted small">
            Qué porcentaje acertaste de entrada en cada intento, y cuánto llegaste a saber después de repasar.
          </p>
          <SessionsChart
            labels={finished.map((s) => fmtDate(s.createdAt))}
            first={finished.map((s) => Math.round((roundStats(s.rounds[0]).correct / s.qids.length) * 100))}
            final={finished.map((s) => {
              const c = cumulativeCorrect(s)
              return Math.round((c[c.length - 1] / s.qids.length) * 100)
            })}
          />
          <div className="table-wrap" style={{ marginTop: 22 }}>
            <table>
              <caption><h3 style={{ margin: '0 0 6px' }}>Todos tus intentos</h3></caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Tipo</th>
                  <th scope="col" className="num">De entrada</th>
                  <th scope="col" className="num">Al final</th>
                  <th scope="col" className="num">Puntos</th>
                  <th scope="col"><span className="visually-hidden">Acciones</span></th>
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
                      <td className="num">{roundStats(s.rounds[0]).points.toLocaleString('es-AR')}</td>
                      <td className="num">
                        {!isSessionDone(s) ? (
                          <button className="btn small" onClick={() => setView({ kind: 'play', sessionId: s.id })}>
                            Seguir
                          </button>
                        ) : pending > 0 ? (
                          <button className="btn small" onClick={() => retryWrong(s)}>
                            Repetir {pending} fallada{pending === 1 ? '' : 's'}
                          </button>
                        ) : (
                          <button className="btn small ghost" onClick={() => setView({ kind: 'results', sessionId: s.id })}>
                            Ver resultado
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="section">
        <Leaderboard testId={test.id} />
      </div>
    </>
  )
}
