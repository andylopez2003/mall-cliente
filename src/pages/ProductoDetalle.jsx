import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'
import { useCatalogo } from '../hooks/useCatalogo.jsx'
import { money } from '../utils/format.js'

export default function ProductoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { agregarItem } = useCart()
  const { productos, ofertaMap } = useCatalogo()
  const [cartToast, setCartToast] = useState(false)

  const producto = useMemo(() => productos.find((item) => item.id === id), [productos, id])
  const oferta = ofertaMap[id]

  if (!producto) return <div className="card">Cargando producto...</div>

  function agregar() {
    agregarItem({
      producto_id: producto.id,
      nombre: producto.nombre,
      imagen_url: producto.imagen_url,
      precio: oferta ? Number(oferta.precio_oferta) : Number(producto.precio),
    })
    window.clearTimeout(window.__mallToastTimer)
    setCartToast(true)
    window.__mallToastTimer = window.setTimeout(() => setCartToast(false), 4000)
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <button className="btn-outline" type="button" onClick={() => navigate(-1)} style={{ width: 'fit-content' }}>
        <ArrowLeft size={16} /> Volver
      </button>

      <section className="card grid">
        {producto.imagen_url
          ? <img src={producto.imagen_url} alt={producto.nombre} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 8 }} />
          : null}
        <h1 className="page-title" style={{ margin: 0 }}>{producto.nombre}</h1>
        <span className="muted">{producto.categoria}</span>
        {oferta ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="price">{money(oferta.precio_oferta)}</span>
            <span className="muted" style={{ textDecoration: 'line-through', fontSize: 14 }}>{money(producto.precio)}</span>
            <span className="badge-yellow">−{oferta.porcentaje_descuento || 0}%</span>
          </div>
        ) : (
          <div className="price">{money(producto.precio)}</div>
        )}
        {producto.descripcion ? <p className="muted" style={{ margin: 0 }}>{producto.descripcion}</p> : null}
        <button className="btn-primary" type="button" onClick={agregar}>
          <Plus size={16} /> Agregar al carrito
        </button>
      </section>

      {cartToast ? (
        <div className="cart-toast">
          <div className="cart-toast-inner">
            <div className="cart-toast-msg">
              <CheckCircle2 size={17} color="var(--mall-main)" />
              <span>{producto.nombre} agregado al carrito</span>
            </div>
            <div className="cart-toast-actions">
              <button className="cart-toast-secondary" type="button" onClick={() => { setCartToast(false); navigate('/') }}>
                Seguir comprando
              </button>
              <button className="cart-toast-primary" type="button" onClick={() => { setCartToast(false); navigate('/carrito') }}>
                Ir al carrito →
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
