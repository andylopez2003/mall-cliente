import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Tag, Ticket, Trash2, X } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'
import { supabase } from '../supabase.js'
import { money } from '../utils/format.js'

export default function Carrito() {
  const navigate = useNavigate()
  const {
    items, cambiarCantidad, quitarItem,
    totalMonto, totalItems, totalConDescuento, descuentoTotal,
    cuponesAplicados, aplicarCupon, quitarCupon,
  } = useCart()

  const [threshold, setThreshold] = useState(150)
  const [couponValue, setCouponValue] = useState(10)
  const [minAmount, setMinAmount] = useState(20)
  const [umbrales, setUmbrales] = useState([[150, 10]])
  const [codigoInput, setCodigoInput] = useState('')
  const [cuponLoading, setCuponLoading] = useState(false)
  const [cuponError, setCuponError] = useState('')

  useEffect(() => {
    supabase
      .from('configuracion')
      .select('clave, valor')
      .in('clave', ['monto_cupon_domicilio', 'valor_cupon_domicilio', 'monto_minimo_domicilio'])
      .then(({ data }) => {
        const config = Object.fromEntries((data || []).map((i) => [i.clave, i.valor]))
        if (config.monto_cupon_domicilio)    setThreshold(Number(config.monto_cupon_domicilio))
        if (config.valor_cupon_domicilio)    setCouponValue(Number(config.valor_cupon_domicilio))
        if (config.monto_minimo_domicilio)   setMinAmount(Number(config.monto_minimo_domicilio))
        try {
          const raw = config.umbrales_cupones_domicilio
          if (raw) {
            const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
            if (Array.isArray(arr) && arr.length > 0) {
              const parsed = arr.map((e) => Array.isArray(e) ? e : [e.monto, e.valor])
              setUmbrales(parsed.sort((a, b) => a[0] - b[0]))
              setThreshold(parsed[0][0])
              setCouponValue(parsed[0][1])
            }
          }
        } catch (_) {}
      })
  }, [])

  const belowMinimum  = totalConDescuento < minAmount
  const faltaMinimo   = Math.max(minAmount - totalConDescuento, 0)

  // Barras apiladas: 1 cupón por cada múltiplo del umbral
  const cuponesGanados         = threshold > 0 ? Math.floor(totalMonto / threshold) : 0
  const progressHaciaSiguiente = threshold > 0 ? Math.min(((totalMonto % threshold) / threshold) * 100, 100) : 0
  const faltaParaSiguiente     = threshold > 0 ? Math.max(threshold - (totalMonto % threshold || threshold), 0) : 0
  const maxNivelesAMostrar     = Math.min(cuponesGanados + 1, 5)

  async function validarCupon(e) {
    e.preventDefault()
    const codigo = codigoInput.trim().toUpperCase()
    if (!codigo) return
    setCuponError('')
    setCuponLoading(true)

    const { data, error } = await supabase
      .from('cupones')
      .select('id, codigo, valor, estado, fecha_vencimiento')
      .eq('codigo', codigo)
      .maybeSingle()

    setCuponLoading(false)

    if (error)  { setCuponError('Error al verificar el cupón.'); return }
    if (!data)  { setCuponError('Código no válido. Verifica que esté bien escrito.'); return }

    if (data.estado === 'canjeado') {
      setCuponError('Este código ya fue utilizado y no puede volver a usarse.')
      return
    }
    if (data.estado === 'en_uso') {
      setCuponError('Este cupón ya está reservado en otro pedido activo. Si ese pedido fue cancelado, el cupón volverá a estar disponible en unos minutos.')
      return
    }
    if (data.estado === 'vencido' || new Date(data.fecha_vencimiento) < new Date()) {
      setCuponError('Este cupón ha vencido.')
      return
    }
    if (data.estado !== 'activo') {
      setCuponError('Este cupón no está disponible.')
      return
    }

    if (cuponesAplicados.find((c) => c.id === data.id)) {
      setCuponError('Este cupón ya está aplicado.')
      return
    }

    // Verificar que el total no baje del mínimo al aplicar este cupón
    const nuevoTotal = totalConDescuento - Number(data.valor || 0)
    if (nuevoTotal < minAmount) {
      setCuponError(`Este cupón llevaría el total por debajo del mínimo de ${money(minAmount)}.`)
      return
    }

    aplicarCupon({ id: data.id, codigo: data.codigo, valor: Number(data.valor) })
    setCodigoInput('')
    setCuponError('')
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h1 className="page-title">Carrito</h1>
      <p className="page-subtitle" style={{ marginBottom: 0 }}>
        {totalItems} producto{totalItems !== 1 ? 's' : ''} en tu carrito
      </p>

      {items.length === 0 ? (
        <div className="card grid">
          <strong>Tu carrito está vacío.</strong>
          <Link className="btn-primary" to="/">Ir al catálogo</Link>
        </div>
      ) : (
        <>
          {/* Barras apiladas: una por cada nivel de cupón */}
          <div style={{ display: 'grid', gap: 8 }}>
            {Array.from({ length: maxNivelesAMostrar }, (_, i) => {
              const nivel = i + 1
              const ganado = cuponesGanados >= nivel

              if (ganado) {
                return (
                  <div key={nivel} style={{
                    background: 'linear-gradient(135deg, #1D9E75, #14795a)',
                    borderRadius: 12, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: '0 3px 12px rgba(29,158,117,.3)',
                  }}>
                    <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>🎟️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>
                        ¡Cupón #{nivel} obtenido!
                      </div>
                      <div style={{ color: 'rgba(255,255,255,.82)', fontSize: 12 }}>
                        {money(couponValue)} de descuento · se entrega con tu pedido
                      </div>
                    </div>
                    <span style={{ background: 'rgba(255,255,255,.25)', borderRadius: 999, padding: '3px 10px', color: 'white', fontWeight: 900, fontSize: 16 }}>✓</span>
                  </div>
                )
              }

              // Nivel en progreso (siguiente a ganar)
              const progresoTexto = cuponesGanados > 0
                ? `${money(totalMonto % threshold || 0)} / ${money(threshold)}`
                : `${money(totalMonto)} / ${money(threshold)}`

              return (
                <div key={nivel} style={{
                  background: 'linear-gradient(135deg, #fff8e7, #ffe9a0)',
                  border: '2px solid var(--mall-accent)',
                  borderRadius: 12, padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 26, flexShrink: 0 }}>🎟️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#4a3200' }}>
                        Cupón #{nivel} — te faltan <strong>{money(faltaParaSiguiente)}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: '#8a6200', marginTop: 1 }}>
                        {progresoTexto} para ganar {money(couponValue)}
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 10, background: 'rgba(255,255,255,.6)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${progressHaciaSiguiente}%`,
                      background: 'linear-gradient(90deg, #EF9F27, #f5b942)',
                      borderRadius: 999, transition: 'width 0.5s ease',
                      boxShadow: '0 2px 8px rgba(239,159,39,.4)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Productos */}
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

          {/* Sección de cupones — múltiples permitidos */}
          <section className="card grid" style={{ gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={17} style={{ color: 'var(--mall-accent)' }} />
              <strong style={{ fontSize: 15 }}>¿Tienes cupones de descuento?</strong>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Puedes aplicar varios cupones. El total después de descuentos debe ser mínimo {money(minAmount)}.
            </p>

            {/* Lista de cupones aplicados */}
            {cuponesAplicados.map((c) => (
              <div key={c.id} style={{
                background: '#dff7ed', border: '1.5px solid var(--mall-main)',
                borderRadius: 10, padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--mall-dark)' }}>
                    <code style={{ letterSpacing: 1 }}>{c.codigo}</code>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--mall-main)', fontWeight: 700, marginTop: 2 }}>
                    −{money(c.valor)}
                  </div>
                </div>
                <button type="button" onClick={() => quitarCupon(c.id)} style={{ background: 'none', border: 0, color: 'var(--mall-muted)', cursor: 'pointer', padding: 4 }}>
                  <X size={17} />
                </button>
              </div>
            ))}

            {/* Input para agregar otro cupón */}
            <form onSubmit={validarCupon} style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-field"
                placeholder="Código del cupón (ej: MALL-ABC123)"
                value={codigoInput}
                onChange={(e) => { setCodigoInput(e.target.value.toUpperCase()); setCuponError('') }}
                style={{ flex: 1, textTransform: 'uppercase', letterSpacing: 1 }}
              />
              <button type="submit" className="btn-outline" disabled={cuponLoading || !codigoInput.trim()} style={{ flexShrink: 0, padding: '0 14px' }}>
                {cuponLoading ? '...' : 'Aplicar'}
              </button>
            </form>

            {cuponError ? <div className="error" style={{ margin: 0, fontSize: 13 }}>{cuponError}</div> : null}
          </section>

          {/* Totales */}
          <section className="card grid">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--mall-muted)' }}>
              <span>Subtotal</span>
              <span>{money(totalMonto)}</span>
            </div>
            {cuponesAplicados.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--mall-main)', fontWeight: 700 }}>
                <span>Cupón <code style={{ letterSpacing: 1 }}>{c.codigo}</code></span>
                <span>−{money(c.valor)}</span>
              </div>
            ))}
            {descuentoTotal > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--mall-main)', borderTop: '1px dashed var(--mall-line)', paddingTop: 6 }}>
                <span>Descuento total cupones</span>
                <span>−{money(descuentoTotal)}</span>
              </div>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 18, borderTop: '1px solid var(--mall-line)', paddingTop: 10 }}>
              <span>Total</span>
              <span className="price">{money(totalConDescuento)}</span>
            </div>

            {belowMinimum ? (
              <div style={{ background: '#ffe1e1', color: '#8b1f1f', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                <strong>Monto mínimo no alcanzado.</strong> El pedido mínimo es de <strong>{money(minAmount)}</strong>. Te faltan <strong>{money(faltaMinimo)}</strong> para continuar.
              </div>
            ) : null}

            <button
              className="btn-accent"
              type="button"
              onClick={() => navigate('/pedido')}
              disabled={belowMinimum}
            >
              Continuar pedido
            </button>
          </section>
        </>
      )}
    </div>
  )
}
