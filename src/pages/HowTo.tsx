import { Link } from 'react-router-dom'
import { AI_PROMPT, EXAMPLE_JSON } from '../lib/example'
import { useTitle } from '../lib/useTitle'
import { copyText } from '../components/Toast'
import { TYPE_LABELS } from '../lib/types'

export default function HowTo() {
  useTitle('Cómo crear tu JSON')
  const example = JSON.stringify(EXAMPLE_JSON, null, 2)

  function download() {
    const url = URL.createObjectURL(new Blob([example], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'ejemplo-estudia.json' })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="page-head">
        <h1>Cómo crear tu JSON</h1>
        <p>
          No hace falta escribirlo a mano. Tu IA lo arma por vos a partir de tus apuntes: seguí estos tres pasos.
        </p>
      </div>

      <ol className="steps" style={{ gridTemplateColumns: '1fr' }}>
        <li>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>Copiá el prompt y pegalo en tu IA</strong>
            <span>Sirve ChatGPT, Claude, Gemini o cualquier otra.</span>
            <div className="card" style={{ marginTop: 12 }}>
              <div className="row" style={{ marginBottom: 12 }}>
                <button className="btn primary" onClick={() => copyText(AI_PROMPT, 'Prompt copiado')}>
                  Copiar el prompt
                </button>
              </div>
              <details className="disclosure">
                <summary>Ver el prompt completo</summary>
                <pre style={{ marginTop: 8 }}>{AI_PROMPT}</pre>
              </details>
            </div>
          </div>
        </li>
        <li>
          <div>
            <strong>Agregá tus apuntes al final</strong>
            <span>
              Cambiá <code>[CANTIDAD]</code> por cuántas preguntas querés y reemplazá <code>[PEGÁ ACÁ TUS APUNTES…]</code>{' '}
              por tu material. Si es mucho, pedile varias tandas.
            </span>
          </div>
        </li>
        <li>
          <div>
            <strong>Guardá la respuesta y subila</strong>
            <span>
              Copiá lo que te devuelve en un archivo <code>.json</code>, o pegalo directo en{' '}
              <Link to="/subir">Subir preguntas</Link>. Si algo está mal, te decimos en qué pregunta.
            </span>
          </div>
        </li>
      </ol>

      <section className="card section" aria-labelledby="types-title">
        <h2 id="types-title">Tipos de pregunta</h2>
        <ul className="stack" style={{ paddingLeft: 20 }}>
          <li><strong>{TYPE_LABELS.multiple_choice}</strong>: varias opciones, una sola correcta.</li>
          <li><strong>{TYPE_LABELS.seleccion_multiple}</strong>: hay que marcar todas las correctas.</li>
          <li><strong>{TYPE_LABELS.verdadero_falso}</strong>: una afirmación para decir si es cierta.</li>
          <li><strong>{TYPE_LABELS.completar}</strong>: una frase con huecos <code>___</code> para escribir la palabra.</li>
          <li><strong>{TYPE_LABELS.texto}</strong>: escribís la respuesta con tus palabras y una IA la corrige.</li>
        </ul>
      </section>

      <section className="card" aria-labelledby="example-title">
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2 id="example-title" style={{ margin: 0 }}>Ejemplo con los cinco tipos</h2>
          <div className="row">
            <button className="btn small" onClick={() => copyText(example, 'Ejemplo copiado')}>Copiar</button>
            <button className="btn small" onClick={download}>Descargar</button>
          </div>
        </div>
        <pre>{example}</pre>
      </section>
    </>
  )
}
