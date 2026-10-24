import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/storage'
import { isSessionDone } from '../lib/quiz'
import { useTitle } from '../lib/useTitle'

const icon = {
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  mine: <path d="M4 5a1 1 0 0 1 1-1h5l2 2h7a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />,
  explore: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" />,
  create: <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />,
  resume: <path d="M8 5v14l11-7z" />,
}

function Icon({ name }: { name: keyof typeof icon }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icon[name]}
    </svg>
  )
}

export default function Menu() {
  useTitle(undefined)
  const { sessions } = useStore()

  // El último test que hiciste, para retomarlo con un clic.
  const last = useMemo(() => [...sessions].sort((a, b) => b.createdAt - a.createdAt)[0], [sessions])

  const options = [
    { to: '/subir', icon: 'upload', title: 'Subir mis preguntas', text: 'Cargá un archivo JSON y empezá a estudiar.', main: !last },
    { to: '/mis-tests', icon: 'mine', title: 'Mis tests', text: 'Los tests que subiste: estudialos, compartilos o borralos.' },
    { to: '/explorar', icon: 'explore', title: 'Tests públicos', text: 'Practicá con tests que compartieron otras personas.' },
    { to: '/como-crear', icon: 'create', title: 'Crear el JSON con IA', text: 'Copiá un prompt y tu IA arma las preguntas por vos.' },
  ] as const

  return (
    <>
      <section className="menu-hero">
        <h1>¿Qué querés hacer?</h1>
        <p>Estudiá con tus propias preguntas: tests al azar, repaso de errores y ranking.</p>
      </section>

      {last && (
        <Link to={`/test/${last.testId}`} className="menu-option resume">
          <span className="menu-icon"><Icon name="resume" /></span>
          <span className="menu-text">
            <strong>{isSessionDone(last) ? 'Volver a estudiar' : 'Seguir donde lo dejé'}</strong>
            <span>{last.testTitle}</span>
          </span>
          <span className="menu-go" aria-hidden="true">›</span>
        </Link>
      )}

      <nav aria-label="Opciones" className="menu-grid">
        {options.map((o) => (
          <Link key={o.to} to={o.to} className={`menu-option${'main' in o && o.main ? ' main' : ''}`}>
            <span className="menu-icon"><Icon name={o.icon} /></span>
            <span className="menu-text">
              <strong>{o.title}</strong>
              <span>{o.text}</span>
            </span>
            <span className="menu-go" aria-hidden="true">›</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
