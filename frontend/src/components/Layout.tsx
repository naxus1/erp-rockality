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
    <div className="min-h-screen flex bg-[#e0e5ec]">
      {/* Sidebar — dark neumorphic */}
      <aside className="w-56 bg-[#2d3748] flex flex-col shadow-xl">
        <div className="p-5 border-b border-gray-700/50">
          <h1 className="text-base font-bold text-white tracking-wide">Rockality</h1>
          <p className="text-[10px] text-gray-400 mt-0.5">ERP Gimnasio</p>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-gray-900/60 text-white shadow-inner'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700/50">
          <p className="text-xs text-gray-300 font-medium">{user?.nombre}</p>
          <p className="text-[10px] text-gray-500 capitalize mb-2">{user?.rol}</p>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
