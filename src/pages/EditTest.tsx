import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/supabase'
import { useAsync } from '../lib/useAsync'
import { useTitle } from '../lib/useTitle'
import { parseTestJson, BLANK_RE } from '../lib/parse'
import { TYPE_LABELS, type FullTest, type Question } from '../lib/types'
import QuestionEditor from '../components/QuestionEditor'
import { toast } from '../components/Toast'

interface Item {
  q: Question
  removed: boolean
  isNew: boolean
  edited: boolean
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function answerSummary(q: Question) {
  switch (q.tipo) {
    case 'multiple_choice':
    case 'seleccion_multiple':
      return q.correctas.map((c) => q.opciones[c]).join(', ')
    case 'verdadero_falso':
      return q.respuesta ? 'Verdadero' : 'Falso'
    case 'completar':
      return q.respuestas.map((r) => r[0]).join(', ')
    case 'texto':
      return q.respuestas[0]
    case 'unir':
      return q.pares.map(([l, r]) => `${l} → ${r}`).join(' · ')
    case 'ordenar':
      return q.pasos.join(' → ')
  }
}

export default function EditTest() {
  const { id = '' } = useParams()
  const { data: test, error, loading } = useAsync(() => api.getTest(id), [id])
  useTitle(test ? `Editar ${test.title}` : 'Editar test')
  if (loading) return <p className="muted" role="status">Cargando el test…</p>
  if (error)
    return (
      <div className="alert error" role="alert">
        <span className="icon" aria-hidden="true">✗</span>
        <div className="alert-body">No se pudo cargar el test: {error}</div>
      </div>
    )
  if (!test || !test.is_owner)
    return (
      <div className="card empty">
        <h1>No podés editar este test</h1>
        <p className="muted">Solo se puede editar desde el navegador en el que se subió.</p>
        <Link viewTransition to="/mis-tests" className="btn primary">Ir a Mis tests</Link>
      </div>
    )
  return <Editor test={test} />
}

function Editor({ test }: { test: FullTest }) {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(test.title)
  const [description, setDescription] = useState(test.description ?? '')
  const [items, setItems] = useState<Item[]>(() =>
    test.questions.map((q) => ({ q, removed: false, isNew: false, edited: false })),
  )
  const [editing, setEditing] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const removed = items.filter((i) => i.removed && !i.isNew).length
  const added = items.filter((i) => i.isNew && !i.removed).length
  const edited = items.filter((i) => i.edited && !i.removed && !i.isNew).length
  const remaining = items.filter((i) => !i.removed).length
  const questionsChanged = removed + added + edited > 0
  const dirty = questionsChanged || title.trim() !== test.title || description.trim() !== (test.description ?? '')

  // Avisa antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty || saving) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    addEventListener('beforeunload', onBeforeUnload)
    return () => removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, saving])

  const visible = useMemo(() => {
    const term = norm(search.trim())
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !term || norm(`${item.q.consigna} ${answerSummary(item.q)}`).includes(term))
  }, [items, search])

  const update = (qid: number, patch: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.q.id === qid ? { ...i, ...patch } : i)))

  async function addFromFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      const parsed = parseTestJson(await file.text())
      const nextId = Math.max(-1, ...items.map((i) => i.q.id)) + 1
      const fresh = parsed.preguntas.map((q, k) => ({ q: { ...q, id: nextId + k }, removed: false, isNew: true, edited: false }))
      setItems((list) => [...list, ...fresh])
      toast(`Se agregaron ${fresh.length} pregunta${fresh.length === 1 ? '' : 's'} al final`)
    } catch (e) {
      setError(`No se pudo agregar el archivo: ${(e as Error).message}`)
    }
  }

  async function save() {
    if (!title.trim()) return setError('El título no puede quedar vacío.')
    if (!remaining) return setError('El test tiene que tener al menos una pregunta.')
    setSaving(true)
    setError(null)
    try {
      const questions = questionsChanged ? items.filter((i) => !i.removed).map((i) => i.q) : null
      await api.updateTest(test.id, title.trim(), description.trim(), questions)
      toast('Cambios guardados')
      navigate(`/test/${test.id}`, { viewTransition: true })
    } catch (e) {
      setError(`No se pudieron guardar los cambios: ${(e as Error).message}`)
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <p className="small" style={{ marginBottom: 6 }}>
          <Link viewTransition to={`/test/${test.id}`}>‹ Volver al test</Link>
        </p>
        <h1>Editar test</h1>
        <p>Cambiá el nombre, corregí preguntas, quitá las que no sirven o agregá más desde otro archivo.</p>
      </div>

      <section className="card stack" aria-labelledby="datos-title">
        <h2 id="datos-title">Datos del test</h2>
        <label className="field">
          Título
          <input type="text" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          Descripción <span className="hint">(opcional)</span>
          <textarea rows={2} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </section>

      <section className="card" aria-labelledby="preguntas-title">
        <div className="spread" style={{ marginBottom: 14 }}>
          <h2 id="preguntas-title" style={{ margin: 0 }}>Preguntas ({remaining})</h2>
          <button className="btn small" onClick={() => fileRef.current?.click()}>+ Agregar desde un JSON</button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              addFromFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
        {items.length > 6 && (
          <label className="field" style={{ marginBottom: 14 }}>
            <span className="visually-hidden">Buscar pregunta</span>
            <input type="text" placeholder="Buscar una pregunta…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        )}

        {search && !visible.length && <p className="muted">Ninguna pregunta coincide con "{search}".</p>}

        <ol className="q-list">
          {visible.map(({ item, index }) => {
            const { q } = item
            const n = index + 1
            if (editing === q.id) {
              return (
                <li key={q.id} className="q-item editing">
                  <QuestionEditor
                    question={q}
                    number={n}
                    onCancel={() => setEditing(null)}
                    onSave={(nq) => {
                      update(q.id, { q: nq, edited: true })
                      setEditing(null)
                    }}
                  />
                </li>
              )
            }
            return (
              <li key={q.id} className={`q-item${item.removed ? ' removed' : ''}`}>
                <span className="q-num" aria-hidden="true">{n}</span>
                <div className="q-main">
                  <div className="row small" style={{ gap: 6, marginBottom: 4 }}>
                    <span className="badge">{TYPE_LABELS[q.tipo]}</span>
                    {item.isNew && <span className="badge brand">Nueva</span>}
                    {item.edited && !item.isNew && <span className="badge brand">Editada</span>}
                    {item.removed && <span className="badge danger-badge">Se va a quitar</span>}
                  </div>
                  <p className="q-text">{q.consigna.replace(BLANK_RE, '___')}</p>
                  <p className="small muted" style={{ margin: 0 }}>Respuesta: {answerSummary(q)}</p>
                </div>
                <div className="q-actions">
                  {item.removed ? (
                    <button className="btn small" onClick={() => update(q.id, { removed: false })}>Deshacer</button>
                  ) : (
                    <>
                      <button className="btn small" onClick={() => setEditing(q.id)} aria-label={`Editar la pregunta ${n}`}>
                        Editar
                      </button>
                      <button className="btn small danger" onClick={() => update(q.id, { removed: true })} aria-label={`Quitar la pregunta ${n}`}>
                        Quitar
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {error && (
        <div className="alert error" role="alert">
          <span className="icon" aria-hidden="true">✗</span>
          <div className="alert-body">{error}</div>
        </div>
      )}

      <div className="save-bar" role="region" aria-label="Guardar cambios">
        <div className="save-bar-inner">
          <div className="small">
            {!dirty ? (
              <span className="muted">Todavía no hiciste cambios.</span>
            ) : (
              <>
                <strong>Cambios sin guardar</strong>
                {questionsChanged && (
                  <span className="muted">
                    {' '}
                    · {[removed && `${removed} quitada${removed === 1 ? '' : 's'}`, added && `${added} nueva${added === 1 ? '' : 's'}`, edited && `${edited} editada${edited === 1 ? '' : 's'}`]
                      .filter(Boolean)
                      .join(', ')}
                    . El ranking de este test se va a reiniciar.
                  </span>
                )}
              </>
            )}
          </div>
          <div className="row">
            <Link viewTransition to={`/test/${test.id}`} className="btn small">Descartar</Link>
            <button className="btn primary small" onClick={save} disabled={!dirty || saving || editing !== null}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
        {editing !== null && <p className="small muted save-bar-note">Terminá de editar la pregunta abierta antes de guardar.</p>}
      </div>

    </>
  )
}
