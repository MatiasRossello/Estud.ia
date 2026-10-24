import { useEffect, useRef } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Menu from './pages/Menu'
import Upload from './pages/Upload'
import MyTests from './pages/MyTests'
import Explore from './pages/Explore'
import TestPage from './pages/TestPage'
import HowTo from './pages/HowTo'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastHost } from './components/Toast'

const links = [
  { to: '/subir', label: 'Subir' },
  { to: '/mis-tests', label: 'Mis tests' },
  { to: '/explorar', label: 'Públicos' },
  { to: '/como-crear', label: 'Crear JSON' },
]

export default function App() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)
  const isMenu = location.pathname === '/'

  // Al cambiar de pantalla, el foco va al contenido nuevo.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
    scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className="nav">
        <div className="nav-inner">
          <Link to="/" viewTransition className="brand" aria-label="estud.ia, volver al menú">
            estud<span>.ia</span>
          </Link>
          {!isMenu && (
            <nav aria-label="Principal">
              <ul className="nav-links">
                <li>
                  <Link to="/" viewTransition className="link menu-link">
                    <span aria-hidden="true">‹ </span>Menú
                  </Link>
                </li>
                {links.map((l) => (
                  <li key={l.to}>
                    <NavLink to={l.to} viewTransition className="link">
                      {l.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </header>
      <main id="contenido" ref={mainRef} tabIndex={-1} className={isMenu ? 'is-menu' : undefined}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Menu />} />
            <Route path="/subir" element={<Upload />} />
            <Route path="/mis-tests" element={<MyTests />} />
            <Route path="/explorar" element={<Explore />} />
            <Route path="/como-crear" element={<HowTo />} />
            <Route path="/test/:id" element={<TestPage />} />
            <Route
              path="*"
              element={
                <div className="card empty">
                  <h1>Esta página no existe</h1>
                  <Link to="/" className="btn primary">Volver al menú</Link>
                </div>
              }
            />
          </Routes>
        </ErrorBoundary>
      </main>
      <ToastHost />
    </>
  )
}
