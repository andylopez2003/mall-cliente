import { supabase } from '../supabase.js'

const DEFAULT_SLOTS = ['13:00', '13:20', '13:40', '14:00', '14:20', '14:40', '17:00', '17:20', '17:40', '18:00', '18:20', '18:40']

function parseSlots(value) {
  if (!value) return DEFAULT_SLOTS
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch { return DEFAULT_SLOTS }
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
      monto_cupon_domicilio:  Number(config.monto_cupon_domicilio  || 150),
      valor_cupon_domicilio:  Number(config.valor_cupon_domicilio  || 10),
      dias_vencimiento_cupon: Number(config.dias_vencimiento_cupon || 14),
      max_pedidos_manana:     Number(config.max_pedidos_manana     || 6),
      max_pedidos_tarde:      Number(config.max_pedidos_tarde      || 6),
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

    const counts = (pedidosHoy || []).reduce((acc, p) => {
      const slot = String(p.hora_entrega_asignada || p.horario || '').slice(0, 5)
      if (slot) acc[slot] = (acc[slot] || 0) + 1
      return acc
    }, {})

    const all = config.slots_entrega
    function buildJornada(nombre, rango, slots) {
      const info = slots.map((hora) => {
        const max = Number(hora.slice(0, 2)) < 15 ? config.max_pedidos_manana : config.max_pedidos_tarde
        return { hora, disponible: (counts[hora] || 0) < max }
      })
      return { nombre, rango, slots: info, disponibles: info.filter((s) => s.disponible).length }
    }
    return [
      buildJornada('Mañana', '13:00 – 15:00', all.filter((s) => Number(s.slice(0, 2)) < 15)),
      buildJornada('Tarde',  '17:00 – 19:00', all.filter((s) => Number(s.slice(0, 2)) >= 15)),
    ]
  }

  async function crearPedido(payload) {
    const config = await getConfiguracion()
    const totalBruto     = Number(payload.monto_total || 0)
    const descuentoCupon = payload.cuponId ? Number(payload.descuento_cupon || 0) : 0
    const totalFinal     = Math.max(totalBruto - descuentoCupon, 0)
    const generaCupon    = Boolean(payload.cliente_id) && totalBruto >= config.monto_cupon_domicilio

    // ── PASO 1: Marcar el cupón como canjeado ANTES de crear el pedido ──
    // Si falla (cupón ya canjeado o no existe), se lanza error y no se crea nada.
    if (payload.cuponId) {
      const { data: resultado, error: cuponError } = await supabase
        .from('cupones')
        .update({ estado: 'canjeado', fecha_canje: new Date().toISOString() })
        .eq('id', payload.cuponId)
        .eq('estado', 'activo')   // solo funciona si aún está activo
        .select('id')

      if (cuponError) {
        throw new Error('Error al procesar el cupón. Intenta de nuevo.')
      }
      if (!resultado || resultado.length === 0) {
        throw new Error('Este cupón ya fue utilizado o ya no está disponible. Por favor quítalo e intenta sin él.')
      }
    }

    // ── PASO 2: Crear el pedido ──
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: payload.cliente_id || null,
        direccion_entrega: payload.direccion_entrega,
        latitud: payload.latitud || null,
        longitud: payload.longitud || null,
        horario: payload.horario,
        hora_entrega_asignada: payload.hora_entrega_asignada,
        monto_total: totalFinal,
        estado: 'pendiente',
        genera_cupon: generaCupon,
        telefono_contacto: payload.telefono_contacto || null,
        cupon_canjeado_id: payload.cuponId || null,
      })
      .select()
      .single()

    if (pedidoError) {
      // Si el pedido falla, intentar restaurar el cupón
      if (payload.cuponId) {
        await supabase
          .from('cupones')
          .update({ estado: 'activo', fecha_canje: null })
          .eq('id', payload.cuponId)
      }
      throw pedidoError
    }

    // ── PASO 3: Insertar detalle del pedido ──
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
