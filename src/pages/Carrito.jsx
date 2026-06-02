import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'
import { money } from '../utils/format.js'

export default function Carrito() {
  const navigate = useNavigate()
  const { items, cambiarCantidad, quitarItem, totalMonto, totalItems } = useCart()

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h1 className="page-title">Carrito</h1>
      <p className="page-subtitle">{totalItems} productos en tu carrito</p>
      {items.length === 0 ? (
        <div className="card grid">
          <strong>Tu carrito esta vacio.</strong>
          <Link className="btn-primary" to="/">Ir al catalogo</Link>
        </div>
      ) : (
        <>
          <section className="card">
            {items.map((item) => (
              <div className="cart-line" key={item.producto_id}>
                <div>
                  <strong>{item.nombre}</strong>
                  <div className="muted">{money(item.precio)} c/u</div>
                  <div className="price">{money(Number(item.precio) * item.cantidad)}</div>
                </div>
                <div className="grid" style={{ justifyItems: 'end' }}>
                  <div className="stepper">
                    <button type="button" onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}><Minus size={16} /></button>
                    <strong>{item.cantidad}</strong>
                    <button type="button" onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}><Plus size={16} /></button>
                  </div>
                  <button className="btn-danger" type="button" onClick={() => quitarItem(item.producto_id)}>
                    <Trash2 size={16} /> Quitar
                  </button>
                </div>
              </div>
            ))}
          </section>
          <section className="card grid">
            <div className="toolbar" style={{ justifyContent: 'space-between', margin: 0 }}>
              <strong>Total</strong>
              <strong className="price">{money(totalMonto)}</strong>
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
