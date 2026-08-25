import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface DashboardData {
  ventas_mes: { total: number; count: number };
  gastos_mes: { total: number; count: number };
  margen: number;
  suscripciones_activas: number;
  suscripciones_por_vencer: number;
  clientes_nuevos_mes: number;
  ventas_pendientes: {
    count: number;
    saldo: number;
    deudores: Array<{ venta_id: number; cliente: string; cedula: string | null; saldo: number }>;
  };
  stock_bajo: number;
  ticket_promedio: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

function formatCOP(centavos: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(centavos / 100);
}

const ACCENTS = {
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  slate: 'bg-slate-100 text-slate-500',
} as const;

function KpiCard({
  label,
  value,
  sub,
  color,
  accent = 'slate',
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  accent?: keyof typeof ACCENTS;
  icon: string;
}) {
  return (
    <div className="p-4 rounded-xl neu-flat flex items-start gap-3">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ACCENTS[accent]}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="w-[18px] h-[18px]"
        >
          <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 mb-1 truncate">{label}</p>
        <p className={`text-xl font-bold ${color || 'text-slate-800'}`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<ApiResponse<DashboardData>>('/reportes/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'));
  }, []);

  if (error)
    return (
      <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 p-3 rounded-lg">
        {error}
      </p>
    );
  if (!data) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Dashboard</h2>
      <p className="text-sm text-slate-500 mb-5">Hola, {user?.nombre}. Resumen del mes actual.</p>

      {/* Alertas */}
      {(data.suscripciones_por_vencer > 0 ||
        data.stock_bajo > 0 ||
        data.ventas_pendientes.count > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {data.suscripciones_por_vencer > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-medium text-amber-800">
                ⚠ {data.suscripciones_por_vencer} suscripción(es) por vencer en 7 días
              </p>
            </div>
          )}
          {data.stock_bajo > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-xs font-medium text-orange-800">
                ⚠ {data.stock_bajo} producto(s) con stock bajo
              </p>
            </div>
          )}
          {data.ventas_pendientes.count > 0 && (
            <div
              className="bg-rose-50 border border-rose-200 rounded-xl p-3 cursor-pointer hover:bg-rose-100 transition-colors"
              onClick={() => navigate('/ventas?estado=pendiente')}
            >
              <p className="text-xs font-medium text-rose-800 mb-1">
                ⚠ {data.ventas_pendientes.count} venta(s) pendiente(s) —{' '}
                {formatCOP(data.ventas_pendientes.saldo)} por cobrar
              </p>
              <ul className="text-xs text-rose-700 space-y-0.5">
                {data.ventas_pendientes.deudores.map((d) => (
                  <li key={d.venta_id}>
                    • {d.cliente} — debe {formatCOP(d.saldo)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard
          label="Ventas del mes"
          value={formatCOP(data.ventas_mes.total)}
          sub={`${data.ventas_mes.count} transacciones`}
          color="text-emerald-700"
          accent="emerald"
          icon="M3 3h2l2.4 12.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6M9 20a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01"
        />
        <KpiCard
          label="Gastos del mes"
          value={formatCOP(data.gastos_mes.total)}
          sub={`${data.gastos_mes.count} registros`}
          color="text-rose-600"
          accent="rose"
          icon="M12 8v8m-3-5h6M5 21h14a2 2 0 0 0 2-2V8.5L15.5 3H7a2 2 0 0 0-2 2v3M5 12v7a2 2 0 0 0 2 2"
        />
        <KpiCard
          label="Margen neto"
          value={formatCOP(data.margen)}
          color={data.margen >= 0 ? 'text-emerald-700' : 'text-rose-600'}
          accent="violet"
          icon="M9 19v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6m-9 0h14a2 2 0 0 0 2-2V9.5a2 2 0 0 0-.6-1.4l-5-5a2 2 0 0 0-2.8 0l-5 5A2 2 0 0 0 4 9.5V17a2 2 0 0 0 2 2Z"
        />
        <KpiCard
          label="Ticket promedio"
          value={formatCOP(data.ticket_promedio)}
          accent="sky"
          icon="M4 19V9m6 10V5m6 14v-6m6 6V3"
        />
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="Suscripciones activas"
          value={String(data.suscripciones_activas)}
          accent="sky"
          icon="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m-5 8 2 2 4-4"
        />
        <KpiCard
          label="Por vencer (7 días)"
          value={String(data.suscripciones_por_vencer)}
          color={data.suscripciones_por_vencer > 0 ? 'text-amber-600' : undefined}
          accent={data.suscripciones_por_vencer > 0 ? 'amber' : 'slate'}
          icon="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
        <KpiCard
          label="Clientes nuevos (mes)"
          value={String(data.clientes_nuevos_mes)}
          accent="emerald"
          icon="M17 20h5v-1.5a4.5 4.5 0 0 0-6.35-4.1M9 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1 20v-1.5A4.5 4.5 0 0 1 5.5 14h1A4.5 4.5 0 0 1 11 18.5V20H1Z"
        />
        <KpiCard
          label="Pendientes por cobrar"
          value={formatCOP(data.ventas_pendientes.saldo)}
          sub={`${data.ventas_pendientes.count} ventas`}
          color={data.ventas_pendientes.saldo > 0 ? 'text-rose-600' : undefined}
          accent={data.ventas_pendientes.saldo > 0 ? 'rose' : 'slate'}
          icon="M3 3h2l2.4 12.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6M9 20a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01"
        />
      </div>
    </div>
  );
}
