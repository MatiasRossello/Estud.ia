import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseTestJson, type ParsedTest } from '../lib/parse'
import { api } from '../lib/supabase'
import { TYPE_LABELS, type QuestionType } from '../lib/types'
import { EXAMPLE_JSON } from '../lib/example'

export default function Home() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedTest | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function load(source: string) {
    setText(source)
    setError(null)
    setParsed(null)
    if (!source.trim()) return
    try {
      const p = parseTestJson(source)
      setParsed(p)
      setTitle(p.titulo)
      setDescription(p.descripcion)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return
    if (file.size > 3_000_000) return setError('El archivo es demasiado grande (máximo 3 MB)')
    load(await file.text())
  }

  async function save() {
    if (!parsed) return
    if (!title.trim()) return setError('Ponele un título al test')
    setSaving(true)
    setError(null)
    try {
      const id = await api.createTest(title.trim(), description.trim(), parsed.preguntas)
      navigate(`/test/${id}`)
    } catch (e) {
      setError(`No se pudo guardar: ${(e as Error).message}`)
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
      <section className="hero">
        <h1>Estudiá con tus propias preguntas</h1>
        <p>
          Subí un JSON con tu banco de preguntas, armá tests aleatorios, repasá las que fallaste y competí en el
          ranking. ¿No tenés el JSON? <Link to="/como-crear">Generalo con tu IA en un minuto</Link>.
        </p>
      </section>

      <div className="card">
        <div
          className={`drop${over ? ' over' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
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
          <strong>Arrastrá tu archivo .json acá</strong>
          <div className="muted small">o hacé clic para elegirlo</div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => readFile(e.target.files?.[0])}
          />
        </div>

        <details style={{ marginTop: 16 }}>
          <summary className="small" style={{ cursor: 'pointer' }}>
            …o pegá el JSON directamente
          </summary>
          <textarea
            rows={8}
            value={text}
            onChange={(e) => load(e.target.value)}
            placeholder='{ "titulo": "...", "preguntas": [ ... ] }'
            style={{ marginTop: 10 }}
            aria-label="Contenido JSON"
          />
          <button className="btn small" type="button" onClick={() => load(JSON.stringify(EXAMPLE_JSON, null, 2))}>
            Cargar ejemplo
          </button>
        </details>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}

      {parsed && (
        <div className="card stack">
          <div className="alert ok">
            ✓ JSON válido: {parsed.preguntas.length} pregunta{parsed.preguntas.length === 1 ? '' : 's'}
          </div>
          <div className="row">
            {counts.map(([tipo, n]) => (
              <span key={tipo} className="badge accent">
                {TYPE_LABELS[tipo as QuestionType]}: {n}
              </span>
            ))}
          </div>
          <label className="field">
            Título
            <input type="text" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            Descripción (opcional)
            <textarea rows={2} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <p className="muted small">
            El test se guarda como <strong>privado</strong> en "Mis tests". Después lo podés hacer público para que
            otros lo encuentren.
          </p>
          <button className="btn primary big" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar y empezar'}
          </button>
        </div>
      )}
    </>
  )
}
