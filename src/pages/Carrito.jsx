import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Ticket, Trash2 } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'
import { supabase } from '../supabase.js'
import { money } from '../utils/format.js'

export default function Carrito() {
  const navigate = useNavigate()
  const { items, cambiarCantidad, quitarItem, totalMonto, totalItems } = useCart()
  const [threshold, setThreshold] = useState(150)
  const [couponValue, setCouponValue] = useState(10)

  useEffect(() => {
    supabase
      .from('configuracion')
      .select('clave, valor')
      .in('clave', ['monto_cupon_domicilio', 'valor_cupon_domicilio'])
      .then(({ data }) => {
        const config = Object.fromEntries((data || []).map((i) => [i.clave, i.valor]))
        if (config.monto_cupon_domicilio) setThreshold(Number(config.monto_cupon_domicilio))
        if (config.valor_cupon_domicilio) setCouponValue(Number(config.valor_cupon_domicilio))
      })
  }, [])

  const progress = Math.min((totalMonto / threshold) * 100, 100)
  const remaining = Math.max(threshold - totalMonto, 0)
  const qualifies = totalMonto >= threshold

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h1 className="page-title">Carrito</h1>
      <p className="page-subtitle" style={{ marginBottom: 0 }}>{totalItems} producto{totalItems !== 1 ? 's' : ''} en tu carrito</p>

      {items.length === 0 ? (
        <div className="card grid">
          <strong>Tu carrito está vacío.</strong>
          <Link className="btn-primary" to="/">Ir al catálogo</Link>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '12px 14px' }}>
            {qualifies ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mall-dark)' }}>
                <Ticket size={16} style={{ color: 'var(--mall-accent)' }} />
                <strong style={{ fontSize: 13 }}>¡Ganaste un cupón de {money(couponValue)}! Lo podrás usar en este pedido o guardar para después.</strong>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ticket size={15} style={{ color: 'var(--mall-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--mall-muted)' }}>
                  Te faltan <strong style={{ color: 'var(--mall-text)' }}>{money(remaining)}</strong> para ganar un cupón de {money(couponValue)}
                </span>
              </div>
            )}
            <div style={{ marginTop: 8, height: 6, background: '#edf4f1', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: qualifies ? 'var(--mall-accent)' : 'var(--mall-main)',
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }} />
            </div>
            {!qualifies ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--mall-muted)', marginTop: 4 }}>
                <span>{money(totalMonto)}</span>
                <span>{money(threshold)}</span>
              </div>
            ) : null}
          </div>

          <section className="card">
            {items.map((item) => (
              <div className="cart-line" key={item.producto_id}>
                <div>
                  <strong>{item.nombre}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{money(item.precio)} c/u</div>
                  <div className="price" style={{ fontSize: 16 }}>{money(Number(item.precio) * item.cantidad)}</div>
                </div>
                <div className="grid" style={{ justifyItems: 'end', gap: 6 }}>
                  <div className="stepper">
                    <button type="button" onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}><Minus size={15} /></button>
                    <strong style={{ minWidth: 20, textAlign: 'center' }}>{item.cantidad}</strong>
                    <button type="button" onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}><Plus size={15} /></button>
                  </div>
                  <button className="btn-danger" type="button" style={{ padding: '6px 10px', minHeight: 34, fontSize: 12 }} onClick={() => quitarItem(item.producto_id)}>
                    <Trash2 size={13} /> Quitar
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="card grid">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 17 }}>
              <span>Total</span>
              <span className="price">{money(totalMonto)}</span>
            </div>
            <button className="btn-accent" type="button" onClick={() => navigate('/pedido')}>
              Continuar pedido
            </button>
          </section>
        </>
      )}
    </div>
  )
}
