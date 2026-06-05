import { supabase } from '../supabase.js'

const DEFAULT_SLOTS = ['13:00', '13:20', '13:40', '14:00', '14:20', '14:40', '17:00', '17:20', '17:40', '18:00', '18:20', '18:40']

function expandRange(range) {
  const parts = range.split('-')
  if (parts.length < 2) return [range]
  const [sh, sm] = parts[0].split(':').map(Number)
  const [eh, em] = parts[1].split(':').map(Number)
  const startMin = sh * 60 + (sm || 0)
  const endMin   = eh * 60 + (em || 0)
  const slots = []
  for (let t = startMin; t < endMin; t += 20) {
    slots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`)
  }
  return slots.length > 0 ? slots : [range]
}

function parseSlots(value) {
  if (!value) return DEFAULT_SLOTS
  let arr = value
  if (typeof value === 'string') {
    try { arr = JSON.parse(value) } catch { return DEFAULT_SLOTS }
  }
  if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_SLOTS
  const expanded = arr.flatMap((s) =>
    typeof s === 'string' && s.includes('-') && s.length > 5 ? expandRange(s) : [s],
  )
  return expanded.length > 0 ? expanded : DEFAULT_SLOTS
}

export function usePedidos() {
  function parseUmbrales(val) {
    try {
      const arr = typeof val === 'string' ? JSON.parse(val) : val
      if (Array.isArray(arr) && arr.length > 0)
        return arr.map((e) => Array.isArray(e) ? e : [e.monto, e.valor]).sort((a, b) => a[0] - b[0])
    } catch (_) {}
    return [[150, 10]]
  }

  async function getConfiguracion() {
    const { data, error } = await supabase.from('configuracion').select('clave, valor')
    if (error) throw error
    const config = Object.fromEntries((data || []).map((item) => [item.clave, item.valor]))
    return {
      monto_minimo_domicilio: Number(config.monto_minimo_domicilio || 20),
      monto_cupon_domicilio:  Number(config.monto_cupon_domicilio  || 150),
      valor_cupon_domicilio:  Number(config.valor_cupon_domicilio  || 10),
      dias_vencimiento_cupon: Number(config.dias_vencimiento_cupon || 14),
      max_pedidos_manana:     Number(config.max_pedidos_manana     || 6),
      max_pedidos_tarde:      Number(config.max_pedidos_tarde      || 6),
      slots_entrega:          parseSlots(config.slots_entrega),
      umbrales_cupones:       parseUmbrales(config.umbrales_cupones_domicilio),
    }
  }

  async function slotsConDisponibilidad(fecha = null) {
    const config = await getConfiguracion()
    const hoy = new Date().toISOString().slice(0, 10)
    const targetDate = fecha || hoy

    // Pedidos asignados a esta fecha (via campo fecha_entrega)
    let pedidosData = []
    const { data: byFecha } = await supabase
      .from('pedidos')
      .select('horario, hora_entrega_asignada')
      .eq('fecha_entrega', targetDate)
      .neq('estado', 'cancelado')
    if (byFecha) pedidosData = [...byFecha]

    // Para hoy: también incluir pedidos sin fecha_entrega (creados antes de la migración)
    if (targetDate === hoy) {
      const { data: byCreated } = await supabase
        .from('pedidos')
        .select('horario, hora_entrega_asignada')
        .gte('created_at', `${hoy}T00:00:00`)
        .lte('created_at', `${hoy}T23:59:59`)
        .is('fecha_entrega', null)
        .neq('estado', 'cancelado')
      if (byCreated) pedidosData = [...pedidosData, ...byCreated]
    }

    const counts = pedidosData.reduce((acc, p) => {
      const slot = String(p.hora_entrega_asignada || p.horario || '').slice(0, 5)
      if (slot) acc[slot] = (acc[slot] || 0) + 1
      return acc
    }, {})

    const all = config.slots_entrega
    function buildJornada(nombre, rango, slots) {
      // Cada turno de 20 min admite máximo 1 pedido
      const info = slots.map((hora) => ({
        hora,
        disponible: (counts[hora] || 0) === 0,
      }))
      return { nombre, rango, slots: info, disponibles: info.filter((s) => s.disponible).length }
    }
    return [
      buildJornada('Mañana', '13:00 – 15:00', all.filter((s) => Number(s.slice(0, 2)) < 15)),
      buildJornada('Tarde',  '17:00 – 19:00', all.filter((s) => Number(s.slice(0, 2)) >= 15)),
    ]
  }

  async function crearPedido(payload) {
    const config = await getConfiguracion()
    const totalBruto = Number(payload.monto_total || 0)

    // ⚠️ cuponIds DEBE declararse ANTES de descuentoCupon para evitar TDZ
    const cuponIds      = Array.isArray(payload.cuponIds) ? payload.cuponIds : (payload.cuponId ? [payload.cuponId] : [])
    const descuentoCupon = cuponIds.length > 0 ? Number(payload.descuento_cupones || payload.descuento_cupon || 0) : 0
    const totalFinal    = Math.max(totalBruto - descuentoCupon, 0)

    // Determinar si califica para cupón según niveles configurados
    const umbrales   = config.umbrales_cupones || [[config.monto_cupon_domicilio || 150, config.valor_cupon_domicilio || 10]]
    const nivelCupon = umbrales.reduce((acc, [minVal, cuponVal]) => totalBruto >= minVal ? cuponVal : acc, 0)
    const generaCupon = Boolean(payload.cliente_id) && nivelCupon > 0

    // ── PASO 1: Marcar todos los cupones como canjeados ──────────────────────
    for (const cuponId of cuponIds) {
      const { data: resultado, error: cuponError } = await supabase
        .from('cupones')
        .update({ estado: 'canjeado', fecha_canje: new Date().toISOString() })
        .eq('id', cuponId)
        .eq('estado', 'activo')
        .select('id')

      if (cuponError) throw new Error('Error al procesar el cupón. Intenta de nuevo.')
      if (!resultado || resultado.length === 0) {
        throw new Error('El cupón ya fue utilizado o no está disponible. Por favor quítalo e intenta de nuevo.')
      }
    }

    // ── PASO 2: Crear el pedido ──────────────────────────────────────────────
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: payload.cliente_id || null,
        direccion_entrega: payload.direccion_entrega,
        latitud: payload.latitud || null,
        longitud: payload.longitud || null,
        horario: payload.horario,
        hora_entrega_asignada: payload.hora_entrega_asignada,
        fecha_entrega: payload.fecha_entrega || new Date().toISOString().slice(0, 10),
        monto_total: totalFinal,
        estado: 'pendiente',
        genera_cupon: generaCupon,
        telefono_contacto: payload.telefono_contacto || null,
      })
      .select()
      .single()

    if (pedidoError) throw pedidoError

    // ── PASO 3: Insertar detalle del pedido ──────────────────────────────────
    const detalle = payload.items.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.producto_id,
      nombre_producto: item.nombre_producto,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      subtotal: Number(item.precio) * Number(item.cantidad),
    }))
    const { error: detalleError } = await supabase.from('detalle_pedidos').insert(detalle)
    if (detalleError) throw detalleError

    return { pedido, generaCupon }
  }

  return { slotsConDisponibilidad, crearPedido, getConfiguracion }
}
