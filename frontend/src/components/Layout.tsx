import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', roles: ['admin', 'gerente', 'vendedor'] },
  { to: '/clientes', label: 'Clientes', roles: ['admin', 'vendedor'] },
  { to: '/productos', label: 'Productos', roles: ['admin'] },
  { to: '/ventas', label: 'Ventas', roles: ['admin', 'vendedor'] },
  { to: '/planes', label: 'Planes', roles: ['admin'] },
  { to: '/gastos', label: 'Gastos', roles: ['admin'] },
  { to: '/compras', label: 'Compras', roles: ['admin', 'vendedor'] },
  { to: '/gastos/nuevo', label: 'Registrar factura', roles: ['vendedor'] },
  { to: '/terceros', label: 'Terceros', roles: ['admin'] },
  { to: '/reportes', label: 'Reportes', roles: ['admin', 'gerente'] },
  { to: '/catalogos', label: 'Catálogos', roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.rol));

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-sm font-bold text-white">ERP Rockality</h1>
        </div>

        <nav className="flex-1 py-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm ${isActive ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-1">{user?.nombre}</p>
          <p className="text-xs text-gray-500 mb-2">{user?.rol}</p>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
