import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Edit2, History, Package, Phone, Search } from 'lucide-react'
import { supabase } from '../supabase.js'
import { money } from '../utils/format.js'

const ESTADO = {
  pendiente:  { label: 'Pendiente',  cls: 'badge-yellow', color: '#87510b', bg: '#fff1d7' },
  confirmado: { label: 'Confirmado', cls: 'badge-green',  color: '#0f6e56', bg: '#dff7ed' },
  preparando: { label: 'Preparando', cls: 'badge-green',  color: '#1a5fa8', bg: '#dbeafe' },
  en_camino:  { label: 'En camino',  cls: 'badge-green',  color: '#5b21b6', bg: '#ede9fe' },
  entregado:  { label: 'Entregado',  cls: 'badge-green',  color: '#166534', bg: '#dcfce7' },
  cancelado:  { label: 'Cancelado',  cls: 'badge-gray',   color: '#6b7280', bg: '#f3f4f6' },
}

const FLUJO_LABELS = [
  { key: 'pendiente',  icon: '📋', label: 'Recibido'  },
  { key: 'confirmado', icon: '✅', label: 'Confirmado' },
  { key: 'preparando', icon: '📦', label: 'Preparando' },
  { key: 'en_camino',  icon: '🛵', label: 'En camino'  },
  { key: 'entregado',  icon: '🏠', label: 'Entregado'  },
]

