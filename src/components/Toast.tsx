import { useEffect, useState } from 'react'

let show: ((msg: string) => void) | null = null

/** Muestra un aviso breve que también se anuncia al lector de pantalla. */
export function toast(msg: string) {
  show?.(msg)
}

export function ToastHost() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    show = (m) => {
      setMsg(m)
      clearTimeout(t)
      t = setTimeout(() => setMsg(''), 2600)
    }
    return () => {
      show = null
      clearTimeout(t)
    }
  }, [])
  return (
    <div role="status" aria-live="polite">
      {msg && <div className="toast">{msg}</div>}
    </div>
  )
}

export async function copyText(text: string, okMsg = 'Copiado') {
  try {
    await navigator.clipboard.writeText(text)
    toast(okMsg)
  } catch {
    toast('No se pudo copiar. Seleccioná el texto y copialo a mano.')
  }
}
