import { supabase } from '../supabase.js'

const DEFAULT_SLOTS = ['13:00', '13:20', '13:40', '14:00', '14:20', '14:40', '17:00', '17:20', '17:40', '18:00', '18:20', '18:40']

function parseSlots(value) {
  if (!value) return DEFAULT_SLOTS
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return DEFAULT_SLOTS
    }
  }
  return DEFAULT_SLOTS
}

export function usePedidos() {
  async function getConfiguracion() {
    const { data, error } = await supabase.from('configuracion').select('clave, valor')
    if (error) throw error
    const config = Object.fromEntries((data || []).map((item) => [item.clave, item.valor]))
    return {
      monto_minimo_domicilio: Number(config.monto_minimo_domicilio || 20),
      monto_cupon_domicilio: Number(config.monto_cupon_domicilio || 150),
      valor_cupon_domicilio: Number(config.valor_cupon_domicilio || 10),
      dias_vencimiento_cupon: Number(config.dias_vencimiento_cupon || 14),
      max_pedidos_manana: Number(config.max_pedidos_manana || 6),
      max_pedidos_tarde: Number(config.max_pedidos_tarde || 6),
      slots_entrega: parseSlots(config.slots_entrega),
    }
  }

  async function slotsConDisponibilidad() {
    const config = await getConfiguracion()
    const hoy = new Date().toISOString().slice(0, 10)

    const { data: pedidosHoy, error } = await supabase
      .from('pedidos')
      .select('horario,hora_entrega_asignada')
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)

    if (error) throw error

    const counts = (pedidosHoy || []).reduce((acc, pedido) => {
      const slot = String(pedido.hora_entrega_asignada || pedido.horario || '').slice(0, 5)
      if (slot) acc[slot] = (acc[slot] || 0) + 1
      return acc
    }, {})

    const todosSlots = config.slots_entrega
    const mananaSlots = todosSlots.filter((s) => Number(s.slice(0, 2)) < 15)
    const tardeSlots  = todosSlots.filter((s) => Number(s.slice(0, 2)) >= 15)

    function buildJornada(nombre, rango, slots) {
      const slotInfo = slots.map((hora) => {
        const max = Number(hora.slice(0, 2)) < 15 ? config.max_pedidos_manana : config.max_pedidos_tarde
        return { hora, disponible: (counts[hora] || 0) < max }
      })
      return { nombre, rango, slots: slotInfo, disponibles: slotInfo.filter((s) => s.disponible).length }
    }

    return [
      buildJornada('Mañana', '13:00 – 15:00', mananaSlots),
      buildJornada('Tarde',  '17:00 – 19:00', tardeSlots),
    ]
  }

  async function crearPedido(payload) {
    const config = await getConfiguracion()
    const total = Number(payload.monto_total || 0)
    const generaCupon = Boolean(payload.cliente_id) && total >= config.monto_cupon_domicilio

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: payload.cliente_id || null,
        direccion_entrega: payload.direccion_entrega,
        latitud: payload.latitud || null,
        longitud: payload.longitud || null,
        horario: payload.horario,
        hora_entrega_asignada: payload.hora_entrega_asignada,
        monto_total: total,
        estado: 'pendiente',
        genera_cupon: generaCupon,
        telefono_contacto: payload.telefono_contacto || null,
      })
      .select()
      .single()

    if (pedidoError) throw pedidoError

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

    return pedido
  }

  return { slotsConDisponibilidad, crearPedido, getConfiguracion }
}
