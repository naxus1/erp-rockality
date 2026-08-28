import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="w-[18px] h-[18px] shrink-0"
    >
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  dashboard: 'M3 13h4V3H3v10Zm0 8h4v-6H3v6Zm6 0h4V9H9v12Zm6 0h4V3h-4v18Z',
  clientes:
    'M17 20h5v-1.5a4.5 4.5 0 0 0-6.35-4.1M17 20H7m10 0v-1.5a6.5 6.5 0 0 0-13 0V20m6-11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  productos: 'M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  ventas:
    'M3 3h2l2.4 12.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6M9 20a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01',
  planes:
    'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m-5 8 2 2 4-4',
  gastos: 'M12 8v8m-3-5h6M5 21h14a2 2 0 0 0 2-2V8.5L15.5 3H7a2 2 0 0 0-2 2v3M5 12v7a2 2 0 0 0 2 2',
  caja: 'M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 0 2-3h14l2 3M16 12h.01',
  compras: 'M6 6h15l-1.5 9h-12L6 6Zm0 0-1-3H2m7 18a1 1 0 1 0 0 .01m9 0a1 1 0 1 0 0-.01',
  factura: 'M7 3h10l3 3v15H4V6l3-3Zm0 0v4h10V3M8 12h8M8 16h5',
  terceros:
    'M17 20h5v-1.5a4.5 4.5 0 0 0-6.35-4.1M9 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1 20v-1.5A4.5 4.5 0 0 1 5.5 14h1A4.5 4.5 0 0 1 11 18.5V20H1Z',
  reportes: 'M4 19V9m6 10V5m6 14v-6m6 6V3',
  catalogos: 'M4 6h16M4 12h16M4 18h7',
} as const;

const NAV_ITEMS: Array<{ to: string; label: string; roles: string[]; icon: keyof typeof ICONS }> = [
  { to: '/', label: 'Dashboard', roles: ['admin', 'gerente', 'vendedor'], icon: 'dashboard' },
  { to: '/clientes', label: 'Clientes', roles: ['admin', 'vendedor'], icon: 'clientes' },
  { to: '/productos', label: 'Productos', roles: ['admin'], icon: 'productos' },
  { to: '/ventas', label: 'Ventas', roles: ['admin', 'vendedor'], icon: 'ventas' },
  { to: '/planes', label: 'Planes', roles: ['admin'], icon: 'planes' },
  { to: '/gastos', label: 'Gastos', roles: ['admin'], icon: 'gastos' },
  { to: '/caja', label: 'Caja', roles: ['admin'], icon: 'caja' },
  { to: '/compras', label: 'Compras', roles: ['admin', 'vendedor'], icon: 'compras' },
  { to: '/gastos/nuevo', label: 'Registrar factura', roles: ['vendedor'], icon: 'factura' },
  { to: '/terceros', label: 'Terceros', roles: ['admin'], icon: 'terceros' },
  { to: '/reportes', label: 'Reportes', roles: ['admin', 'gerente'], icon: 'reportes' },
  { to: '/catalogos', label: 'Catálogos', roles: ['admin'], icon: 'catalogos' },
];

function initials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cierra el menú mobile al navegar a otra página.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.rol));

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Backdrop del menú mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fija en desktop, drawer deslizable en mobile/tablet */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 flex flex-col shrink-0 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            R
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-white leading-tight">Rockality</h1>
            <p className="text-[11px] text-slate-400 leading-tight">ERP Gimnasio</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            title="Cerrar menú"
            className="lg:hidden text-slate-400 hover:text-white p-1 shrink-0"
          >
            <Icon path="M6 18L18 6M6 6l12 12" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-500/15 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }: { isActive: boolean }): ReactNode => (
                <>
                  <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>
                    <Icon path={ICONS[item.icon]} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center shrink-0">
              {initials(user?.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.nombre}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user?.rol}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-slate-500 hover:text-rose-400 transition-colors p-1"
            >
              <Icon path="M17 16l4-4m0 0-4-4m4 4H7m6 5v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v1" />
            </button>
          </div>
        </div>
      </aside>

      {/* Columna de contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar — solo mobile/tablet */}
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            title="Abrir menú"
            className="text-slate-600 hover:text-slate-900 p-1 -ml-1"
          >
            <Icon path="M4 6h16M4 12h16M4 18h16" />
          </button>
          <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
            R
          </div>
          <h1 className="text-sm font-semibold text-slate-800">Rockality</h1>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
