import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/supabase'
import { useAsync } from '../lib/useAsync'
import { useStore } from '../lib/storage'
import { useTitle } from '../lib/useTitle'
import { copyText, toast } from '../components/Toast'

export default function MyTests() {
  useTitle('Mis tests')
  const { data, error, loading, reload } = useAsync(() => api.myTests(), [])
  const { sessions } = useStore()
  const [busy, setBusy] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function act(id: string, fn: () => Promise<void>, okMsg: string) {
    setBusy(id)
    setActionError(null)
    try {
      await fn()
      await reload()
      toast(okMsg)
    } catch (e) {
      setActionError(`No se pudo completar la acción: ${(e as Error).message}`)
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  return (
    <>
      <div className="spread page-head">
        <div>
          <h1>Mis tests</h1>
          <p style={{ margin: 0 }}>
            Los tests que subiste desde este navegador. Hacelos públicos para que otros los encuentren.
          </p>
        </div>
        <Link viewTransition to="/subir" className="btn primary">Subir otro test</Link>
      </div>

      {error && <div className="alert error" role="alert"><span className="icon" aria-hidden="true">✗</span><div className="alert-body">No se pudieron cargar tus tests: {error}</div></div>}
      {actionError && <div className="alert error" role="alert"><span className="icon" aria-hidden="true">✗</span><div className="alert-body">{actionError}</div></div>}
      {loading && !data && <p className="muted" role="status">Cargando tus tests…</p>}

      {data && !data.length && (
        <div className="card empty">
          <h2>Todavía no subiste ningún test</h2>
          <p className="muted">Armá el archivo con tu IA en un minuto y subilo.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link viewTransition to="/subir" className="btn primary">Subir mi primer test</Link>
            <Link viewTransition to="/como-crear" className="btn">Cómo crear el JSON</Link>
          </div>
        </div>
      )}

      <div className="grid">
        {data?.map((t) => {
          const played = sessions.filter((s) => s.testId === t.id).length
          const isConfirming = confirming === t.id
          return (
            <article key={t.id} className="card test-card">
              <div className="spread">
                <span className={`badge${t.is_public ? ' public' : ''}`}>
                  {t.is_public ? '● Público' : '○ Privado'}
                </span>
                <span className="small muted">{t.question_count} preguntas</span>
              </div>
              <h3>
                <Link viewTransition to={`/test/${t.id}`}>{t.title}</Link>
              </h3>
              {t.description && <p className="desc">{t.description}</p>}
              <div className="test-meta">
                {played ? `Lo hiciste ${played} ${played === 1 ? 'vez' : 'veces'}` : 'Todavía no lo hiciste'}
              </div>
              <div className="actions">
                {isConfirming ? (
                  <div role="group" aria-label={`Confirmar eliminación de ${t.title}`} className="stack">
                    <p className="small" style={{ margin: 0 }}>
                      <strong>¿Eliminar este test?</strong> También se borra su ranking. No se puede deshacer.
                    </p>
                    <div className="row">
                      <button
                        className="btn danger solid small"
                        disabled={busy === t.id}
                        onClick={() => act(t.id, () => api.deleteTest(t.id), 'Test eliminado')}
                        autoFocus
                      >
                        Sí, eliminar
                      </button>
                      <button className="btn small" onClick={() => setConfirming(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="row">
                    <button
                      className="btn small"
                      disabled={busy === t.id}
                      onClick={() =>
                        act(
                          t.id,
                          () => api.setPublic(t.id, !t.is_public),
                          t.is_public ? 'El test ahora es privado' : 'El test ahora es público',
                        )
                      }
                    >
                      {t.is_public ? 'Hacer privado' : 'Hacer público'}
                    </button>
                    <Link viewTransition to={`/test/${t.id}/editar`} className="btn small">
                      Editar
                    </Link>
                    <button className="btn small" onClick={() => copyText(`${location.origin}/test/${t.id}`, 'Link copiado')}>
                      Copiar link
                    </button>
                    <button className="btn small danger" onClick={() => setConfirming(t.id)} aria-label={`Eliminar ${t.title}`}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