function BarraProgreso({ estado }) {
  if (estado === 'cancelado') return null
  const idx = FLUJO_LABELS.findIndex((f) => f.key === estado)
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {FLUJO_LABELS.map((f, i) => (
          <div key={f.key} style={{ flex: 1, height: 5, borderRadius: 999, background: i <= idx ? 'var(--mall-main)' : '#e1f5ee', transition: 'background 0.4s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {FLUJO_LABELS.map((f, i) => (
          <div key={f.key} style={{ textAlign: 'center', fontSize: 9, color: i <= idx ? 'var(--mall-main)' : 'var(--mall-muted)', fontWeight: i === idx ? 900 : 400, flex: 1 }}>
            <div style={{ fontSize: 14 }}>{f.icon}</div>
            {f.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MiPedido() {
  const location = useLocation?.() || {}
  const [tab, setTab] = useState('activo')

  // ── Tab activo ──
  const [numeroPedido, setNumeroPedido] = useState(location.state?.numeroInicial || '')
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [buscado, setBuscado] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [editDireccion, setEditDireccion] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [cancelando, setCancelando] = useState(null)
  const channelRef = useRef(null)

  // ── Tab historial ──
  const [telefonoH, setTelefonoH] = useState('')
  const [historial, setHistorial] = useState([])
  const [loadingH, setLoadingH] = useState(false)
  const [errorH, setErrorH] = useState('')
  const [buscadoH, setBuscadoH] = useState(false)

  // Realtime: suscribir cuando hay pedidos activos
  useEffect(() => {
    if (pedidos.length === 0) return
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    channelRef.current = supabase
      .channel('mi-pedido-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (payload) => {
        setPedidos((curr) => curr.map((p) => p.id === payload.new.id ? { ...p, ...payload.new } : p))
      })
      .subscribe()

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [pedidos.length])

  async function buscar(e) {
    e.preventDefault()
    const num = numeroPedido.trim().toLowerCase()
    if (!num) return
    setLoading(true)
    setError('')
    setSaveMsg('')
    setEditandoId(null)

    const { data, error: err } = await supabase
      .from('pedidos')
      .select('*, detalle_pedidos(*)')
      .in('estado', ['pendiente', 'confirmado', 'preparando', 'en_camino'])
      .order('created_at', { ascending: false })

    if (err) { setError(err.message); setLoading(false); return }
    const coincidentes = (data || []).filter((p) => p.id.toLowerCase().startsWith(num))
    setPedidos(coincidentes)
    setBuscado(true)
    setLoading(false)
  }

  async function buscarHistorial(e) {
    e.preventDefault()
    if (!telefonoH.trim()) return
    setLoadingH(true)
    setErrorH('')

    const { data, error: err } = await supabase
      .from('pedidos')
      .select('*, detalle_pedidos(*)')
      .eq('telefono_contacto', telefonoH.trim())
      .order('created_at', { ascending: false })
      .limit(30)

    if (err) { setErrorH(err.message); setLoadingH(false); return }
    setHistorial(data || [])
    setBuscadoH(true)
    setLoadingH(false)
  }

  function iniciarEdicion(pedido) {
    setEditandoId(pedido.id)
    setEditDireccion(pedido.direccion_entrega || '')
    setEditTelefono(pedido.telefono_contacto || '')
    setSaveMsg('')
  }

  async function cancelarPedido(pedidoId) {
    if (!window.confirm('¿Seguro que deseas cancelar este pedido?')) return
    setCancelando(pedidoId)
    setError('')
    const { error: err } = await supabase.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedidoId).eq('estado', 'pendiente')
    if (err) {
      setError('No se pudo cancelar. Contáctanos por WhatsApp.')
    } else {
      setPedidos((curr) => curr.filter((p) => p.id !== pedidoId))
      setSaveMsg('Pedido cancelado.')
      window.setTimeout(() => setSaveMsg(''), 4000)
    }
    setCancelando(null)
  }

  async function guardar(pedidoId) {
    if (!editDireccion.trim()) { setError('La dirección no puede estar vacía.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('pedidos').update({ direccion_entrega: editDireccion.trim(), telefono_contacto: editTelefono.trim() }).eq('id', pedidoId)
    if (err) { setError(err.message); setSaving(false); return }
    setPedidos((curr) => curr.map((p) => p.id === pedidoId ? { ...p, direccion_entrega: editDireccion.trim(), telefono_contacto: editTelefono.trim() } : p))
    setEditandoId(null)
    setSaving(false)
    setSaveMsg('Datos actualizados.')
    window.setTimeout(() => setSaveMsg(''), 3000)
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h1 className="page-title">Mis Pedidos</h1>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className={tab === 'activo' ? 'btn-primary' : 'btn-outline'} type="button" onClick={() => setTab('activo')} style={{ flex: 1, fontSize: 13 }}>
          <Package size={15} /> Pedido activo
        </button>
        <button className={tab === 'historial' ? 'btn-primary' : 'btn-outline'} type="button" onClick={() => setTab('historial')} style={{ flex: 1, fontSize: 13 }}>
          <History size={15} /> Historial
        </button>
      </div>

      {/* ── Tab: Pedido activo ── */}
      {tab === 'activo' ? (
        <>
          <div className="card" style={{ background: '#fffdf0', border: '1px solid #f5e08a', padding: 14, fontSize: 13 }}>
            <strong>¿Dónde encuentro mi número?</strong>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Al confirmar tu pedido se mostró un código de 8 caracteres (ej: <strong style={{ fontFamily: 'monospace' }}>A1B2C3D4</strong>).
            </p>
          </div>

          <form className="card grid" style={{ gap: 10 }} onSubmit={buscar}>
            <label style={{ fontWeight: 700, fontSize: 14 }}>Número de pedido</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input-field" placeholder="Ej: A1B2C3D4" value={numeroPedido}
                onChange={(e) => setNumeroPedido(e.target.value.toUpperCase())}
                style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }} maxLength={8} />
              <button className="btn-primary" type="submit" style={{ flexShrink: 0, padding: '0 16px' }}><Search size={17} /></button>
            </div>
          </form>

          {loading ? <div className="card muted" style={{ textAlign: 'center', padding: 20 }}>Buscando...</div> : null}
          {error ? <div className="error">{error}</div> : null}
          {saveMsg ? <div className="success">{saveMsg}</div> : null}

          {buscado && pedidos.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🔍</div>
              <strong>No encontramos ese pedido</strong>
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>Solo se muestran pedidos activos. Si ya fue entregado, búscalo en Historial.</p>
            </div>
          ) : null}

          {pedidos.map((pedido) => {
            const estado = ESTADO[pedido.estado] || { label: pedido.estado, cls: 'badge-gray', bg: '#f3f4f6', color: '#6b7280' }
            const isEditing = editandoId === pedido.id
            return (
              <article key={pedido.id} className="card grid" style={{ gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--mall-muted)' }}>N° de pedido</div>
                    <strong style={{ fontSize: 15, fontFamily: 'monospace', letterSpacing: 1 }}>{pedido.id.slice(0, 8).toUpperCase()}</strong>
                  </div>
                  <span style={{ background: estado.bg, color: estado.color, borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}>{estado.label}</span>
                </div>

                <BarraProgreso estado={pedido.estado} />

                <div style={{ fontSize: 12, color: 'var(--mall-muted)' }}>
                  {new Date(pedido.created_at).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>

                <div className="grid" style={{ gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>Productos</strong>
                  {(pedido.detalle_pedidos || []).map((d) => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 6, borderBottom: '1px solid #edf4f1' }}>
                      <span>{d.nombre_producto} × {d.cantidad}</span>
                      <span className="muted">{money(d.subtotal)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 4 }}>
                    <span>Total pagado</span><span className="price">{money(pedido.monto_total)}</span>
                  </div>
                </div>

                {!isEditing ? (
                  <div className="grid" style={{ gap: 8, fontSize: 14 }}>
                    <div><span className="muted">Entrega: </span><strong>{pedido.horario || pedido.hora_entrega_asignada || '—'}</strong></div>
                    <div><span className="muted">Dirección: </span>{pedido.direccion_entrega}</div>
                    <div><span className="muted">Teléfono: </span>{pedido.telefono_contacto || '—'}</div>
                    {pedido.estado === 'pendiente' ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                        <button className="btn-outline" type="button" onClick={() => iniciarEdicion(pedido)} style={{ flex: 1 }}><Edit2 size={14} /> Editar datos</button>
                        <button className="btn-danger" type="button" onClick={() => cancelarPedido(pedido.id)} disabled={cancelando === pedido.id} style={{ flex: 1, fontSize: 13 }}>
                          {cancelando === pedido.id ? 'Cancelando...' : 'Cancelar pedido'}
                        </button>
                      </div>
                    ) : (
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Solo puedes editar pedidos en estado Pendiente.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid" style={{ gap: 10 }}>
                    <strong style={{ fontSize: 14 }}>Editar datos de entrega</strong>
                    <input className="input-field" placeholder="Dirección de entrega" value={editDireccion} onChange={(e) => setEditDireccion(e.target.value)} />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Phone size={15} style={{ color: 'var(--mall-muted)', flexShrink: 0 }} />
                      <input className="input-field" placeholder="Teléfono de contacto" value={editTelefono} onChange={(e) => setEditTelefono(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-outline" type="button" onClick={() => setEditandoId(null)} style={{ flex: 1 }}>Cancelar</button>
                      <button className="btn-primary" type="button" onClick={() => guardar(pedido.id)} disabled={saving} style={{ flex: 2 }}>
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </>
      ) : null}

      {/* ── Tab: Historial ── */}
      {tab === 'historial' ? (
        <>
          <form className="card grid" style={{ gap: 10 }} onSubmit={buscarHistorial}>
            <label style={{ fontWeight: 700, fontSize: 14 }}>Buscar por teléfono</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input-field" placeholder="Tu número de teléfono" value={telefonoH}
                onChange={(e) => setTelefonoH(e.target.value)} style={{ flex: 1 }} />
              <button className="btn-primary" type="submit" style={{ flexShrink: 0, padding: '0 16px' }}><Search size={17} /></button>
            </div>
          </form>

          {loadingH ? <div className="card muted" style={{ textAlign: 'center', padding: 20 }}>Buscando...</div> : null}
          {errorH ? <div className="error">{errorH}</div> : null}

          {buscadoH && historial.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
              <strong>Sin pedidos registrados</strong>
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>No encontramos pedidos con ese número de teléfono.</p>
            </div>
          ) : null}

          {historial.map((pedido) => {
            const est = ESTADO[pedido.estado] || { label: pedido.estado, bg: '#f3f4f6', color: '#6b7280' }
            return (
              <article key={pedido.id} className="card grid" style={{ gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontFamily: 'monospace', letterSpacing: 1, fontSize: 14 }}>{pedido.id.slice(0, 8).toUpperCase()}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {new Date(pedido.created_at).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {pedido.horario ? ` · ${pedido.horario}` : ''}
                    </div>
                  </div>
                  <span style={{ background: est.bg, color: est.color, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{est.label}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--mall-muted)' }}>
                  {(pedido.detalle_pedidos || []).map((d) => `${d.nombre_producto} ×${d.cantidad}`).join(', ')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, borderTop: '1px solid var(--mall-line)', paddingTop: 8 }}>
                  <span>Total</span><span className="price">{money(pedido.monto_total)}</span>
                </div>
              </article>
            )
          })}
        </>
      ) : null}
    </div>
  )
}
