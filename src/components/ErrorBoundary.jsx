import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>😕</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>Algo salió mal</h2>
          <p style={{ color: '#4A6B60', margin: '0 0 20px', fontSize: 15 }}>
            Por favor regresa al inicio e intenta de nuevo.
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
            style={{ background: '#1D9E75', color: 'white', border: 0, borderRadius: 10, padding: '13px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}
          >
            Volver al inicio
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
