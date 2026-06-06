import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Edit2, Phone, Search } from 'lucide-react'
import { supabase } from '../supabase.js'
import { money } from '../utils/format.js'

const ESTADO = {
  pendiente:  { label: 'Pendiente',  cls: 'badge-yellow' },
  confirmado: { label: 'Confirmado', cls: 'badge-green'  },
  preparando: { label: 'Preparando', cls: 'badge-green'  },
  en_camino:  { label: 'En camino',  cls: 'badge-green'  },
}

export default function MiPedido() {
  const location = useLocation?.() || {}
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
      .filter('id::text', 'ilike', `${num.toLowerCase()}%`)
      .in('estado', ['pendiente', 'confirmado', 'preparando', 'en_camino'])
      .order('created_at', { ascending: false })

    if (err) { setError(err.message); setLoading(false); return }
    setPedidos(data || [])
    setBuscado(true)
    setLoading(false)
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
    const { error: err } = await supabase
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('id', pedidoId)
      .eq('estado', 'pendiente')

    if (err) {
      setError('No se pudo cancelar el pedido. Si necesitas cancelarlo contáctanos por WhatsApp.')
    } else {
      setPedidos((current) => current.filter((p) => p.id !== pedidoId))
      setSaveMsg('Pedido cancelado correctamente.')
      window.setTimeout(() => setSaveMsg(''), 4000)
    }
    setCancelando(null)
  }

  async function guardar(pedidoId) {
    if (!editDireccion.trim()) { setError('La dirección no puede estar vacía.'); return }
    setSaving(true)
    setError('')

    const { error: err } = await supabase
      .from('pedidos')
      .update({ direccion_entrega: editDireccion.trim(), telefono_contacto: editTelefono.trim() })
      .eq('id', pedidoId)

    if (err) { setError(err.message); setSaving(false); return }

    setPedidos((current) =>
      current.map((p) =>
        p.id === pedidoId
          ? { ...p, direccion_entrega: editDireccion.trim(), telefono_contacto: editTelefono.trim() }
          : p,
      ),
    )
    setEditandoId(null)
    setSaving(false)
    setSaveMsg('Datos actualizados correctamente.')
    window.setTimeout(() => setSaveMsg(''), 3000)
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h1 className="page-title">Mi Pedido</h1>
      <p className="page-subtitle" style={{ marginBottom: 0 }}>
        Ingresa tu número de pedido para ver el estado de tu entrega.
      </p>

      <div className="card" style={{ background: '#fffdf0', border: '1px solid #f5e08a', padding: 14, fontSize: 13 }}>
        <strong>¿Dónde encuentro mi número de pedido?</strong>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Al confirmar tu pedido se te mostró un número de 8 caracteres (ej: <strong style={{ fontFamily: 'monospace' }}>A1B2C3D4</strong>). Ingrésalo aquí para ver tu estado.
        </p>
      </div>

      <form className="card grid" style={{ gap: 10 }} onSubmit={buscar}>
        <label style={{ fontWeight: 700, fontSize: 14 }}>Número de pedido</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input-field"
            placeholder="Ej: A1B2C3D4"
            value={numeroPedido}
            onChange={(e) => setNumeroPedido(e.target.value.toUpperCase())}
            style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }}
            maxLength={8}
          />
          <button className="btn-primary" type="submit" style={{ flexShrink: 0, padding: '0 16px' }}>
            <Search size={17} />
          </button>
        </div>
      </form>

      {loading ? <div className="card muted" style={{ textAlign: 'center', padding: 20 }}>Buscando pedido...</div> : null}
      {error ? <div className="error">{error}</div> : null}
      {saveMsg ? <div className="success">{saveMsg}</div> : null}

      {buscado && pedidos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🔍</div>
          <strong>No encontramos ese pedido</strong>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            Verifica el número e inténtalo de nuevo. Solo se muestran pedidos activos (no entregados).
          </p>
        </div>
      ) : null}

      {pedidos.map((pedido) => {
        const estado = ESTADO[pedido.estado] || { label: pedido.estado, cls: 'badge-gray' }
        const isEditing = editandoId === pedido.id

        return (
          <article key={pedido.id} className="card grid" style={{ gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--mall-muted)' }}>N° de pedido</div>
                <strong style={{ fontSize: 15, fontFamily: 'monospace', letterSpacing: 1 }}>{pedido.id.slice(0, 8).toUpperCase()}</strong>
              </div>
              <span className={estado.cls}>{estado.label}</span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--mall-muted)' }}>
              {new Date(pedido.created_at).toLocaleDateString('es-GT', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
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
                <span>Total pagado</span>
                <span className="price">{money(pedido.monto_total)}</span>
              </div>
            </div>

            {!isEditing ? (
              <div className="grid" style={{ gap: 8, fontSize: 14 }}>
                <div><span className="muted">Entrega: </span><strong>{pedido.horario || pedido.hora_entrega_asignada || '—'}</strong></div>
                <div><span className="muted">Dirección: </span>{pedido.direccion_entrega}</div>
                <div><span className="muted">Teléfono: </span>{pedido.telefono_contacto || '—'}</div>
                {pedido.estado === 'pendiente' ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    <button className="btn-outline" type="button" onClick={() => iniciarEdicion(pedido)} style={{ flex: 1 }}>
                      <Edit2 size={14} /> Editar datos
                    </button>
                    <button
                      className="btn-danger"
                      type="button"
                      onClick={() => cancelarPedido(pedido.id)}
                      disabled={cancelando === pedido.id}
                      style={{ flex: 1, fontSize: 13 }}
                    >
                      {cancelando === pedido.id ? 'Cancelando...' : 'Cancelar pedido'}
                    </button>
                  </div>
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                    Solo puedes editar o cancelar pedidos en estado Pendiente.
                  </p>
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
    </div>
  )
}
