import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'

const CATEGORIAS = ['Todos', 'Granos', 'Lacteos', 'Bebidas', 'Snacks', 'Limpieza', 'Personal', 'Verduras', 'Carnes', 'Otros']

export function useCatalogo() {
  const [productos, setProductos] = useState([])
  const [ofertas, setOfertas] = useState([])
  const [promociones, setPromociones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError('')

      const hoy = new Date().toISOString().slice(0, 10)
      const [productosRes, ofertasRes, promosRes] = await Promise.all([
        supabase.from('productos').select('*').eq('activo', true).order('nombre'),
        supabase.from('ofertas').select('*, productos(*)').eq('activa', true).gte('fecha_fin', hoy),
        supabase.from('promociones').select('*').eq('activa', true).gte('fecha_fin', hoy),
      ])

      if (!mounted) return
      if (productosRes.error) setError(productosRes.error.message)
      if (ofertasRes.error) setError(ofertasRes.error.message)
      if (promosRes.error) setError(promosRes.error.message)

      setProductos(productosRes.data || [])
      setOfertas(ofertasRes.data || [])
      setPromociones(promosRes.data || [])
      setLoading(false)
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  const ofertaMap = useMemo(() => {
    return ofertas.reduce((acc, oferta) => {
      acc[oferta.producto_id] = oferta
      return acc
    }, {})
  }, [ofertas])

  function validateCart(items) {
    return items.filter((item) => {
      const current = productos.find((producto) => producto.id === item.producto_id)
      return current && current.activo
    })
  }

  return {
    loading,
    error,
    productos,
    ofertas,
    promociones,
    ofertaMap,
    categorias: CATEGORIAS,
    validateCart,
  }
}
