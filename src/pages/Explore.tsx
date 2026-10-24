import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/supabase'
import { useAsync } from '../lib/useAsync'
import { useTitle } from '../lib/useTitle'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Explore() {
  useTitle('Tests públicos')
  const { data, error, loading } = useAsync(() => api.publicTests(), [])
  const [q, setQ] = useState('')
  const list = (data ?? []).filter((t) => norm(`${t.title} ${t.description ?? ''}`).includes(norm(q)))

  return (
    <>
      <div className="page-head">
        <h1>Tests públicos</h1>
        <p>Tests que compartió la comunidad. Hacé todas las preguntas de un test para entrar a su ranking.</p>
      </div>
      <label className="field" style={{ marginBottom: 22 }}>
        Buscar
        <input type="text" placeholder="Materia, tema o título" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {error && <div className="alert error" role="alert"><span className="icon" aria-hidden="true">✗</span><div className="alert-body">No se pudieron cargar los tests: {error}</div></div>}
      {loading && !data && <p className="muted" role="status">Cargando tests…</p>}
      {data && (
        <p className="small muted" role="status" aria-live="polite">
          {list.length} test{list.length === 1 ? '' : 's'}
          {q && ` para "${q}"`}
        </p>
      )}
      {data && !list.length && (
        <div className="card empty">
          <h2>{q ? 'No encontramos tests con esa búsqueda' : 'Todavía no hay tests públicos'}</h2>
          <p className="muted">{q ? 'Probá con otra palabra.' : 'Subí uno y hacelo público para que aparezca acá.'}</p>
          {!q && <Link viewTransition to="/subir" className="btn primary">Subir un test</Link>}
        </div>
      )}
      <div className="grid">
        {list.map((t) => (
          <article key={t.id} className="card test-card card-link">
            <h3>
              <Link viewTransition to={`/test/${t.id}`}>{t.title}</Link>
            </h3>
            {t.description && <p className="desc">{t.description}</p>}
            <div className="test-meta">
              <span>{t.question_count} preguntas</span>
              <span>{t.players === 1 ? '1 persona en el ranking' : `${t.players} personas en el ranking`}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
