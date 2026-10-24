import { api } from '../lib/supabase'
import { useAsync } from '../lib/useAsync'
import { formatDuration } from '../lib/quiz'

export default function Leaderboard({ testId, refreshKey = 0 }: { testId: string; refreshKey?: number }) {
  const { data, error, loading } = useAsync(
    () => Promise.all([api.leaderboard(testId), api.myRank(testId)]),
    [testId, refreshKey],
  )
  const [rows, me] = data ?? [[], null]
  const meInTop = me && rows.some((r) => r.rank === me.rank && r.player_name === me.player_name && r.score === me.score)

  return (
    <div className="card">
      <h2>🏆 Ranking</h2>
      <p className="muted small">
        Solo cuentan los intentos con el banco completo de preguntas (el primer intento de cada sesión). Los puntos
        premian acertar y responder rápido, estilo Kahoot. Se guarda tu mejor puntaje.
      </p>
      {error && <div className="alert error">{error}</div>}
      {loading && !data && <p className="muted">Cargando…</p>}
      {data && !rows.length && <p className="muted">Nadie entró al ranking todavía. ¡Sé el primero!</p>}
      {!!rows.length && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th className="num">Puntos</th>
                <th className="num">Correctas</th>
                <th className="num">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isMe = me && r.rank === me.rank && r.player_name === me.player_name && r.score === me.score
                return (
                  <tr key={i} className={isMe ? 'me' : undefined}>
                    <td>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</td>
                    <td>{r.player_name}{isMe && ' (vos)'}</td>
                    <td className="num">{r.score.toLocaleString('es-AR')}</td>
                    <td className="num">{r.correct}/{r.total}</td>
                    <td className="num">{formatDuration(r.duration_ms)}</td>
                  </tr>
                )
              })}
              {me && !meInTop && (
                <tr className="me">
                  <td>{me.rank}</td>
                  <td>{me.player_name} (vos)</td>
                  <td className="num">{me.score.toLocaleString('es-AR')}</td>
                  <td className="num">{me.correct}/{me.total}</td>
                  <td className="num">{formatDuration(me.duration_ms)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
