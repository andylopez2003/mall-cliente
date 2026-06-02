import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'
import { useCatalogo } from '../hooks/useCatalogo.jsx'
import { money } from '../utils/format.js'

export default function ProductoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { agregarItem } = useCart()
  const { productos, ofertaMap } = useCatalogo()

  const producto = useMemo(() => productos.find((item) => item.id === id), [productos, id])
  const oferta = ofertaMap[id]

  if (!producto) return <div className="card">Cargando producto...</div>

  return (
    <div className="grid" style={{ gap: 16 }}>
      <button className="btn-outline" type="button" onClick={() => navigate(-1)} style={{ width: 'fit-content' }}>
        <ArrowLeft size={16} /> Volver
      </button>
      <section className="card grid">
        {producto.imagen_url ? <img src={producto.imagen_url} alt={producto.nombre} style={{ width: '100%', maxHeight: 340, objectFit: 'cover', borderRadius: 8 }} /> : null}
        <h1 className="page-title" style={{ margin: 0 }}>{producto.nombre}</h1>
        <span className="muted">{producto.categoria}</span>
        <div className="price">{money(oferta ? oferta.precio_oferta : producto.precio)}</div>
        {producto.descripcion ? <p className="muted">{producto.descripcion}</p> : null}
        <button className="btn-primary" type="button" onClick={() => agregarItem({
          producto_id: producto.id,
          nombre: producto.nombre,
          imagen_url: producto.imagen_url,
          precio: oferta ? Number(oferta.precio_oferta) : Number(producto.precio),
        })}>
          <Plus size={16} /> Agregar al carrito
        </button>
      </section>
    </div>
  )
}
