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
    <section className="card" aria-labelledby={`lb-${testId}`}>
      <h2 id={`lb-${testId}`}>Ranking</h2>
      <p className="muted small">
        Cuenta el primer intento haciendo todas las preguntas. Cada respuesta correcta vale hasta 1000 puntos: cuanto
        más rápido, más puntos. Se guarda tu mejor resultado.
      </p>
      {error && <div className="alert error">{error}</div>}
      {loading && !data && <p className="muted" role="status">Cargando el ranking…</p>}
      {data && !rows.length && <p className="muted">Todavía nadie entró al ranking. Hacé todas las preguntas y ocupá el primer lugar.</p>}
      {!!rows.length && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Puesto</th>
                <th scope="col">Nombre</th>
                <th scope="col" className="num">Puntos</th>
                <th scope="col" className="num">Correctas</th>
                <th scope="col" className="num">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isMe = me && r.rank === me.rank && r.player_name === me.player_name && r.score === me.score
                return (
                  <tr key={i} className={isMe ? 'me' : undefined}>
                    <td>{r.rank <= 3 ? <><span aria-hidden="true">{['🥇', '🥈', '🥉'][r.rank - 1]} </span>{r.rank}</> : r.rank}</td>
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
    </section>
  )
}
