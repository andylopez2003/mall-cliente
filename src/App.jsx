import { Navigate, Route, Routes } from 'react-router-dom'
import { CartProvider } from './context/CarritoContext.jsx'
import Navbar from './components/Navbar.jsx'
import Catalogo from './pages/Catalogo.jsx'
import ProductoDetalle from './pages/ProductoDetalle.jsx'
import Carrito from './pages/Carrito.jsx'
import HacerPedido from './pages/HacerPedido.jsx'
import ConfirmacionPedido from './pages/ConfirmacionPedido.jsx'
import MisCupones from './pages/MisCupones.jsx'
import MiPedido from './pages/MiPedido.jsx'

export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/"                    element={<Navbar><Catalogo /></Navbar>} />
        <Route path="/producto/:id"        element={<Navbar><ProductoDetalle /></Navbar>} />
        <Route path="/carrito"             element={<Navbar><Carrito /></Navbar>} />
        <Route path="/pedido"              element={<Navbar><HacerPedido /></Navbar>} />
        <Route path="/pedido/confirmacion" element={<Navbar><ConfirmacionPedido /></Navbar>} />
        <Route path="/mis-cupones"         element={<Navbar><MisCupones /></Navbar>} />
        <Route path="/mi-pedido"           element={<Navbar><MiPedido /></Navbar>} />
        <Route path="*"                    element={<Navigate to="/" replace />} />
      </Routes>
    </CartProvider>
  )
}
