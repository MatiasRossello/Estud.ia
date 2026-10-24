import { Link, NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import MyTests from './pages/MyTests'
import Explore from './pages/Explore'
import TestPage from './pages/TestPage'
import HowTo from './pages/HowTo'
import ErrorBoundary from './components/ErrorBoundary'

const links = [
  { to: '/', label: 'Subir JSON', end: true },
  { to: '/mis-tests', label: 'Mis tests' },
  { to: '/explorar', label: 'Tests públicos' },
  { to: '/como-crear', label: 'Cómo crear tu JSON' },
]

export default function App() {
  return (
    <>
      <nav className="nav" aria-label="Principal">
        <div className="nav-inner">
          <Link to="/" className="brand">
            estud<span>.ia</span>
          </Link>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `link${isActive ? ' active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main>
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mis-tests" element={<MyTests />} />
          <Route path="/explorar" element={<Explore />} />
          <Route path="/como-crear" element={<HowTo />} />
          <Route path="/test/:id" element={<TestPage />} />
          <Route path="*" element={<p>Página no encontrada. <Link to="/">Volver al inicio</Link></p>} />
        </Routes>
        </ErrorBoundary>
      </main>
    </>
  )
}
