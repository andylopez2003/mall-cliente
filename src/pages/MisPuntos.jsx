import { useState } from 'react'
import { Search, Star } from 'lucide-react'
import { supabase } from '../supabase.js'
import { money } from '../utils/format.js'

export default function MisPuntos() {
  const [dpi, setDpi] = useState('')
  const [cliente, setCliente] = useState(null)
  const [puntos, setPuntos] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function buscar(e) {
    e.preventDefault()
    if (!dpi.trim()) return
    setLoading(true)
    setError('')
    setCliente(null)
    setPuntos(null)

    const { data: clienteData, error: clienteError } = await supabase
      .from('usuarios')
      .select('id, nombre, dpi')
      .eq('dpi', dpi.trim())
      .eq('rol', 'cliente')
      .maybeSingle()

    if (clienteError) { setError(clienteError.message); setLoading(false); return }
    if (!clienteData) {
      setError('No encontramos un cliente con ese DPI. Debes haber realizado al menos una compra en tienda para tener puntos.')
      setLoading(false)
      return
    }

    const { data: puntosData, error: puntosError } = await supabase
      .from('puntos')
      .select('saldo, total_ganado, total_canjeado')
      .eq('cliente_id', clienteData.id)
      .maybeSingle()

    if (puntosError) { setError(puntosError.message); setLoading(false); return }

    setCliente(clienteData)
    setPuntos(puntosData || { saldo: 0, total_ganado: 0, total_canjeado: 0 })
    setLoading(false)
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section style={{ background: 'linear-gradient(135deg, var(--mall-dark), var(--mall-main))', borderRadius: 12, padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 14, color: 'white' }}>
        <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,.2)', borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Star size={28} />
        </div>
        <div>
          <h1 className="page-title" style={{ margin: 0, color: 'white', fontSize: 26 }}>Mis Puntos</h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.82)', fontSize: 13 }}>
            Consulta tu saldo de puntos acumulados en tienda
          </p>
        </div>
      </section>

      <div className="card" style={{ background: '#fffdf0', border: '1px solid #f5e08a', padding: 14 }}>
        <strong style={{ fontSize: 13 }}>¿Cómo funcionan los puntos?</strong>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
          Ganas puntos en cada compra en tienda. <strong>1 punto = Q1</strong> de descuento que puedes usar en tu próxima compra.
          Para consultar tu saldo necesitas el DPI que registraste en tienda.
        </p>
      </div>

      <form className="card grid" style={{ gap: 10 }} onSubmit={buscar}>
        <label style={{ fontWeight: 700, fontSize: 14 }}>Ingresa tu número de DPI</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input-field"
            placeholder="Tu DPI"
            value={dpi}
            onChange={(e) => { setDpi(e.target.value); setError('') }}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" type="submit" style={{ flexShrink: 0, padding: '0 16px' }}>
            <Search size={17} />
          </button>
        </div>
      </form>

      {loading ? <div className="card muted" style={{ textAlign: 'center', padding: 20 }}>Consultando...</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {cliente && puntos !== null ? (
        <div className="grid" style={{ gap: 12 }}>
          <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong>{cliente.nombre}</strong>
            <span className="badge-green">Cliente registrado</span>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--mall-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Puntos disponibles
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, color: 'var(--mall-main)', lineHeight: 1, marginBottom: 6 }}>
              {puntos.saldo}
            </div>
            <div style={{ fontSize: 16, color: 'var(--mall-muted)' }}>
              = <strong style={{ color: 'var(--mall-dark)' }}>{money(puntos.saldo)}</strong> de descuento disponible
            </div>
          </div>

          <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'center', padding: 14 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--mall-text)' }}>{puntos.total_ganado}</div>
              <div className="muted" style={{ fontSize: 12 }}>Total ganados</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--mall-text)' }}>{puntos.total_canjeado}</div>
              <div className="muted" style={{ fontSize: 12 }}>Total canjeados</div>
            </div>
          </div>

          {puntos.saldo === 0 ? (
            <p className="muted" style={{ textAlign: 'center', fontSize: 13, margin: 0 }}>
              Aún no tienes puntos disponibles. ¡Realiza compras en tienda para acumular!
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
