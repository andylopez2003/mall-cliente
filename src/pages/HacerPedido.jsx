import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Gift, LocateFixed, Phone, ShieldCheck, Ticket } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'
import { useCatalogo } from '../hooks/useCatalogo.jsx'
import { usePedidos } from '../hooks/usePedidos.jsx'
import { couponCode, money } from '../utils/format.js'
import { supabase } from '../supabase.js'

function addTwenty(time) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + 20
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function HacerPedido() {
  const navigate = useNavigate()
  const { items, totalMonto, limpiarCarrito, cambiarCantidad, quitarItem } = useCart()
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
  const [cuponValor, setCuponValor] = useState(10)
  const [cuponEleccion, setCuponEleccion] = useState(null) // null | 'ahora' | 'guardar'
  const [generatedCode] = useState(() => couponCode())

  useEffect(() => {
    getConfiguracion().then((c) => {
      setCuponThreshold(c.monto_cupon_domicilio)
      setCuponValor(c.valor_cupon_domicilio)
    }).catch(() => {})
  }, [])

  const qualifiesCoupon = totalMonto >= cuponThreshold && telefono.trim().length > 0
  const totalFinal = qualifiesCoupon && cuponEleccion === 'ahora' ? totalMonto - cuponValor : totalMonto
  const validItems = useMemo(() => (catalogoLoading ? items : validateCart(items)), [items, validateCart, catalogoLoading])
  const haySlots = jornadas.some((j) => j.disponibles > 0)

  if (items.length === 0) return <Navigate to="/" replace />

  async function refreshSlots() {
    setLoadingSlots(true)
    try {
      const data = await slotsConDisponibilidad()
      setJornadas(data)
      setJornadaSeleccionada(null)
      setSlot('')
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
      await refreshSlots()
    }
    if (step === 3 && !slot) { setError('Elige un turno de entrega.'); return }
    setStep((current) => Math.min(4, current + 1))
  }

  async function submit() {
    setError('')
    try {
      const cleanItems = validItems
      if (cleanItems.length === 0) { setError('Tu carrito no tiene productos válidos.'); return }

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

      const guardarCupon = qualifiesCoupon && cuponEleccion !== 'ahora'

      const pedido = await crearPedido({
        cliente_id: clienteId,
        direccion_entrega: direccion.trim(),
        horario: slot,
        hora_entrega_asignada: slot,
        monto_total: totalMonto,
        descuento_cupon: qualifiesCoupon && cuponEleccion === 'ahora' ? cuponValor : 0,
        telefono_contacto: telefono.trim(),
        guardarCupon,
        codigoCupon: guardarCupon ? generatedCode : null,
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
          total: totalFinal,
          horario: slot,
          telefono: telefono.trim(),
          cuponAplicado: qualifiesCoupon && cuponEleccion === 'ahora' ? cuponValor : 0,
          codigoCupon: guardarCupon ? generatedCode : null,
        },
      })
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

      {/* ── Paso 1 ── */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
            <span>Total</span><span className="price">{money(totalMonto)}</span>
          </div>
          <button className="btn-primary" type="button" onClick={() => setStep(2)}>Continuar</button>
        </section>
      ) : null}

      {/* ── Paso 2 ── */}
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
              Agregar DPI (opcional, para cupones)
            </summary>
          </details>
          {usarDpi ? (
            <div className="grid" style={{ gap: 8 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Solo lo usamos para tu programa de cupones.</p>
              <input className="input-field" placeholder="Número de DPI" value={dpi} onChange={(e) => setDpi(e.target.value)} />
            </div>
          ) : null}
          <button className="btn-primary" type="button" onClick={nextStep}>Continuar</button>
        </section>
      ) : null}

      {/* ── Paso 3 ── */}
      {step === 3 ? (
        <section className="card grid">
          <h2 className="font-display" style={{ margin: 0 }}>Horario de entrega</h2>
          {loadingSlots ? <div className="muted" style={{ fontSize: 13 }}>Consultando disponibilidad...</div> : null}

          {!loadingSlots && jornadas.length > 0 && !haySlots ? (
            <div className="sin-slots-card">
              <div style={{ fontSize: 44 }}>😔</div>
              <strong style={{ fontSize: 16 }}>No hay turnos disponibles hoy</strong>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>Los turnos se recargarán mañana. Pedimos disculpas por la demora.</p>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>Si de verdad necesitas tu pedido hoy mismo, contáctanos:</p>
              <a href="tel:33921737" className="btn-accent" style={{ textDecoration: 'none', justifySelf: 'center', gap: 8 }}>
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
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Elige tu turno (cada uno dura 20 minutos):</p>
              <div className="slot-grid">
                {jornadaSeleccionada.slots.map((s) => (
                  <button key={s.hora} type="button"
                    className={`slot-btn${slot === s.hora ? ' slot-btn-selected' : ''}`}
                    disabled={!s.disponible} onClick={() => setSlot(s.hora)}>
                    <span className="slot-hora">{s.hora}</span>
                    <span className="slot-label">{!s.disponible ? 'Lleno' : slot === s.hora ? '✓ Elegido' : 'Libre'}</span>
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

      {/* ── Paso 4: Confirmar + cupón ── */}
      {step === 4 ? (
        <section className="card grid">
          <h2 className="font-display" style={{ margin: 0 }}>Confirmar pedido</h2>
          <div className="grid" style={{ gap: 8, fontSize: 14 }}>
            <div><span className="muted">Nombre: </span><strong>{nombre}</strong></div>
            <div><span className="muted">Teléfono: </span><strong>{telefono}</strong></div>
            <div><span className="muted">Dirección: </span><strong>{direccion}</strong></div>
            <div><span className="muted">Horario: </span><strong>{slot} – {addTwenty(slot)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--mall-line)', fontWeight: 700 }}>
              <span>Subtotal</span><span>{money(totalMonto)}</span>
            </div>
            {qualifiesCoupon && cuponEleccion === 'ahora' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mall-main)', fontWeight: 700 }}>
                <span>Descuento cupón</span><span>−{money(cuponValor)}</span>
              </div>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 17 }}>
              <span>Total a pagar</span><span className="price">{money(totalFinal)}</span>
            </div>
          </div>

          {qualifiesCoupon ? (
            <div style={{ background: 'linear-gradient(135deg, #fff8e7, #ffedb8)', border: '2px solid var(--mall-accent)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Gift size={20} style={{ color: 'var(--mall-accent)' }} />
                <strong>¡Ganaste un cupón de {money(cuponValor)}!</strong>
              </div>
              <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
                Tu pedido supera {money(cuponThreshold)}. ¿Qué quieres hacer con tu cupón?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className={cuponEleccion === 'ahora' ? 'btn-primary' : 'btn-outline'}
                  onClick={() => setCuponEleccion('ahora')}
                  style={{ fontSize: 13 }}
                >
                  <Ticket size={14} /> Usar ahora (−{money(cuponValor)})
                </button>
                <button
                  type="button"
                  className={cuponEleccion === 'guardar' ? 'btn-primary' : 'btn-outline'}
                  onClick={() => setCuponEleccion('guardar')}
                  style={{ fontSize: 13 }}
                >
                  Guardar código
                </button>
              </div>
              {cuponEleccion === 'ahora' ? (
                <div className="success" style={{ marginTop: 10, textAlign: 'center', fontSize: 13 }}>
                  Se descontarán {money(cuponValor)} de tu pedido. Total final: <strong>{money(totalFinal)}</strong>
                </div>
              ) : cuponEleccion === 'guardar' ? (
                <div className="success" style={{ marginTop: 10, textAlign: 'center', fontSize: 13 }}>
                  Se generará un código único al confirmar. Lo verás en la pantalla siguiente y en "Mis Cupones".
                </div>
              ) : null}
            </div>
          ) : null}

          <button className="btn-accent" type="button" onClick={submit}>Confirmar pedido</button>
        </section>
      ) : null}
    </div>
  )
}
