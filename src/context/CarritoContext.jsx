import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CarritoContext = createContext(null)

const STORAGE_KEY = 'mall_carrito_v1'

function leerStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function guardarStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(leerStorage)
  const [cuponesAplicados, setCuponesAplicados] = useState([])

  useEffect(() => {
    guardarStorage(items)
  }, [items])

  function agregarItem(producto) {
    setItems((current) => {
      const existing = current.find((item) => item.producto_id === producto.producto_id)
      if (existing) {
        return current.map((item) =>
          item.producto_id === producto.producto_id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        )
      }
      return [...current, { ...producto, cantidad: 1 }]
    })
  }

  function quitarItem(productoId) {
    setItems((current) => current.filter((item) => item.producto_id !== productoId))
  }

  function cambiarCantidad(productoId, cantidad) {
    const qty = Number(cantidad)
    if (isNaN(qty)) return
    setItems((current) =>
      current
        .map((item) => item.producto_id === productoId ? { ...item, cantidad: qty } : item)
        .filter((item) => item.cantidad > 0),
    )
  }

  function limpiarCarrito() {
    setItems([])
    setCuponesAplicados([])
    guardarStorage([])
  }

  function aplicarCupon(cupon) {
    setCuponesAplicados((prev) => {
      if (prev.find((c) => c.id === cupon.id)) return prev
      return [...prev, cupon]
    })
  }

  function quitarCupon(cuponId) {
    if (cuponId) {
      setCuponesAplicados((prev) => prev.filter((c) => c.id !== cuponId))
    } else {
      setCuponesAplicados([])
    }
  }

  const value = useMemo(() => {
    const totalItems    = items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0)
    const totalMonto    = items.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 0), 0)
    const descuentoTotal = cuponesAplicados.reduce((sum, c) => sum + Number(c.valor || 0), 0)
    const totalConDescuento = Math.max(totalMonto - descuentoTotal, 0)

    return {
      items,
      agregarItem,
      quitarItem,
      cambiarCantidad,
      limpiarCarrito,
      aplicarCupon,
      quitarCupon,
      cuponesAplicados,
      descuentoTotal,
      totalItems,
      totalMonto,
      totalConDescuento,
    }
  }, [items, cuponesAplicados])

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>
}

export function useCart() {
  return useContext(CarritoContext)
}
