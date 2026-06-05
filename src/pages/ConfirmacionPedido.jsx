import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, Copy, Ticket } from 'lucide-react'
import { money } from '../utils/format.js'

export default function ConfirmacionPedido() {
  const location = useLocation()
  const state = location.state || {}
  const [copiado, setCopiado] = useState(false)

  const numeroPedido = state.pedidoId?.slice(0, 8).toUpperCase() || '—'

  function copiarNumero() {
    navigator.clipboard?.writeText(numeroPedido).then(() => {
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2500)
    })
  }

  return (
    <section className="card grid" style={{ justifyItems: 'center', textAlign: 'center', gap: 16 }}>
      <CheckCircle2 size={54} color="var(--mall-main)" />
      <h1 className="page-title" style={{ margin: 0, fontSize: 26 }}>¡Pedido confirmado!</h1>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>Guarda tu número de pedido para consultar el estado de tu entrega.</p>

      {/* Número de pedido llamativo */}
      <div style={{
        background: 'linear-gradient(135deg, #f0faf6, #dff7ed)',
        border: '2px solid var(--mall-main)',
        borderRadius: 16,
        padding: '24px 20px',
        width: '100%',
        maxWidth: 340,
      }}>
        <div style={{ fontSize: 11, color: 'var(--mall-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
          Número de pedido
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 42,
          fontWeight: 900,
          letterSpacing: 6,
          color: 'var(--mall-dark)',
          lineHeight: 1,
          marginBottom: 16,
        }}>
          {numeroPedido}
        </div>
        <button
          type="button"
          onClick={copiarNumero}
          style={{
            background: copiado ? 'var(--mall-main)' : 'white',
            color: copiado ? 'white' : 'var(--mall-main)',
            border: '2px solid var(--mall-main)',
            borderRadius: 10,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '0 auto',
            transition: 'all 0.2s',
          }}
        >
          {copiado ? '✓ ¡Copiado!' : <><Copy size={16} /> Copiar número</>}
        </button>
      </div>

      {/* Detalles del pedido */}
      <div style={{ display: 'grid', gap: 8, width: '100%', textAlign: 'left', fontSize: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="muted">Total pagado</span>
          <strong className="price">{money(state.total)}</strong>
        </div>
        {state.descuentoCupones > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">Descuento cupones{state.numCupones > 1 ? ` (${state.numCupones})` : ''}</span>
            <strong style={{ color: 'var(--mall-main)' }}>−{money(state.descuentoCupones)}</strong>
          </div>
        ) : null}
        {/* Backwards compat con el campo viejo */}
        {!state.descuentoCupones && state.cuponAplicado > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">Cupón aplicado</span>
            <strong style={{ color: 'var(--mall-main)' }}>−{money(state.cuponAplicado)}</strong>
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
          <strong style={{ display: 'block', marginBottom: 6 }}>¡Ganaste cupones de descuento!</strong>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Tu cupón de descuento se generará al confirmar tu pedido y <strong>te lo entregaremos físicamente junto con tu compra</strong>. Guárdalo para usarlo en tu próximo pedido.
          </p>
        </div>
      ) : null}

      <div style={{ width: '100%', display: 'grid', gap: 8 }}>
        <Link
          to="/mi-pedido"
          className="btn-outline"
          style={{ justifyContent: 'center', textDecoration: 'none' }}
          state={{ numeroInicial: numeroPedido }}
        >
          Ver estado del pedido
        </Link>
        <Link className="btn-primary" to="/" style={{ justifyContent: 'center', textDecoration: 'none' }}>
          Volver al catálogo
        </Link>
      </div>
    </section>
  )
}
