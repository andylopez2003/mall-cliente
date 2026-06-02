import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../supabase.js'
import { addDays, money } from '../utils/format.js'

export default function MisCupones() {
  const [telefono, setTelefono] = useState('')
  const [cliente, setCliente] = useState(null)
  const [cupones, setCupones] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function buscar(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { data: clienteData, error: clienteError } = await supabase
      .from('usuarios')
      .select('id,nombre,telefono')
      .eq('telefono', telefono.trim())
      .maybeSingle()

    if (clienteError) {
      setError(clienteError.message)
      setLoading(false)
      return
    }

    if (!clienteData) {
      setCliente(null)
      setCupones([])
      setError('No encontramos un cliente con ese telefono.')
      setLoading(false)
      return
    }

    const { data: cuponData, error: cuponError } = await supabase
      .from('cupones')
      .select('*')
      .eq('cliente_id', clienteData.id)
      .order('fecha_emision', { ascending: false })

    if (cuponError) setError(cuponError.message)
    setCliente(clienteData)
    setCupones(cuponData || [])
    setLoading(false)
  }

  const grouped = useMemo(() => {
    return {
      activos: cupones.filter((cupon) => cupon.estado === 'activo' && new Date(cupon.fecha_vencimiento) >= new Date()),
      canjeados: cupones.filter((cupon) => cupon.estado === 'canjeado'),
      vencidos: cupones.filter((cupon) => cupon.estado === 'vencido' || new Date(cupon.fecha_vencimiento) < new Date()),
    }
  }, [cupones])

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h1 className="page-title">Mis cupones</h1>
      <form className="card grid" onSubmit={buscar}>
        <input className="input-field" placeholder="Ingresa tu telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <button className="btn-primary" type="submit">Buscar</button>
      </form>

      {loading ? <div className="card">Buscando cupones...</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {cliente ? (
        <section className="card grid">
          <strong>{cliente.nombre}</strong>
          <div className="grid" style={{ gap: 10 }}>
            <h2 className="font-display" style={{ margin: 0 }}>Cupones activos</h2>
            {grouped.activos.length === 0 ? <div className="muted">Aun no tienes cupones activos.</div> : null}
            {grouped.activos.map((cupon) => (
              <article key={cupon.id} className="card coupon-card" style={{ background: '#f6fff9' }}>
                <div className="qr-box">
                  <QRCodeSVG value={cupon.codigo} size={180} />
                  <code style={{ fontSize: 18, letterSpacing: 1 }}>{cupon.codigo}</code>
                  <div className="price">{money(cupon.valor)}</div>
                  <div className="muted">Vence el {new Date(cupon.fecha_vencimiento).toLocaleDateString()}</div>
                  <div className="badge-green">Muestra este QR en tienda para canjear</div>
                </div>
              </article>
            ))}
          </div>

          <div className="grid">
            <h2 className="font-display" style={{ margin: 0 }}>Canjeados</h2>
            {grouped.canjeados.length === 0 ? <div className="muted">No tienes cupones canjeados.</div> : null}
            {grouped.canjeados.map((cupon) => (
              <div key={cupon.id} className="card muted">
                {cupon.codigo} - {cupon.descripcion_canje || 'Canjeado en tienda'}
              </div>
            ))}
          </div>

          <div className="grid">
            <h2 className="font-display" style={{ margin: 0 }}>Vencidos</h2>
            {grouped.vencidos.length === 0 ? <div className="muted">Sin cupones vencidos.</div> : null}
            {grouped.vencidos.map((cupon) => (
              <div key={cupon.id} className="card muted" style={{ opacity: 0.65 }}>
                {cupon.codigo} - Vencio el {new Date(cupon.fecha_vencimiento).toLocaleDateString()}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
