import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Sparkles, Ticket } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'
import { useCatalogo } from '../hooks/useCatalogo.jsx'
import { money } from '../utils/format.js'

export default function Catalogo() {
  const navigate = useNavigate()
  const { agregarItem, totalItems } = useCart()
  const { loading, error, productos, ofertas, promociones, ofertaMap, categorias } = useCatalogo()
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [toast, setToast] = useState('')

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
    setToast('Producto agregado')
    window.clearTimeout(window.__mallToastTimer)
    window.__mallToastTimer = window.setTimeout(() => setToast(''), 1800)
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="hero-band">
        <div>
          <h1 className="page-title">MALL</h1>
          <p className="page-subtitle">Tu tienda de barrio, ahora en la palma de tu mano.</p>
        </div>
        <div className="grid" style={{ justifyItems: 'start' }}>
          {totalItems > 0 ? (
            <Link className="btn-accent" to="/carrito">
              Ver carrito ({totalItems})
            </Link>
          ) : (
            <span className="badge-green">Bienvenido</span>
          )}
        </div>
      </section>

      <section className="card" style={{ background: 'linear-gradient(135deg, #ffefb7, #f7c85a)' }}>
        <strong style={{ display: 'block', marginBottom: 4 }}><Ticket size={18} style={{ verticalAlign: 'text-bottom' }} /> Gana Q10 de regalo</strong>
        <span>En pedidos de Q150 o mas, agrega tu telefono al confirmar y recibiras un cupon para canjear en tienda.</span>
      </section>

      {ofertas.length > 0 ? (
        <section className="grid" style={{ gap: 10 }}>
          <h2 className="font-display" style={{ margin: 0 }}>Ofertas activas</h2>
          <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(180px, 1fr)', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {ofertas.map((oferta) => (
              <article key={oferta.id} className="product-card" style={{ minWidth: 180 }}>
                {oferta.productos?.imagen_url ? <img src={oferta.productos.imagen_url} alt={oferta.productos.nombre} /> : <div className="product-placeholder">MALL</div>}
                <div className="product-body">
                  <strong>{oferta.productos?.nombre}</strong>
                  <div className="muted" style={{ textDecoration: 'line-through' }}>{money(oferta.productos?.precio)}</div>
                  <div className="price">{money(oferta.precio_oferta)}</div>
                  <span className="badge-yellow">−{oferta.porcentaje_descuento || 0}%</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {promociones.length > 0 ? (
        <section className="grid" style={{ gap: 10 }}>
          <h2 className="font-display" style={{ margin: 0 }}>Promociones del programa</h2>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {promociones.map((promo) => <span key={promo.id} className="badge-green" style={{ whiteSpace: 'nowrap' }}>{promo.nombre}</span>)}
          </div>
        </section>
      ) : null}

      <section className="toolbar">
        <div className="card" style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'center', padding: 12 }}>
          <Search size={18} />
          <input className="input-field" style={{ border: 0, boxShadow: 'none', padding: 0, minHeight: 'auto' }} placeholder="Buscar producto" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </section>

      <section style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {categorias.map((item) => (
          <button key={item} className={categoria === item ? 'btn-primary' : 'btn-outline'} type="button" onClick={() => setCategoria(item)} style={{ whiteSpace: 'nowrap' }}>
            {item}
          </button>
        ))}
      </section>

      {loading ? <div className="card">Cargando catalogo...</div> : null}
      {error ? <div className="error">{error}</div> : null}

      <section className="product-grid">
        {filteredProducts.map((producto) => {
          const oferta = ofertaMap[producto.id]
          return (
            <article key={producto.id} className="product-card" onClick={() => navigate(`/producto/${producto.id}`)} style={{ cursor: 'pointer' }}>
              {producto.imagen_url ? <img src={producto.imagen_url} alt={producto.nombre} /> : <div className="product-placeholder">MALL</div>}
              <div className="product-body">
                <strong>{producto.nombre}</strong>
                <span className="muted">{producto.categoria}</span>
                <div>
                  <span className="price">{money(oferta ? oferta.precio_oferta : producto.precio)}</span>
                  {oferta ? <span className="badge-yellow" style={{ marginLeft: 8 }}>Oferta</span> : null}
                </div>
                <button className="btn-accent" type="button" onClick={(event) => { event.stopPropagation(); quickAdd(producto) }}>
                  <Plus size={16} /> Agregar
                </button>
              </div>
            </article>
          )
        })}
      </section>

      {toast ? <div className="success" style={{ position: 'fixed', left: 16, right: 16, bottom: 90, zIndex: 1000 }}>{toast}</div> : null}
    </div>
  )
}
