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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui', gap: 12 }}>
          <div style={{ fontSize: 52 }}>😕</div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Ups, algo salió mal</h2>
          <p style={{ color: '#4A6B60', margin: 0, fontSize: 15 }}>
            Ocurrió un error en esta pantalla. Tu carrito está guardado.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ background: 'white', color: '#1D9E75', border: '2px solid #1D9E75', borderRadius: 10, padding: '12px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/carrito' }}
              style={{ background: '#1D9E75', color: 'white', border: 0, borderRadius: 10, padding: '12px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}
            >
              Ir al carrito
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
