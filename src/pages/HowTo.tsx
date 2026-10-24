import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AI_PROMPT, EXAMPLE_JSON } from '../lib/example'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="btn primary"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1800)
      }}
    >
      {done ? '¡Copiado!' : label}
    </button>
  )
}

export default function HowTo() {
  const example = JSON.stringify(EXAMPLE_JSON, null, 2)

  function download() {
    const url = URL.createObjectURL(new Blob([example], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'ejemplo-estudia.json' })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <h1>Cómo crear tu JSON</h1>
      <p className="muted">
        No hace falta escribirlo a mano: copiá este prompt, pegalo en ChatGPT, Claude, Gemini o la IA que uses, agregá
        tus apuntes al final y te devuelve el JSON listo para <Link to="/">subir</Link>.
      </p>

      <div className="card">
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>1. Copiá el prompt</h2>
          <CopyButton text={AI_PROMPT} label="Copiar prompt" />
        </div>
        <pre>{AI_PROMPT}</pre>
      </div>

      <div className="card">
        <h2>2. Completalo</h2>
        <p>
          Reemplazá <code>[CANTIDAD]</code> por cuántas preguntas querés y <code>[PEGÁ ACÁ TUS APUNTES…]</code> por tu
          material. Funciona mejor con textos de hasta unas pocas páginas; si tenés más, pedile varias tandas y juntá
          las preguntas en un solo archivo.
        </p>
        <h2>3. Guardalo y subilo</h2>
        <p style={{ margin: 0 }}>
          Copiá la respuesta en un archivo <code>.json</code> (o pegala directo en la página de inicio). Si algo está mal,
          la página te dice qué pregunta tiene el error.
        </p>
      </div>

      <div className="card">
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Ejemplo con los 5 tipos</h2>
          <div className="row">
            <CopyButton text={example} label="Copiar" />
            <button className="btn" onClick={download}>Descargar</button>
          </div>
        </div>
        <pre>{example}</pre>
      </div>
    </>
  )
}
