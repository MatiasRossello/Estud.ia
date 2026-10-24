import { Component, type ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card">
        <h2>Algo salió mal</h2>
        <p className="muted">Tu progreso quedó guardado. Recargá la página para seguir donde estabas.</p>
        <pre>{this.state.error.message}</pre>
        <button className="btn primary" onClick={() => location.reload()}>Recargar</button>
      </div>
    )
  }
}
