import { NavLink } from 'react-router-dom'
import { Home, ShoppingCart, Ticket } from 'lucide-react'
import { useCart } from '../context/CarritoContext.jsx'

const links = [
  { to: '/', label: 'Catalogo', icon: Home },
  { to: '/mis-cupones', label: 'Cupones', icon: Ticket },
  { to: '/carrito', label: 'Carrito', icon: ShoppingCart },
]

export default function Navbar({ children }) {
  const { totalItems } = useCart()

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1.6, opacity: .8 }}>MALL</div>
            <strong style={{ fontSize: 18 }}>Cliente</strong>
          </div>
        </div>
        <div className="header-actions">
          <span className="badge-yellow">Carrito {totalItems}</span>
        </div>
      </header>
      <main className="content">{children}</main>
      <nav className="bottom-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={18} />
            <span>{label}</span>
            {label === 'Carrito' && totalItems > 0 ? <strong style={{ color: 'var(--mall-accent)' }}>{totalItems}</strong> : null}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
