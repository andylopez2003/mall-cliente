import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, Copy, Ticket } from 'lucide-react'
import { useState } from 'react'
import { money } from '../utils/format.js'

export default function ConfirmacionPedido() {
  const location = useLocation()
  const state = location.state || {}
  const [copiado, setCopiado] = useState(false)

  function copiarCodigo() {
    navigator.clipboard?.writeText(state.codigoCupon).then(() => {
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    })
  }

  return (
    <section className="card grid" style={{ justifyItems: 'center', textAlign: 'center', gap: 16 }}>
      <CheckCircle2 size={58} color="var(--mall-main)" />
      <h1 className="page-title" style={{ margin: 0 }}>¡Pedido confirmado!</h1>
      <p className="muted" style={{ margin: 0 }}>Tu número de pedido es</p>
      <strong style={{ fontSize: 24, letterSpacing: 1 }}>{state.pedidoId?.slice(0, 8).toUpperCase() || 'MALL-' + Date.now()}</strong>

      <div style={{ display: 'grid', gap: 6, width: '100%', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span className="muted">Total pagado</span>
          <strong className="price">{money(state.total)}</strong>
        </div>
        {state.cuponAplicado > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span className="muted">Descuento cupón aplicado</span>
            <strong style={{ color: 'var(--mall-main)' }}>−{money(state.cuponAplicado)}</strong>
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span className="muted">Horario de entrega</span>
          <strong>{state.horario || 'Pendiente'}</strong>
        </div>
      </div>

      {state.codigoCupon ? (
        <div style={{ width: '100%', background: 'linear-gradient(135deg, #fff8e7, #ffedb8)', border: '2px solid var(--mall-accent)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
            <Ticket size={18} style={{ color: 'var(--mall-accent)' }} />
            <strong>Tu cupón de descuento</strong>
          </div>
          <code style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, color: 'var(--mall-dark)', display: 'block', marginBottom: 8 }}>
            {state.codigoCupon}
          </code>
          <p className="muted" style={{ margin: '0 0 10px', fontSize: 13 }}>
            Guarda este código. Puedes consultarlo en "Mis Cupones" con tu teléfono.
          </p>
          <button className="btn-outline" type="button" onClick={copiarCodigo} style={{ fontSize: 13, minHeight: 38 }}>
            <Copy size={13} /> {copiado ? '¡Copiado!' : 'Copiar código'}
          </button>
        </div>
      ) : null}

      {state.cuponAplicado > 0 ? (
        <div style={{ width: '100%', background: '#dff7ed', border: '1px solid var(--mall-main)', borderRadius: 10, padding: 12, fontSize: 13, textAlign: 'center' }}>
          <CheckCircle2 size={15} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} color="var(--mall-main)" />
          Se aplicó un descuento de <strong>{money(state.cuponAplicado)}</strong> a este pedido.
        </div>
      ) : null}

      <Link className="btn-primary" to="/" style={{ width: '100%', justifyContent: 'center' }}>
        Volver al catálogo
      </Link>
    </section>
  )
}
