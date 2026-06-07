import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, LocateFixed, Phone, ShieldCheck, Ticket } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'
import { useCatalogo } from '../hooks/useCatalogo.jsx'
import { usePedidos } from '../hooks/usePedidos.jsx'
import { money } from '../utils/format.js'
import { supabase } from '../supabase.js'

function addTwenty(time) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + 20
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function HacerPedido() {
  const navigate = useNavigate()
  const { items, totalMonto, totalConDescuento, descuentoTotal, cuponesAplicados, limpiarCarrito, cambiarCantidad, quitarItem } = useCart()
  const { validateCart, loading: catalogoLoading } = useCatalogo()
  const { slotsConDisponibilidad, crearPedido, getConfiguracion } = usePedidos()

  const [step, setStep] = useState(1)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [usarDpi, setUsarDpi] = useState(false)
  const [dpi, setDpi] = useState('')
  const [slot, setSlot] = useState('')
  const [jornadas, setJornadas] = useState([])
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState(null)
  const [error, setError] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [cuponThreshold, setCuponThreshold] = useState(150)
  const [fechaEntrega, setFechaEntrega] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    getConfiguracion().then((c) => setCuponThreshold(c.monto_cupon_domicilio)).catch(() => {})
  }, [])

  const haySlots = jornadas.some((j) => j.disponibles > 0)
  const validItems = useMemo(() => (catalogoLoading ? items : validateCart(items)), [items, validateCart, catalogoLoading])
  const generaraCupon    = totalMonto >= cuponThreshold
  const cuponIds         = cuponesAplicados.map((c) => c.id)

  if (items.length === 0) return <Navigate to="/" replace />

  async function refreshSlots(fecha = fechaEntrega) {
    setLoadingSlots(true)
    setJornadas([])
    setJornadaSeleccionada(null)
    setSlot('')
    try {
      const data = await slotsConDisponibilidad(fecha)
      setJornadas(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingSlots(false)
    }
  }

  async function useGPS() {
    if (!navigator.geolocation) { setError('Tu dispositivo no permite usar GPS.'); return }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setDireccion(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`),
      () => setError('No se pudo obtener tu ubicación.'),
    )
  }

  async function nextStep() {
    setError('')
    if (step === 2) {
      if (!nombre.trim() || !telefono.trim() || !direccion.trim()) {
        setError('Completa nombre, teléfono y dirección.')
        return
      }
      await refreshSlots(fechaEntrega)
    }
    if (step === 3 && !slot) { setError('Elige un turno de entrega.'); return }
    setStep((current) => Math.min(4, current + 1))
  }

  async function submit() {
    setError('')
    try {
      const cleanItems = validItems
      if (cleanItems.length === 0) { setError('Tu carrito no tiene productos válidos.'); return }

      // Verificar que todos los cupones del carrito aún estén activos
      for (const cupon of cuponesAplicados) {
        const { data: cuponCheck } = await supabase
          .from('cupones').select('estado').eq('id', cupon.id).single()
        if (cuponCheck?.estado !== 'activo') {
          setError(`El cupón ${cupon.codigo} ya no está disponible. Por favor quítalo y vuelve a intentarlo.`)
          return
        }
      }

      // Verificar mínimo Q20 después de descuentos
      if (totalConDescuento < 20) {
        setError('El total después de aplicar cupones debe ser mínimo Q20.00.')
        return
      }

      const { data: clienteExistente } = await supabase
        .from('usuarios').select('id').eq('telefono', telefono.trim()).maybeSingle()

      let clienteId = clienteExistente?.id || null
      if (!clienteId) {
        const { data: creado, error: cErr } = await supabase
          .from('usuarios')
          .insert({ nombre: nombre.trim(), telefono: telefono.trim(), dpi: usarDpi && dpi.trim() ? dpi.trim() : null, rol: 'cliente', onboarding_completo: true })
          .select('id').single()
        if (cErr) throw cErr
        clienteId = creado.id
        await supabase.from('puntos').insert({ cliente_id: clienteId, saldo: 0, total_ganado: 0, total_canjeado: 0 })
      }

      const { pedido, generaCupon } = await crearPedido({
        cliente_id: clienteId,
        direccion_entrega: direccion.trim(),
        horario: slot,
        hora_entrega_asignada: slot,
        fecha_entrega: fechaEntrega,
        monto_total: totalMonto,
        descuento_cupones: descuentoTotal,
        cuponIds: cuponIds,
        telefono_contacto: telefono.trim(),
        items: cleanItems.map((item) => ({
          producto_id: item.producto_id,
          nombre_producto: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad,
        })),
      })

      // Guardar pedido en localStorage para mostrarlo en el inicio
      try {
        const guardados = JSON.parse(localStorage.getItem('mall_mis_pedidos') || '[]')
        guardados.unshift({
          id: pedido.id,
          numero: pedido.id.slice(0, 8).toUpperCase(),
          fecha: fechaEntrega,
          horario: slot,
          total: totalConDescuento,
        })
        localStorage.setItem('mall_mis_pedidos', JSON.stringify(guardados.slice(0, 10)))
      } catch (_) {}

      // Navegar ANTES de limpiar el carrito para evitar que el guard <Navigate to="/"> bloquee la confirmación
      navigate('/pedido/confirmacion', {
        state: {
          pedidoId: pedido.id,
          total: totalConDescuento,
          horario: slot,
          fecha: fechaEntrega,
          descuentoCupones: descuentoTotal,
          numCupones: cuponesAplicados.length,
          generaCupon,
        },
      })
      limpiarCarrito()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h1 className="page-title">Hacer pedido</h1>

      <div className="card" style={{ display: 'flex', gap: 6, padding: 10 }}>
        {[1, 2, 3, 4].map((n) => (
          <button key={n} type="button" className={step === n ? 'btn-primary' : 'btn-outline'}
            onClick={() => setStep(n)} style={{ flex: 1, padding: '8px 4px', minHeight: 38, fontSize: 13 }}>
            Paso {n}
          </button>
        ))}
      </div>

      {error ? <div className="error">{error}</div> : null}

      {/* ── Paso 1: Carrito ── */}
      {step === 1 ? (
        <section className="card grid">
          <h2 className="font-display" style={{ margin: 0 }}>Revisar carrito</h2>
          {catalogoLoading ? <div className="muted" style={{ fontSize: 13 }}>Validando productos...</div> : null}
          {validItems.map((item) => (
            <div key={item.producto_id} className="cart-line">
              <div>
                <strong style={{ fontSize: 14 }}>{item.nombre}</strong>
                <div className="muted" style={{ fontSize: 13 }}>{money(item.precio)} c/u</div>
                <div style={{ fontWeight: 700 }}>{money(Number(item.precio) * item.cantidad)}</div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}>−</button>
                <strong>{item.cantidad}</strong>
                <button type="button" onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}>+</button>
                <button type="button" className="btn-danger" style={{ padding: '6px 10px', minHeight: 36, fontSize: 12 }} onClick={() => quitarItem(item.producto_id)}>Quitar</button>
              </div>
            </div>
          ))}
          {cuponesAplicados.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mall-main)', fontSize: 13, fontWeight: 700 }}>
              <span>Cupón {c.codigo}</span>
              <span>−{money(c.valor)}</span>
            </div>
          ))}
          {descuentoTotal > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 17, borderTop: '1px solid var(--mall-line)', paddingTop: 10 }}>
              <span>Total</span><span className="price">{money(totalConDescuento)}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 17, borderTop: '1px solid var(--mall-line)', paddingTop: 10 }}>
              <span>Total</span><span className="price">{money(totalConDescuento)}</span>
            </div>
          )}
          <button className="btn-primary" type="button" onClick={() => setStep(2)}>Continuar</button>
        </section>
      ) : null}

      {/* ── Paso 2: Datos ── */}
      {step === 2 ? (
        <section className="card grid">
          <h2 className="font-display" style={{ margin: 0 }}>Tus datos</h2>
          <input className="input-field" placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className="input-field" placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <input className="input-field" placeholder="Dirección de entrega" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          <button className="btn-outline" type="button" onClick={useGPS}><LocateFixed size={15} /> Usar mi ubicación GPS</button>
          <details style={{ cursor: 'pointer' }} open={usarDpi} onClick={(e) => { e.preventDefault(); setUsarDpi(!usarDpi) }}>
            <summary style={{ fontWeight: 700, color: 'var(--mall-dark)', userSelect: 'none' }}>
              <ShieldCheck size={15} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
              Agregar DPI (opcional, para acumular puntos)
            </summary>
          </details>
          {usarDpi ? (
            <input className="input-field" placeholder="Número de DPI" value={dpi} onChange={(e) => setDpi(e.target.value)} />
          ) : null}
          <button className="btn-primary" type="button" onClick={nextStep}>Continuar</button>
        </section>
      ) : null}

      {/* ── Paso 3: Horario ── */}
      {step === 3 ? (
        <section className="card grid">
          <h2 className="font-display" style={{ margin: 0 }}>Horario de entrega</h2>

          {/* Selector de fecha */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--mall-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Día de entrega</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() + i)
                const f = d.toISOString().slice(0, 10)
                const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric' })
                return (
                  <button key={f} type="button"
                    className={fechaEntrega === f ? 'btn-primary' : 'btn-outline'}
                    style={{ whiteSpace: 'nowrap', padding: '8px 14px', minHeight: 40, fontSize: 13, flexShrink: 0 }}
                    onClick={() => { setFechaEntrega(f); refreshSlots(f) }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {loadingSlots ? <div className="muted" style={{ fontSize: 13 }}>Consultando disponibilidad...</div> : null}

          {!loadingSlots && jornadas.length > 0 && !haySlots ? (
            <div className="sin-slots-card">
              <div style={{ fontSize: 44 }}>😔</div>
              <strong style={{ fontSize: 16 }}>
                {fechaEntrega === new Date().toISOString().slice(0, 10)
                  ? 'Ya no hay turnos disponibles para hoy'
                  : 'No hay turnos disponibles para este día'}
              </strong>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                {fechaEntrega === new Date().toISOString().slice(0, 10)
                  ? 'Los turnos de hoy ya cerraron. Puedes pedir para mañana:'
                  : 'Elige otro día usando los botones de arriba, o contáctanos:'}
              </p>
              {fechaEntrega === new Date().toISOString().slice(0, 10) ? (
                <button className="btn-primary" type="button" style={{ justifySelf: 'center' }} onClick={() => {
                  const manana = new Date(); manana.setDate(manana.getDate() + 1)
                  const f = manana.toISOString().slice(0, 10)
                  setFechaEntrega(f); refreshSlots(f)
                }}>
                  Ver horarios de mañana
                </button>
              ) : null}
              <a href="tel:33921737" className="btn-accent" style={{ textDecoration: 'none', justifySelf: 'center' }}>
                <Phone size={16} /> 33921737
              </a>
            </div>
          ) : null}

          {!loadingSlots && haySlots && !jornadaSeleccionada ? (
            <div className="grid" style={{ gap: 10 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Elige la jornada en que quieres recibir tu pedido:</p>
              <div className="jornada-grid">
                {jornadas.map((j) => (
                  <button key={j.nombre} type="button" className="jornada-card" disabled={j.disponibles === 0}
                    onClick={() => { setJornadaSeleccionada(j); setSlot('') }}>
                    <span className="jornada-icono">{j.nombre === 'Mañana' ? '🌤️' : '🌙'}</span>
                    <strong>{j.nombre}</strong>
                    <span className="jornada-rango">{j.rango}</span>
                    <span className={j.disponibles > 0 ? 'badge-green' : 'badge-red'}>
                      {j.disponibles > 0 ? `${j.disponibles} turnos libres` : 'Sin turnos'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!loadingSlots && jornadaSeleccionada ? (
            <div className="grid" style={{ gap: 12 }}>
              <button className="btn-outline" type="button" style={{ width: 'fit-content', fontSize: 13 }}
                onClick={() => { setJornadaSeleccionada(null); setSlot('') }}>
                <ArrowLeft size={14} /> Cambiar jornada
              </button>
              <div><strong>{jornadaSeleccionada.nombre}</strong><span className="muted" style={{ marginLeft: 6, fontSize: 13 }}>{jornadaSeleccionada.rango}</span></div>
              <div className="slot-grid">
                {jornadaSeleccionada.slots.map((s) => (
                  <button key={s.hora} type="button"
                    className={`slot-btn${slot === s.hora ? ' slot-btn-selected' : ''}`}
                    disabled={!s.disponible} onClick={() => setSlot(s.hora)}>
                    <span className="slot-hora">{s.hora}</span>
                    <span className="slot-label">{s.cerrado ? 'Cerrado' : !s.disponible ? 'Lleno' : slot === s.hora ? '✓ Elegido' : 'Libre'}</span>
                  </button>
                ))}
              </div>
              {slot ? (
                <div className="success" style={{ textAlign: 'center' }}>
                  Tu pedido llegará entre las <strong>{slot}</strong> y las <strong>{addTwenty(slot)}</strong>
                </div>
              ) : null}
            </div>
          ) : null}

          <button className="btn-primary" type="button" onClick={nextStep} disabled={!slot || loadingSlots}>Continuar</button>
        </section>
      ) : null}

      {/* ── Paso 4: Confirmar ── */}
      {step === 4 ? (
        <section className="card grid">
          <h2 className="font-display" style={{ margin: 0 }}>Confirmar pedido</h2>
          <div className="grid" style={{ gap: 8, fontSize: 14 }}>
            <div><span className="muted">Nombre: </span><strong>{nombre}</strong></div>
            <div><span className="muted">Teléfono: </span><strong>{telefono}</strong></div>
            <div><span className="muted">Dirección: </span><strong>{direccion}</strong></div>
            <div><span className="muted">Fecha: </span><strong>{new Date(fechaEntrega + 'T12:00:00').toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })}</strong></div>
            <div><span className="muted">Horario: </span><strong>{slot} – {addTwenty(slot)}</strong></div>
            {cuponesAplicados.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mall-main)', fontWeight: 700, fontSize: 13 }}>
                <span>Cupón {c.codigo}</span>
                <span>−{money(c.valor)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 17, borderTop: '1px solid var(--mall-line)', paddingTop: 8 }}>
              <span>Total a pagar</span><span className="price">{money(totalConDescuento)}</span>
            </div>
          </div>
          {generaraCupon ? (
            <div className="card" style={{ background: '#fff5d9', padding: 12, fontSize: 13 }}>
              <Ticket size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
              Este pedido generará un cupón de descuento que te entregaremos junto con tu pedido.
            </div>
          ) : null}
          <button className="btn-accent" type="button" onClick={submit}>Confirmar pedido</button>
        </section>
      ) : null}
    </div>
  )
}
