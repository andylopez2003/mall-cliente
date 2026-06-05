import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, Ticket } from 'lucide-react'
import { money } from '../utils/format.js'

export default function ConfirmacionPedido() {
  const location = useLocation()
  const state = location.state || {}

  return (
    <section className="card grid" style={{ justifyItems: 'center', textAlign: 'center', gap: 16 }}>
      <CheckCircle2 size={58} color="var(--mall-main)" />
      <h1 className="page-title" style={{ margin: 0 }}>¡Pedido confirmado!</h1>
      <p className="muted" style={{ margin: 0 }}>Tu número de pedido es</p>
      <strong style={{ fontSize: 24, letterSpacing: 1 }}>
        {state.pedidoId?.slice(0, 8).toUpperCase() || 'MALL-' + Date.now()}
      </strong>

      <div style={{ display: 'grid', gap: 8, width: '100%', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span className="muted">Total pagado</span>
          <strong className="price">{money(state.total)}</strong>
        </div>
        {state.cuponAplicado > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span className="muted">Cupón aplicado</span>
            <strong style={{ color: 'var(--mall-main)' }}>−{money(state.cuponAplicado)}</strong>
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span className="muted">Horario de entrega</span>
          <strong>{state.horario || 'Pendiente'}</strong>
        </div>
      </div>

      {state.generaCupon ? (
        <div style={{
          width: '100%',
          background: 'linear-gradient(135deg, #fff8e7, #ffedb8)',
          border: '2px solid var(--mall-accent)',
          borderRadius: 12, padding: 16, textAlign: 'center',
        }}>
          <Ticket size={22} style={{ color: 'var(--mall-accent)', marginBottom: 8 }} />
          <strong style={{ display: 'block', marginBottom: 6 }}>¡Ganaste un cupón de descuento!</strong>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Tu cupón de descuento se generará al confirmar tu pedido y <strong>te lo entregaremos físicamente junto con tu compra</strong>. Guárdalo para usarlo en tu próximo pedido.
          </p>
        </div>
      ) : null}

      <Link className="btn-primary" to="/" style={{ width: '100%', justifyContent: 'center' }}>
        Volver al catálogo
      </Link>
    </section>
  )
}
