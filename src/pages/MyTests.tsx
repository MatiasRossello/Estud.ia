import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/supabase'
import { useAsync } from '../lib/useAsync'
import { useStore } from '../lib/storage'

export default function MyTests() {
  const { data, error, loading, reload } = useAsync(() => api.myTests(), [])
  const { sessions } = useStore()
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function act(id: string, fn: () => Promise<void>) {
    setBusy(id)
    setActionError(null)
    try {
      await fn()
      await reload()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  function copyLink(id: string) {
    navigator.clipboard.writeText(`${location.origin}/test/${id}`)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <>
      <div className="spread">
        <h1>Mis tests</h1>
        <Link to="/" className="btn primary">+ Subir JSON</Link>
      </div>
      <p className="muted small">
        Tus tests quedan asociados a este navegador. Si borrás los datos del sitio, perdés la posibilidad de editarlos.
      </p>
      {error && <div className="alert error">{error}</div>}
      {actionError && <div className="alert error">{actionError}</div>}
      {loading && !data && <p className="muted">Cargando…</p>}
      {data && !data.length && (
        <div className="card">
          Todavía no subiste ningún test. <Link to="/">Subí tu primer JSON</Link>.
        </div>
      )}
      <div className="grid">
        {data?.map((t) => {
          const played = sessions.filter((s) => s.testId === t.id).length
          return (
            <div key={t.id} className="card stack" style={{ marginBottom: 0 }}>
              <div className="spread">
                <span className={`badge${t.is_public ? ' public' : ''}`}>{t.is_public ? 'Público' : 'Privado'}</span>
                <span className="muted small">{t.question_count} preguntas</span>
              </div>
              <h3 style={{ margin: 0 }}>
                <Link to={`/test/${t.id}`}>{t.title}</Link>
              </h3>
              {t.description && <p className="muted small" style={{ margin: 0 }}>{t.description}</p>}
              <div className="muted small">
                {played ? `Lo hiciste ${played} ${played === 1 ? 'vez' : 'veces'}` : 'Sin intentos todavía'}
              </div>
              <div className="row">
                <button
                  className="btn"
                  disabled={busy === t.id}
                  onClick={() => act(t.id, () => api.setPublic(t.id, !t.is_public))}
                >
                  {t.is_public ? 'Hacer privado' : 'Hacer público'}
                </button>
                <button className="btn" onClick={() => copyLink(t.id)}>
                  {copied === t.id ? '¡Copiado!' : 'Copiar link'}
                </button>
                <button
                  className="btn danger"
                  disabled={busy === t.id}
                  onClick={() => {
                    if (window.confirm(`¿Eliminar "${t.title}"? También se borra su ranking.`)) {
                      act(t.id, () => api.deleteTest(t.id))
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
