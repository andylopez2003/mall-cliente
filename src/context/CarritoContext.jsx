import { createContext, useContext, useMemo, useState } from 'react'

const CarritoContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

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
    setItems((current) =>
      current
        .map((item) =>
          item.producto_id === productoId ? { ...item, cantidad } : item,
        )
        .filter((item) => item.cantidad > 0),
    )
  }

  function limpiarCarrito() {
    setItems([])
  }

  const value = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0)
    const totalMonto = items.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 0), 0)

    return {
      items,
      agregarItem,
      quitarItem,
      cambiarCantidad,
      limpiarCarrito,
      totalItems,
      totalMonto,
    }
  }, [items])

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>
}

export function useCart() {
  return useContext(CarritoContext)
}
