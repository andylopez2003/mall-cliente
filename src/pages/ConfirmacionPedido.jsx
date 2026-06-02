import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { money } from '../utils/format.js'

export default function ConfirmacionPedido() {
  const location = useLocation()
  const state = location.state || {}

  return (
    <section className="card grid" style={{ justifyItems: 'center', textAlign: 'center' }}>
      <CheckCircle2 size={58} color="var(--mall-main)" />
      <h1 className="page-title" style={{ margin: 0 }}>Pedido confirmado</h1>
      <p className="muted">Tu numero de pedido es</p>
      <strong style={{ fontSize: 26, letterSpacing: 1 }}>{state.pedidoId || 'MALL-' + Date.now()}</strong>
      <div className="muted">Total: {money(state.total)}</div>
      <div className="muted">Horario: {state.horario || 'Pendiente'}</div>
      {state.cupon ? <div className="card" style={{ background: '#fff5d9' }}>Tu pedido quedo marcado para generar cupon cuando el admin lo entregue en tienda.</div> : null}
      <Link className="btn-primary" to="/">Volver al catalogo</Link>
    </section>
  )
}
