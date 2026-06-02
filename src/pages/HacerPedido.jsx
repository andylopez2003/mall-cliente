import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, LocateFixed, ShieldCheck, Ticket } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'
import { useCatalogo } from '../hooks/useCatalogo.jsx'
import { usePedidos } from '../hooks/usePedidos.jsx'
import { money } from '../utils/format.js'
import { supabase } from '../supabase.js'

export default function HacerPedido() {
  const navigate = useNavigate()
  const { items, totalMonto, limpiarCarrito, cambiarCantidad, quitarItem } = useCart()
  const { validateCart, loading: catalogoLoading } = useCatalogo()
  const { slotsDisponibles, crearPedido } = usePedidos()
  const [step, setStep] = useState(1)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [usarDpi, setUsarDpi] = useState(false)
  const [dpi, setDpi] = useState('')
  const [slot, setSlot] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [error, setError] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [message, setMessage] = useState('')

  const qualifiesCoupon = totalMonto >= 150 && telefono.trim().length > 0
  const validItems = useMemo(() => (catalogoLoading ? items : validateCart(items)), [items, validateCart, catalogoLoading])

  if (items.length === 0) return <Navigate to="/" replace />

  async function refreshSlots() {
    setLoadingSlots(true)
    try {
      const slots = await slotsDisponibles()
      setAvailableSlots(slots)
      setSlot((current) => current || slots[0] || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingSlots(false)
    }
  }

  async function useGPS() {
    if (!navigator.geolocation) {
      setError('Tu dispositivo no permite usar GPS.')
      return
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords
      setDireccion(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
    }, () => setError('No se pudo obtener tu ubicacion.'))
  }

  async function nextStep() {
    setError('')
    if (step === 2) {
      if (!nombre.trim() || !telefono.trim() || !direccion.trim()) {
        setError('Completa nombre, telefono y direccion.')
        return
      }
      await refreshSlots()
    }
    setStep((current) => Math.min(4, current + 1))
  }

  async function submit() {
    setError('')
    try {
      const cleanItems = validItems
      if (cleanItems.length === 0) {
        setError('Tu carrito no tiene productos validos.')
        return
      }

      const { data: clienteExistente } = await supabase
        .from('usuarios')
        .select('id')
        .eq('telefono', telefono.trim())
        .maybeSingle()

      let clienteId = clienteExistente?.id || null
      if (telefono.trim()) {
        if (!clienteId) {
          const { data: creado, error } = await supabase
            .from('usuarios')
            .insert({
              nombre: nombre.trim(),
              telefono: telefono.trim(),
              dpi: usarDpi && dpi.trim() ? dpi.trim() : null,
              rol: 'cliente',
              qr_code: null,
              onboarding_completo: true,
            })
            .select('id')
            .single()
          if (error) throw error
          clienteId = creado.id
          await supabase.from('puntos').insert({ cliente_id: clienteId, saldo: 0, total_ganado: 0, total_canjeado: 0 })
        }
      }

      const pedido = await crearPedido({
        cliente_id: clienteId,
        direccion_entrega: direccion.trim(),
        horario: slot,
        hora_entrega_asignada: slot,
        monto_total: totalMonto,
        telefono_contacto: telefono.trim(),
        items: cleanItems.map((item) => ({
          producto_id: item.producto_id,
          nombre_producto: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad,
        })),
      })

      limpiarCarrito()
      navigate('/pedido/confirmacion', {
        state: {
          pedidoId: pedido.id,
          total: totalMonto,
          horario: slot,
          telefono: telefono.trim(),
          cupon: qualifiesCoupon,
        },
      })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h1 className="page-title">Hacer pedido</h1>
      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {[1, 2, 3, 4].map((number) => (
          <button key={number} type="button" className={step === number ? 'btn-primary' : 'btn-outline'} onClick={() => setStep(number)}>
            Paso {number}
          </button>
        ))}
      </div>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      {step === 1 ? (
        <section className="card grid">
          <h2 className="font-display">Revisar carrito</h2>
          {catalogoLoading ? <div className="muted">Validando productos...</div> : null}
          {validItems.map((item) => (
            <div key={item.producto_id} className="cart-line">
              <div>
                <strong>{item.nombre}</strong>
                <div className="muted">{money(item.precio)} c/u</div>
                <div>{money(Number(item.precio) * item.cantidad)}</div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}>-</button>
                <strong>{item.cantidad}</strong>
                <button type="button" onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}>+</button>
                <button type="button" className="btn-danger" onClick={() => quitarItem(item.producto_id)}>Quitar</button>
              </div>
            </div>
          ))}
          {totalMonto >= 150 ? <div className="card" style={{ background: '#fff5d9' }}><Ticket size={18} /> Calificas para un cupon de Q10.</div> : null}
          <div className="toolbar" style={{ justifyContent: 'space-between', margin: 0 }}>
            <strong>Total</strong>
            <strong className="price">{money(totalMonto)}</strong>
          </div>
          <button className="btn-primary" type="button" onClick={() => setStep(2)}>Continuar</button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="card grid">
          <h2 className="font-display">Tus datos</h2>
          <input className="input-field" placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className="input-field" placeholder="Telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <input className="input-field" placeholder="Direccion de entrega" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          <button className="btn-outline" type="button" onClick={useGPS}><LocateFixed size={16} /> Usar GPS</button>
          <details className="card" open={usarDpi}>
            <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--mall-dark)' }}>
              <ShieldCheck size={16} style={{ verticalAlign: 'text-bottom' }} /> Agrega tu DPI para cupones
            </summary>
            <p className="muted">Opcional. Solo lo usamos para tu programa de cupones y para facilitar futuras compras.</p>
            <input className="input-field" placeholder="DPI opcional" value={dpi} onChange={(e) => setDpi(e.target.value)} />
          </details>
          {qualifiesCoupon ? <div className="card" style={{ background: '#fff5d9' }}>Vas bien para un cupon de regalo de Q10.</div> : null}
          <button className="btn-primary" type="button" onClick={nextStep}>Continuar</button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="card grid">
          <h2 className="font-display">Horario de entrega</h2>
          {loadingSlots ? <div className="muted">Buscando horarios disponibles...</div> : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {availableSlots.map((item) => (
              <button key={item} type="button" className={slot === item ? 'btn-primary' : 'btn-outline'} onClick={() => setSlot(item)}>
                {item}
              </button>
            ))}
          </div>
          {availableSlots.length === 0 ? <div className="muted">No hay slots disponibles por ahora.</div> : null}
          <button className="btn-primary" type="button" onClick={nextStep} disabled={availableSlots.length === 0}>Continuar</button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="card grid">
          <h2 className="font-display">Confirmar</h2>
          <div className="muted">Nombre: {nombre}</div>
          <div className="muted">Telefono: {telefono}</div>
          <div className="muted">Direccion: {direccion}</div>
          <div className="muted">Horario: {slot}</div>
          <div className="muted">Total: {money(totalMonto)}</div>
          {qualifiesCoupon ? <div className="card" style={{ background: '#fff5d9' }}>Este pedido marcara cupon para canje fisico en tienda.</div> : null}
          <button className="btn-accent" type="button" onClick={submit}>Confirmar pedido</button>
        </section>
      ) : null}
    </div>
  )
}
