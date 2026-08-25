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

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
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

  if (error) return <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>;
  if (!data) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div>
      <h2 className="text-lg font-bold mb-1">Dashboard</h2>
      <p className="text-sm text-gray-500 mb-4">Hola, {user?.nombre}. Resumen del mes actual.</p>

      {/* Alertas */}
      {(data.suscripciones_por_vencer > 0 ||
        data.stock_bajo > 0 ||
        data.ventas_pendientes.count > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {data.suscripciones_por_vencer > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-xs font-medium text-yellow-800">
                ⚠ {data.suscripciones_por_vencer} suscripción(es) por vencer en 7 días
              </p>
            </div>
          )}
          {data.stock_bajo > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              <p className="text-xs font-medium text-orange-800">
                ⚠ {data.stock_bajo} producto(s) con stock bajo
              </p>
            </div>
          )}
          {data.ventas_pendientes.count > 0 && (
            <div
              className="bg-red-50 border border-red-200 rounded p-3 cursor-pointer hover:bg-red-100"
              onClick={() => navigate('/ventas?estado=pendiente')}
            >
              <p className="text-xs font-medium text-red-800 mb-1">
                ⚠ {data.ventas_pendientes.count} venta(s) pendiente(s) —{' '}
                {formatCOP(data.ventas_pendientes.saldo)} por cobrar
              </p>
              <ul className="text-xs text-red-700 space-y-0.5">
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
          color="text-green-700"
        />
        <KpiCard
          label="Gastos del mes"
          value={formatCOP(data.gastos_mes.total)}
          sub={`${data.gastos_mes.count} registros`}
          color="text-red-600"
        />
        <KpiCard
          label="Margen neto"
          value={formatCOP(data.margen)}
          color={data.margen >= 0 ? 'text-green-700' : 'text-red-600'}
        />
        <KpiCard label="Ticket promedio" value={formatCOP(data.ticket_promedio)} />
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Suscripciones activas" value={String(data.suscripciones_activas)} />
        <KpiCard
          label="Por vencer (7 días)"
          value={String(data.suscripciones_por_vencer)}
          color={data.suscripciones_por_vencer > 0 ? 'text-yellow-600' : undefined}
        />
        <KpiCard label="Clientes nuevos (mes)" value={String(data.clientes_nuevos_mes)} />
        <KpiCard
          label="Pendientes por cobrar"
          value={formatCOP(data.ventas_pendientes.saldo)}
          sub={`${data.ventas_pendientes.count} ventas`}
          color={data.ventas_pendientes.saldo > 0 ? 'text-red-600' : undefined}
        />
      </div>
    </div>
  );
}
