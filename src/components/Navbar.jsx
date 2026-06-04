import { NavLink } from 'react-router-dom'
import { Home, Package, ShoppingCart, Ticket } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'

const links = [
  { to: '/',           label: 'Inicio',   icon: Home },
  { to: '/mis-cupones', label: 'Cupones',  icon: Ticket },
  { to: '/carrito',    label: 'Carrito',  icon: ShoppingCart },
  { to: '/mi-pedido',  label: 'Mi Pedido', icon: Package },
]

export default function Navbar({ children }) {
  const { totalItems } = useCart()

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.4, opacity: .75 }}>MALL</div>
            <strong style={{ fontSize: 17 }}>Cliente</strong>
          </div>
        </div>
        {totalItems > 0 ? (
          <span className="badge-yellow">🛒 {totalItems}</span>
        ) : null}
      </header>

      <main className="content">{children}</main>

      <nav className="bottom-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''} end={to === '/'}>
            <div style={{ position: 'relative' }}>
              <Icon size={20} />
              {label === 'Carrito' && totalItems > 0 ? (
                <span style={{
                  position: 'absolute', top: -6, right: -8,
                  background: 'var(--mall-accent)', color: 'var(--mall-text)',
                  borderRadius: '999px', fontSize: 9, fontWeight: 900,
                  padding: '1px 5px', lineHeight: 1.6,
                }}>
                  {totalItems}
                </span>
              ) : null}
            </div>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
