import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseTestJson, type ParsedTest } from '../lib/parse'
import { api } from '../lib/supabase'
import { TYPE_LABELS, type QuestionType } from '../lib/types'
import { EXAMPLE_JSON } from '../lib/example'
import { useTitle } from '../lib/useTitle'

export default function Upload() {
  useTitle('Subir preguntas')
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLHeadingElement>(null)
  const [over, setOver] = useState(false)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedTest | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (parsed) previewRef.current?.focus()
  }, [parsed])

  function load(source: string, name: string | null = null) {
    setText(source)
    setFileName(name)
    setError(null)
    setParsed(null)
    if (!source.trim()) return
    try {
      const p = parseTestJson(source)
      setParsed(p)
      setTitle(p.titulo || name?.replace(/\.json$/i, '') || '')
      setDescription(p.descripcion)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return
    if (file.size > 3_000_000) return setError('El archivo pesa más de 3 MB. Dividilo en tests más chicos.')
    load(await file.text(), file.name)
  }

  async function save() {
    if (!parsed) return
    if (!title.trim()) return setError('Escribí un título para el test.')
    setSaving(true)
    setError(null)
    try {
      const id = await api.createTest(title.trim(), description.trim(), parsed.preguntas)
      navigate(`/test/${id}`)
    } catch (e) {
      setError(`No se pudo guardar el test: ${(e as Error).message}. Revisá tu conexión y probá de nuevo.`)
      setSaving(false)
    }
  }

  const counts = parsed
    ? Object.entries(
        parsed.preguntas.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.tipo]: (acc[q.tipo] ?? 0) + 1 }), {}),
      )
    : []

  return (
    <>
      <div className="page-head">
        <h1>Subir preguntas</h1>
        <p>Cargá tu archivo JSON y en un momento empezás a estudiar.</p>
      </div>

      <ol className="steps" aria-label="Cómo funciona">
        <li>
          <div>
            <strong>Armá el archivo con tu IA</strong>
            <span>
              <Link viewTransition to="/como-crear">Copiá nuestro prompt</Link> y pegalo en ChatGPT, Gemini o Claude con tus apuntes.
            </span>
          </div>
        </li>
        <li className={parsed ? 'done' : undefined}>
          <div>
            <strong>Subilo acá</strong>
            <span>Revisamos que esté bien y te avisamos si algo falla.</span>
          </div>
        </li>
        <li>
          <div>
            <strong>Estudiá</strong>
            <span>Elegí cuántas preguntas querés y repasá tus errores.</span>
          </div>
        </li>
      </ol>

      {!parsed && (
        <div className="card">
          <button
            type="button"
            className={`drop${over ? ' over' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              readFile(e.dataTransfer.files[0])
            }}
          >
            <svg className="drop-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3" />
            </svg>
            <span className="drop-title">Elegí tu archivo .json</span>
            <span className="drop-sub">o arrastralo hasta acá</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              readFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />

          <div className="or" aria-hidden="true">o</div>

          <details className="disclosure">
            <summary>Pegar el texto del JSON</summary>
            <label className="visually-hidden" htmlFor="json-text">Contenido del JSON</label>
            <textarea
              id="json-text"
              rows={9}
              value={text}
              onChange={(e) => load(e.target.value)}
              placeholder='{ "titulo": "...", "preguntas": [ ... ] }'
              style={{ marginTop: 8 }}
              spellCheck={false}
            />
          </details>
          <p className="small muted" style={{ marginTop: 14 }}>
            ¿Querés ver cómo funciona antes?{' '}
            <button type="button" className="btn small" onClick={() => load(JSON.stringify(EXAMPLE_JSON, null, 2), 'ejemplo.json')}>
              Probar con un ejemplo
            </button>
          </p>
        </div>
      )}

      {error && (
        <div className="alert error" role="alert">
          <span className="icon" aria-hidden="true">✗</span>
          <div className="alert-body">
            <strong>Hay un problema con el archivo.</strong> {error}
            <div className="small" style={{ marginTop: 4 }}>
              Corregilo y volvé a subirlo, o pedile a tu IA que lo arregle pegándole este mensaje.
            </div>
          </div>
        </div>
      )}

      {parsed && (
        <div className="card stack">
          <h2 ref={previewRef} tabIndex={-1}>
            ✓ {parsed.preguntas.length} pregunta{parsed.preguntas.length === 1 ? '' : 's'} listas
            {fileName && <span className="muted small" style={{ fontWeight: 400 }}> de {fileName}</span>}
          </h2>
          <ul className="type-list" aria-label="Tipos de pregunta">
            {counts.map(([tipo, n]) => (
              <li key={tipo} className="badge">
                {TYPE_LABELS[tipo as QuestionType]}: {n}
              </li>
            ))}
          </ul>
          <label className="field">
            Título del test
            <input type="text" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="field">
            Descripción <span className="hint" style={{ display: 'inline' }}>(opcional)</span>
            <textarea rows={2} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <p className="small muted">
            Se guarda en <strong>Mis tests</strong> y solo lo ves vos. Si querés compartirlo, después lo hacés público.
          </p>
          <div className="row">
            <button className="btn primary big" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar y empezar a estudiar'}
            </button>
            <button className="btn big ghost" onClick={() => load('')} disabled={saving}>
              Elegir otro archivo
            </button>
          </div>
        </div>
      )}

    </>
  )
}
