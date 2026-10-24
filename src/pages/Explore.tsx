import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/supabase'
import { useAsync } from '../lib/useAsync'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Explore() {
  const { data, error, loading } = useAsync(() => api.publicTests(), [])
  const [q, setQ] = useState('')
  const list = (data ?? []).filter((t) => norm(`${t.title} ${t.description ?? ''}`).includes(norm(q)))

  return (
    <>
      <h1>Tests públicos</h1>
      <p className="muted">Tests que otros usuarios compartieron. Hacé el banco completo para entrar al ranking.</p>
      <input
        type="text"
        placeholder="Buscar por título o descripción…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: '100%', marginBottom: 18 }}
        aria-label="Buscar tests"
      />
      {error && <div className="alert error">{error}</div>}
      {loading && !data && <p className="muted">Cargando…</p>}
      {data && !list.length && <div className="card">No hay tests públicos{q ? ' que coincidan' : ' todavía'}.</div>}
      <div className="grid">
        {list.map((t) => (
          <Link key={t.id} to={`/test/${t.id}`} className="card" style={{ marginBottom: 0, textDecoration: 'none', color: 'inherit' }}>
            <h3>{t.title}</h3>
            {t.description && <p className="muted small">{t.description}</p>}
            <div className="row small muted">
              <span>{t.question_count} preguntas</span>·
              <span>{t.players} en el ranking</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
