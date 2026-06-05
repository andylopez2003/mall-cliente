import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, MessageCircle, Package, Phone, Plus, Search, Ticket } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'
import { useCatalogo } from '../hooks/useCatalogo.jsx'
import { supabase } from '../supabase.js'
import { money } from '../utils/format.js'

const ESTADO_LABEL = {
  pendiente:  { label: 'Pendiente',  color: '#87510b', bg: '#fff1d7' },
  confirmado: { label: 'Confirmado', color: '#0f6e56', bg: '#dff7ed' },
  preparando: { label: 'Preparando', color: '#1a5fa8', bg: '#dbeafe' },
  en_camino:  { label: 'En camino',  color: '#5b21b6', bg: '#ede9fe' },
  entregado:  { label: 'Entregado',  color: '#166534', bg: '#dcfce7' },
  cancelado:  { label: 'Cancelado',  color: '#6b7280', bg: '#f3f4f6' },
}

export default function Catalogo() {
  const navigate = useNavigate()
  const { agregarItem, totalItems } = useCart()
  const { loading, error, productos, ofertas, promociones, ofertaMap, categorias } = useCatalogo()
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [cartToast, setCartToast] = useState(null)
  const [misPedidos, setMisPedidos] = useState([])

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('mall_mis_pedidos') || '[]')
    if (stored.length === 0) return
    const hoy = new Date().toISOString().slice(0, 10)
    const activos = stored.filter((p) => (p.fecha || hoy) >= hoy)
    if (activos.length === 0) return
    supabase.from('pedidos').select('id, estado').in('id', activos.map((p) => p.id)).then(({ data }) => {
      if (!data) return
      const statusMap = Object.fromEntries(data.map((p) => [p.id, p.estado]))
      const conEstado = activos
        .filter((p) => statusMap[p.id] && !['entregado', 'cancelado'].includes(statusMap[p.id]))
        .map((p) => ({ ...p, estado: statusMap[p.id] }))
        .sort((a, b) => (a.fecha || hoy).localeCompare(b.fecha || hoy) || (a.horario || '').localeCompare(b.horario || ''))
      setMisPedidos(conEstado)
    })
  }, [])

  const filteredProducts = useMemo(() => {
    return productos.filter((producto) => {
      const matchesQuery = producto.nombre.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = categoria === 'Todos' || producto.categoria === categoria
      return matchesQuery && matchesCategory
    })
  }, [productos, query, categoria])

  function quickAdd(producto) {
    const oferta = ofertaMap[producto.id]
    agregarItem({
      producto_id: producto.id,
      nombre: producto.nombre,
      imagen_url: producto.imagen_url,
      precio: oferta ? Number(oferta.precio_oferta) : Number(producto.precio),
    })
    window.clearTimeout(window.__mallToastTimer)
    setCartToast({ nombre: producto.nombre })
    window.__mallToastTimer = window.setTimeout(() => setCartToast(null), 4000)
  }

  function irAlCarrito() {
    setCartToast(null)
    navigate('/carrito')
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="hero-band">
        <div>
          <h1 className="page-title">MALL</h1>
          <p className="page-subtitle">Tu tienda de barrio, ahora en la palma de tu mano.</p>
        </div>
        <div className="grid" style={{ justifyItems: 'start' }}>
          {totalItems > 0 ? (
            <Link className="btn-accent" to="/carrito">Ver carrito ({totalItems})</Link>
          ) : (
            <span className="badge-green">Bienvenido</span>
          )}
        </div>
      </section>

      {/* Mis pedidos activos en este dispositivo */}
      {misPedidos.length > 0 ? (
        <section className="card" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={17} style={{ color: 'var(--mall-main)' }} />
            <strong style={{ fontSize: 14 }}>Tus pedidos activos</strong>
          </div>
          {misPedidos.map((p) => {
            const hoy = new Date().toISOString().slice(0, 10)
            const esMismoDia = (p.fecha || hoy) === hoy
            const fechaLabel = esMismoDia ? 'Hoy' : new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' })
            const estadoInfo = ESTADO_LABEL[p.estado] || ESTADO_LABEL.pendiente
            return (
              <div key={p.id} role="button"
                onClick={() => navigate('/mi-pedido', { state: { numeroInicial: p.numero } })}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--mall-line)' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 15, letterSpacing: 2 }}>{p.numero}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{fechaLabel} · {p.horario} · {money(p.total)}</div>
                </div>
                <span style={{ background: estadoInfo.bg, color: estadoInfo.color, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {estadoInfo.label}
                </span>
              </div>
            )
          })}
        </section>
      ) : null}

      {/* Contacto con la tienda */}
      <section className="card" style={{ background: 'linear-gradient(135deg, #f0faf6, #e1f5ee)', border: '1.5px solid var(--mall-line)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--mall-dark)' }}>
          ¿Necesitas ayuda? Escríbenos o llámanos
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href="https://wa.me/50233921737"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', fontSize: 13 }}
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
          <a
            href="tel:33921737"
            className="btn-outline"
            style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', fontSize: 13 }}
          >
            <Phone size={15} /> Llamar
          </a>
        </div>
      </section>


      <section className="card" style={{ background: 'linear-gradient(135deg, #ffefb7, #f7c85a)' }}>
        <strong style={{ display: 'block', marginBottom: 4 }}>
          <Ticket size={16} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
          Gana Q10 de regalo
        </strong>
        <span style={{ fontSize: 13 }}>En pedidos de Q150 o más recibirás un cupón de descuento que te entregaremos junto con tu pedido.</span>
      </section>

      {ofertas.length > 0 ? (
        <section className="grid" style={{ gap: 10 }}>
          <h2 className="font-display" style={{ margin: 0, fontSize: 18 }}>Ofertas activas</h2>
          <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(160px, 1fr)', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {ofertas.map((oferta) => (
              <article key={oferta.id} className="product-card" style={{ minWidth: 160 }}>
                {oferta.productos?.imagen_url
                  ? <img src={oferta.productos.imagen_url} alt={oferta.productos.nombre} />
                  : <div className="product-placeholder">MALL</div>}
                <div className="product-body">
                  <strong style={{ fontSize: 13 }}>{oferta.productos?.nombre}</strong>
                  <div className="muted" style={{ textDecoration: 'line-through', fontSize: 12 }}>{money(oferta.productos?.precio)}</div>
                  <div className="price" style={{ fontSize: 16 }}>{money(oferta.precio_oferta)}</div>
                  <span className="badge-yellow">−{oferta.porcentaje_descuento || 0}%</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {promociones.length > 0 ? (
        <section className="grid" style={{ gap: 8 }}>
          <h2 className="font-display" style={{ margin: 0, fontSize: 18 }}>Promociones</h2>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {promociones.map((promo) => <span key={promo.id} className="badge-green" style={{ whiteSpace: 'nowrap' }}>{promo.nombre}</span>)}
          </div>
        </section>
      ) : null}

      <section className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12 }}>
        <Search size={17} style={{ color: 'var(--mall-muted)', flexShrink: 0 }} />
        <input
          className="input-field"
          style={{ border: 0, boxShadow: 'none', padding: 0, minHeight: 'auto', fontSize: 15 }}
          placeholder="Buscar producto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <section style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
        {categorias.map((item) => (
          <button
            key={item}
            className={categoria === item ? 'btn-primary' : 'btn-outline'}
            type="button"
            onClick={() => setCategoria(item)}
            style={{ whiteSpace: 'nowrap', padding: '7px 12px', minHeight: 36, fontSize: 13 }}
          >
            {item}
          </button>
        ))}
      </section>

      {loading ? <div className="card muted">Cargando catálogo...</div> : null}
      {error ? <div className="error">{error}</div> : null}

      <section className="product-grid">
        {filteredProducts.map((producto) => {
          const oferta = ofertaMap[producto.id]
          return (
            <article
              key={producto.id}
              className="product-card"
              onClick={() => navigate(`/producto/${producto.id}`)}
              style={{ cursor: 'pointer' }}
            >
              {producto.imagen_url
                ? <img src={producto.imagen_url} alt={producto.nombre} />
                : <div className="product-placeholder">MALL</div>}
              <div className="product-body">
                <strong style={{ fontSize: 13 }}>{producto.nombre}</strong>
                <span className="muted" style={{ fontSize: 11 }}>{producto.categoria}</span>
                <div>
                  <span className="price" style={{ fontSize: 15 }}>{money(oferta ? oferta.precio_oferta : producto.precio)}</span>
                  {oferta ? <span className="badge-yellow" style={{ marginLeft: 6, fontSize: 10 }}>Oferta</span> : null}
                </div>
                <button
                  className="btn-accent"
                  type="button"
                  style={{ padding: '8px 10px', minHeight: 38, fontSize: 13 }}
                  onClick={(e) => { e.stopPropagation(); quickAdd(producto) }}
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>
            </article>
          )
        })}
      </section>

      {cartToast ? (
        <div className="cart-toast">
          <div className="cart-toast-inner">
            <div className="cart-toast-msg">
              <CheckCircle2 size={17} color="var(--mall-main)" />
              <span>{cartToast.nombre} agregado al carrito</span>
            </div>
            <div className="cart-toast-actions">
              <button className="cart-toast-secondary" type="button" onClick={() => setCartToast(null)}>
                Seguir comprando
              </button>
              <button className="cart-toast-primary" type="button" onClick={irAlCarrito}>
                Ir al carrito →
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
