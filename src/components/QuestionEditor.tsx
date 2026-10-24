import { useState } from 'react'
import type { Question } from '../lib/types'
import { TYPE_LABELS } from '../lib/types'
import { BLANK_RE, parseQuestion } from '../lib/parse'

const SEP = ' / '
const splitAlts = (s: string) => s.split('/').map((x) => x.trim()).filter(Boolean)

interface Props {
  question: Question
  number: number
  onSave: (q: Question) => void
  onCancel: () => void
}

/** Formulario para cambiar el texto, las opciones y las respuestas de una pregunta. */
export default function QuestionEditor({ question, number, onSave, onCancel }: Props) {
  const [consigna, setConsigna] = useState(question.consigna)
  const [explicacion, setExplicacion] = useState(question.explicacion ?? '')
  const [opciones, setOpciones] = useState(
    question.tipo === 'multiple_choice' || question.tipo === 'seleccion_multiple' ? question.opciones : [],
  )
  const [correctas, setCorrectas] = useState(
    question.tipo === 'multiple_choice' || question.tipo === 'seleccion_multiple' ? question.correctas : [],
  )
  const [respuesta, setRespuesta] = useState(question.tipo === 'verdadero_falso' ? question.respuesta : true)
  const [respuestas, setRespuestas] = useState<string[]>(
    question.tipo === 'completar'
      ? question.respuestas.map((r) => r.join(SEP))
      : question.tipo === 'texto'
        ? [question.respuestas.join(SEP)]
        : [],
  )
  const [pares, setPares] = useState<[string, string][]>(question.tipo === 'unir' ? question.pares : [])
  const [pasos, setPasos] = useState<string[]>(question.tipo === 'ordenar' ? question.pasos : [])
  const [error, setError] = useState<string | null>(null)
  const tipo = question.tipo
  const isChoice = tipo === 'multiple_choice' || tipo === 'seleccion_multiple'
  const blanks = tipo === 'completar' ? Math.max((consigna.match(BLANK_RE) ?? []).length, 1) : 0
  const uid = `qe-${question.id}`

  function toggleCorrect(i: number) {
    if (tipo === 'multiple_choice') setCorrectas([i])
    else setCorrectas(correctas.includes(i) ? correctas.filter((c) => c !== i) : [...correctas, i])
  }

  function removeOption(i: number) {
    setOpciones(opciones.filter((_, k) => k !== i))
    setCorrectas(correctas.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)))
  }

  function save() {
    const raw: Record<string, unknown> = { tipo, consigna, explicacion }
    if (isChoice) {
      raw.opciones = opciones
      raw.correctas = correctas
      if (opciones.some((o) => !o.trim())) return setError('Hay opciones vacías: completalas o quitalas.')
    }
    if (tipo === 'verdadero_falso') raw.respuesta = respuesta
    if (tipo === 'unir') {
      if (pares.some(([l, r]) => !l.trim() || !r.trim())) return setError('Hay parejas incompletas: completalas o quitalas.')
      raw.pares = pares
    }
    if (tipo === 'ordenar') {
      if (pasos.some((p) => !p.trim())) return setError('Hay pasos vacíos: completalos o quitalos.')
      raw.pasos = pasos
    }
    if (tipo === 'texto') raw.respuestas = splitAlts(respuestas[0] ?? '')
    if (tipo === 'completar') {
      raw.respuestas = Array.from({ length: blanks }, (_, i) => splitAlts(respuestas[i] ?? ''))
    }
    try {
      onSave(parseQuestion(raw, number, question.id))
    } catch (e) {
      setError((e as Error).message.replace(/^Pregunta \d+: /, ''))
    }
  }

  return (
    <div className="q-editor stack">
      <div className="spread">
        <strong>Editar pregunta {number}</strong>
        <span className="badge">{TYPE_LABELS[tipo]}</span>
      </div>

      <label className="field">
        Consigna
        <textarea rows={2} value={consigna} onChange={(e) => setConsigna(e.target.value)} />
        {tipo === 'completar' && <span className="hint">Escribí ___ (tres guiones bajos) en cada hueco.</span>}
      </label>

      {isChoice && (
        <fieldset>
          <legend className="small" style={{ fontWeight: 700 }}>
            Opciones · marcá {tipo === 'multiple_choice' ? 'la correcta' : 'todas las correctas'}
          </legend>
          <div className="stack">
            {opciones.map((o, i) => (
              <div key={i} className="opt-row">
                <label className="opt-correct" title="Correcta">
                  <input
                    type={tipo === 'multiple_choice' ? 'radio' : 'checkbox'}
                    name={`${uid}-ok`}
                    checked={correctas.includes(i)}
                    onChange={() => toggleCorrect(i)}
                  />
                  <span className="visually-hidden">Opción {i + 1} correcta</span>
                </label>
                <input
                  type="text"
                  value={o}
                  aria-label={`Texto de la opción ${i + 1}`}
                  onChange={(e) => setOpciones(opciones.map((x, k) => (k === i ? e.target.value : x)))}
                />
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => removeOption(i)}
                  disabled={opciones.length <= 2}
                  aria-label={`Quitar la opción ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn small" style={{ marginTop: 10 }} onClick={() => setOpciones([...opciones, ''])}>
            + Agregar opción
          </button>
        </fieldset>
      )}

      {tipo === 'verdadero_falso' && (
        <fieldset>
          <legend className="small" style={{ fontWeight: 700 }}>Respuesta correcta</legend>
          <div className="row">
            {[true, false].map((v) => (
              <label key={String(v)} className="check">
                <input type="radio" name={`${uid}-vf`} checked={respuesta === v} onChange={() => setRespuesta(v)} />
                {v ? 'Verdadero' : 'Falso'}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {tipo === 'texto' && (
        <label className="field">
          Respuestas aceptadas
          <input type="text" value={respuestas[0] ?? ''} onChange={(e) => setRespuestas([e.target.value])} />
          <span className="hint">Separá las distintas formas válidas con "/". La IA también acepta respuestas parecidas.</span>
        </label>
      )}

      {tipo === 'completar' &&
        Array.from({ length: blanks }, (_, i) => (
          <label key={i} className="field">
            Hueco {i + 1}: palabras aceptadas
            <input
              type="text"
              value={respuestas[i] ?? ''}
              onChange={(e) => {
                const next = [...respuestas]
                next[i] = e.target.value
                setRespuestas(next)
              }}
            />
            {i === 0 && <span className="hint">Separá las variantes con "/", por ejemplo: París / Paris</span>}
          </label>
        ))}

      {tipo === 'unir' && (
        <fieldset>
          <legend className="small" style={{ fontWeight: 700 }}>Parejas (izquierda → derecha)</legend>
          <div className="stack">
            {pares.map(([l, r], i) => (
              <div key={i} className="opt-row">
                <input
                  type="text"
                  value={l}
                  aria-label={`Pareja ${i + 1}, izquierda`}
                  onChange={(e) => setPares(pares.map((p, k) => (k === i ? [e.target.value, p[1]] : p)))}
                />
                <span aria-hidden="true">→</span>
                <input
                  type="text"
                  value={r}
                  aria-label={`Pareja ${i + 1}, derecha`}
                  onChange={(e) => setPares(pares.map((p, k) => (k === i ? [p[0], e.target.value] : p)))}
                />
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => setPares(pares.filter((_, k) => k !== i))}
                  disabled={pares.length <= 2}
                  aria-label={`Quitar la pareja ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn small"
            style={{ marginTop: 10 }}
            onClick={() => setPares([...pares, ['', '']])}
            disabled={pares.length >= 10}
          >
            + Agregar pareja
          </button>
        </fieldset>
      )}

      {tipo === 'ordenar' && (
        <fieldset>
          <legend className="small" style={{ fontWeight: 700 }}>Pasos, en el orden correcto</legend>
          <div className="stack">
            {pasos.map((p, i) => (
              <div key={i} className="opt-row">
                <span className="q-num" aria-hidden="true">{i + 1}</span>
                <input
                  type="text"
                  value={p}
                  aria-label={`Paso ${i + 1}`}
                  onChange={(e) => setPasos(pasos.map((x, k) => (k === i ? e.target.value : x)))}
                />
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={i === 0}
                  aria-label={`Subir el paso ${i + 1}`}
                  onClick={() => {
                    const next = [...pasos]
                    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                    setPasos(next)
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => setPasos(pasos.filter((_, k) => k !== i))}
                  disabled={pasos.length <= 2}
                  aria-label={`Quitar el paso ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn small"
            style={{ marginTop: 10 }}
            onClick={() => setPasos([...pasos, ''])}
            disabled={pasos.length >= 12}
          >
            + Agregar paso
          </button>
        </fieldset>
      )}

      <label className="field">
        Explicación <span className="hint">(opcional, se muestra después de responder)</span>
        <textarea rows={2} value={explicacion} onChange={(e) => setExplicacion(e.target.value)} />
      </label>

      {error && (
        <div className="alert error" role="alert" style={{ marginBottom: 0 }}>
          <span className="icon" aria-hidden="true">✗</span>
          <div className="alert-body">{error}</div>
        </div>
      )}
      <div className="row">
        <button type="button" className="btn primary small" onClick={save}>Listo</button>
        <button type="button" className="btn small" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}
