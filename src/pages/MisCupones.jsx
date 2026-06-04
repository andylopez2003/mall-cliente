import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Search, Ticket } from 'lucide-react'
import { supabase } from '../supabase.js'
import { money } from '../utils/format.js'

export default function MisCupones() {
  const [telefono, setTelefono] = useState('')
  const [cliente, setCliente] = useState(null)
  const [cupones, setCupones] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function buscar(event) {
    event.preventDefault()
    if (!telefono.trim()) return
    setLoading(true)
    setError('')

    const { data: clienteData, error: clienteError } = await supabase
      .from('usuarios')
      .select('id,nombre,telefono')
      .eq('telefono', telefono.trim())
      .maybeSingle()

    if (clienteError) { setError(clienteError.message); setLoading(false); return }

    if (!clienteData) {
      setCliente(null)
      setCupones([])
      setError('No encontramos un cliente con ese teléfono.')
      setLoading(false)
      return
    }

    const { data: cuponData, error: cuponError } = await supabase
      .from('cupones')
      .select('*')
      .eq('cliente_id', clienteData.id)
      .eq('estado', 'activo')
      .gte('fecha_vencimiento', new Date().toISOString())
      .order('fecha_emision', { ascending: false })

    if (cuponError) setError(cuponError.message)
    setCliente(clienteData)
    setCupones(cuponData || [])
    setLoading(false)
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="coupon-hero">
        <div className="coupon-hero-icon"><Ticket size={28} /></div>
        <div>
          <h1 className="page-title" style={{ margin: 0, color: 'white', fontSize: 26 }}>Mis Cupones</h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.82)', fontSize: 13 }}>
            Descuentos activos listos para canjear en tienda
          </p>
        </div>
      </section>

      <div className="card" style={{ background: '#fffdf0', border: '1px solid #f5e08a', padding: 14 }}>
        <strong style={{ fontSize: 13 }}>¿Cómo funciono?</strong>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
          En pedidos de <strong>Q150 o más</strong> ganas un cupón de <strong>Q10</strong>.
          Puedes usarlo inmediatamente en el mismo pedido o guardarlo para canjear presencialmente en tienda mostrando tu código QR.
        </p>
      </div>

      <form className="card" style={{ display: 'flex', gap: 8, padding: 12 }} onSubmit={buscar}>
        <input
          className="input-field"
          placeholder="Tu número de teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn-primary" type="submit" style={{ flexShrink: 0, padding: '0 16px' }}>
          <Search size={17} />
        </button>
      </form>

      {loading ? <div className="card muted" style={{ textAlign: 'center', padding: 20 }}>Buscando...</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {cliente ? (
        <div className="grid" style={{ gap: 14 }}>
          <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong>{cliente.nombre}</strong>
            <span className="badge-green">{cupones.length} cupón{cupones.length !== 1 ? 'es' : ''} activo{cupones.length !== 1 ? 's' : ''}</span>
          </div>

          {cupones.length > 0 ? (
            <div className="grid" style={{ gap: 12 }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: 18 }}>Listos para canjear</h2>
              {cupones.map((cupon) => (
                <article key={cupon.id} className="coupon-card-active">
                  <div className="coupon-card-header">
                    <Ticket size={17} />
                    <strong style={{ flex: 1 }}>Cupón de descuento</strong>
                    <span className="badge-green">Activo</span>
                  </div>
                  <div className="coupon-qr-section">
                    <QRCodeSVG value={cupon.codigo} size={190} />
                    <code className="coupon-code">{cupon.codigo}</code>
                    <div className="coupon-value">{money(cupon.valor)}</div>
                    <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                      Vence el {new Date(cupon.fecha_vencimiento).toLocaleDateString('es-GT')}
                    </p>
                  </div>
                  <div className="coupon-footer">
                    <Ticket size={14} /> Muestra este QR en tienda para canjear tu descuento
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🎟️</div>
              <strong>No tienes cupones activos</strong>
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                Haz un pedido de Q150 o más para ganar tu próximo cupón de Q10.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
