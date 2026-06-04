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
  const [cuponAplicado, setCuponAplicado] = useState(null)

  // Guardar en localStorage cada vez que cambie el carrito
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
    setCuponAplicado(null)
    guardarStorage([])
  }

  function aplicarCupon(cupon) {
    setCuponAplicado(cupon)
  }

  function quitarCupon() {
    setCuponAplicado(null)
  }

  const value = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0)
    const totalMonto = items.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 0), 0)
    const descuentoCupon = cuponAplicado ? Number(cuponAplicado.valor || 0) : 0
    const totalConDescuento = Math.max(totalMonto - descuentoCupon, 0)

    return {
      items,
      agregarItem,
      quitarItem,
      cambiarCantidad,
      limpiarCarrito,
      aplicarCupon,
      quitarCupon,
      cuponAplicado,
      totalItems,
      totalMonto,
      totalConDescuento,
    }
  }, [items, cuponAplicado])

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>
}

export function useCart() {
  return useContext(CarritoContext)
}
