import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CardSkeletonGrid } from '../components/Skeleton';

interface Movimiento {
  id: number;
  tipo: 'ingreso' | 'egreso' | 'retiro' | 'ajuste';
  origen: string;
  referencia_tipo: string | null;
  referencia_id: number | null;
  monto: number;
  motivo: string | null;
  fecha: string;
  created_by: string | null;
}

interface Resumen {
  ingresos: number;
  egresos: number;
  retiros: number;
  ajustes: number;
}

interface Sesion {
  id: number;
  saldo_inicial: number;
  fecha_apertura: string;
  abierta_por: string | null;
  notas_apertura: string | null;
  estado: 'abierta' | 'cerrada';
  fecha_cierre: string | null;
  cerrada_por: string | null;
  saldo_esperado: number | null;
  saldo_contado: number | null;
  diferencia: number | null;
  notas_cierre: string | null;
}

interface EstadoCaja {
  sesion: Sesion;
  saldo_esperado: number;
  resumen: Resumen;
  movimientos: Movimiento[];
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

const TIPO_LABEL: Record<Movimiento['tipo'], string> = {
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  retiro: 'Retiro',
  ajuste: 'Ajuste',
};

const TIPO_COLOR: Record<Movimiento['tipo'], string> = {
  ingreso: 'text-green-700 bg-green-100',
  egreso: 'text-amber-700 bg-amber-100',
  retiro: 'text-blue-700 bg-blue-100',
  ajuste: 'text-purple-700 bg-purple-100',
};

export default function Caja() {
  const [estado, setEstado] = useState<EstadoCaja | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal abrir
  const [modalAbrir, setModalAbrir] = useState(false);
  const [saldoInicial, setSaldoInicial] = useState('');
  const [notasApertura, setNotasApertura] = useState('');

  // Modal movimiento manual
  const [modalMov, setModalMov] = useState(false);
  const [movTipo, setMovTipo] = useState<'retiro' | 'ingreso' | 'egreso' | 'ajuste'>('retiro');
  const [movMonto, setMovMonto] = useState('');
  const [movMotivo, setMovMotivo] = useState('');

  // Modal cerrar (arqueo)
  const [modalCerrar, setModalCerrar] = useState(false);
  const [saldoContado, setSaldoContado] = useState('');
  const [notasCierre, setNotasCierre] = useState('');

  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const [estadoRes, sesionesRes] = await Promise.all([
        api.get<ApiResponse<EstadoCaja | null>>('/caja'),
        api.get<ApiResponse<Sesion[]>>('/caja/sesiones'),
      ]);
      setEstado(estadoRes.data);
      setSesiones(sesionesRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando la caja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const limpiarMensajes = () => {
    setError('');
    setSuccess('');
  };

  const abrirCaja = async () => {
    limpiarMensajes();
    setGuardando(true);
    try {
      await api.post('/caja/abrir', {
        saldo_inicial: saldoInicial ? Math.round(Number(saldoInicial) * 100) : 0,
        notas_apertura: notasApertura.trim() || undefined,
      });
      setSuccess('Caja abierta');
      setModalAbrir(false);
      setSaldoInicial('');
      setNotasApertura('');
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al abrir la caja');
    } finally {
      setGuardando(false);
    }
  };

  const registrarMovimiento = async () => {
    limpiarMensajes();
    if (!movMonto || Number(movMonto) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    if (movMotivo.trim().length < 3) {
      setError('El motivo es obligatorio (mín 3 caracteres)');
      return;
    }
    setGuardando(true);
    try {
      await api.post('/caja/movimientos', {
        tipo: movTipo,
        monto: Math.round(Number(movMonto) * 100),
        motivo: movMotivo.trim(),
      });
      setSuccess('Movimiento registrado');
      setModalMov(false);
      setMovMonto('');
      setMovMotivo('');
      setMovTipo('retiro');
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el movimiento');
    } finally {
      setGuardando(false);
    }
  };

  const cerrarCaja = async () => {
    limpiarMensajes();
    if (saldoContado === '' || Number(saldoContado) < 0) {
      setError('Indica el efectivo contado');
      return;
    }
    setGuardando(true);
    try {
      await api.post('/caja/cerrar', {
        saldo_contado: Math.round(Number(saldoContado) * 100),
        notas_cierre: notasCierre.trim() || undefined,
      });
      setSuccess('Caja cerrada. Arqueo registrado.');
      setModalCerrar(false);
      setSaldoContado('');
      setNotasCierre('');
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar la caja');
    } finally {
      setGuardando(false);
    }
  };

  // Diferencia en vivo en el modal de cierre (contado - esperado)
  const diferenciaEnVivo =
    estado && saldoContado !== ''
      ? Math.round(Number(saldoContado) * 100) - estado.saldo_esperado
      : null;

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-bold mb-4">Caja (efectivo)</h2>
        <CardSkeletonGrid count={4} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Caja (efectivo)</h2>
        {estado ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                limpiarMensajes();
                setModalMov(true);
              }}
              className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
              title="Registrar retiro, ingreso o ajuste manual"
            >
              + Movimiento
            </button>
            <button
              onClick={() => {
                limpiarMensajes();
                setSaldoContado('');
                setModalCerrar(true);
              }}
              className="bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-sm"
              title="Cerrar la caja y hacer el arqueo"
            >
              Cerrar caja (arqueo)
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              limpiarMensajes();
              setModalAbrir(true);
            }}
            className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
            title="Abrir una nueva sesión de caja"
          >
            Abrir caja
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
      {success && <p className="text-green-600 text-sm mb-3 bg-green-50 p-2 rounded">{success}</p>}

      {!estado ? (
        <div className="rounded-xl neu-flat p-6 text-center text-gray-500">
          <p className="mb-1">La caja está cerrada.</p>
          <p className="text-sm">
            Abre una sesión para empezar a registrar el efectivo del día o la semana. Las ventas y
            gastos en efectivo entrarán y saldrán automáticamente.
          </p>
        </div>
      ) : (
        <>
          {/* Tarjetas de saldo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl neu-flat p-4">
              <p className="text-xs text-gray-500 mb-1">Saldo actual en caja</p>
              <p className="text-xl font-bold text-slate-800">{formatCOP(estado.saldo_esperado)}</p>
            </div>
            <div className="rounded-xl neu-flat p-4">
              <p className="text-xs text-gray-500 mb-1">Base inicial</p>
              <p className="text-lg font-semibold">{formatCOP(estado.sesion.saldo_inicial)}</p>
            </div>
            <div className="rounded-xl neu-flat p-4">
              <p className="text-xs text-gray-500 mb-1">Ingresos efectivo</p>
              <p className="text-lg font-semibold text-green-700">
                {formatCOP(estado.resumen.ingresos)}
              </p>
            </div>
            <div className="rounded-xl neu-flat p-4">
              <p className="text-xs text-gray-500 mb-1">Egresos + retiros</p>
              <p className="text-lg font-semibold text-amber-700">
                {formatCOP(estado.resumen.egresos + estado.resumen.retiros)}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Sesión #{estado.sesion.id} · Abierta {estado.sesion.fecha_apertura}
            {estado.sesion.abierta_por ? ` por ${estado.sesion.abierta_por}` : ''}
          </p>

          {/* Movimientos */}
          <h3 className="text-sm font-bold mb-2">Movimientos</h3>
          <div className="rounded-xl neu-flat overflow-auto mb-6">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {estado.movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-gray-400">
                      Sin movimientos todavía
                    </td>
                  </tr>
                ) : (
                  estado.movimientos.map((m) => (
                    <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs">{m.fecha}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${TIPO_COLOR[m.tipo]}`}>
                          {TIPO_LABEL[m.tipo]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs capitalize">{m.origen}</td>
                      <td className="px-3 py-2 text-xs">{m.motivo || '-'}</td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          m.tipo === 'ingreso' || m.tipo === 'ajuste'
                            ? 'text-green-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {m.tipo === 'ingreso' || m.tipo === 'ajuste' ? '+' : '−'}
                        {formatCOP(m.monto)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Historial de sesiones cerradas */}
      <h3 className="text-sm font-bold mb-2">Historial de cierres</h3>
      <div className="rounded-xl neu-flat overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Apertura</th>
              <th className="px-3 py-2">Cierre</th>
              <th className="px-3 py-2 text-right">Esperado</th>
              <th className="px-3 py-2 text-right">Contado</th>
              <th className="px-3 py-2 text-right">Diferencia</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sesiones.filter((s) => s.estado === 'cerrada').length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                  Aún no hay cierres registrados
                </td>
              </tr>
            ) : (
              sesiones
                .filter((s) => s.estado === 'cerrada')
                .map((s) => (
                  <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{s.id}</td>
                    <td className="px-3 py-2 text-xs">{s.fecha_apertura}</td>
                    <td className="px-3 py-2 text-xs">{s.fecha_cierre}</td>
                    <td className="px-3 py-2 text-right">
                      {s.saldo_esperado !== null ? formatCOP(s.saldo_esperado) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {s.saldo_contado !== null ? formatCOP(s.saldo_contado) : '-'}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        s.diferencia === null
                          ? ''
                          : s.diferencia === 0
                            ? 'text-gray-500'
                            : s.diferencia > 0
                              ? 'text-green-700'
                              : 'text-red-600'
                      }`}
                    >
                      {s.diferencia !== null ? formatCOP(s.diferencia) : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        cerrada
                      </span>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: abrir caja */}
      {modalAbrir && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-xl neu-flat p-5">
            <h3 className="text-base font-bold mb-1">Abrir caja</h3>
            <p className="text-xs text-gray-500 mb-3">
              Indica el efectivo (base) con el que arranca el cajón. Puede ser 0 si empiezas sin
              fondo.
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1">Base inicial ($)</label>
            <input
              type="number"
              min="0"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none mb-3"
            />
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <input
              type="text"
              value={notasApertura}
              onChange={(e) => setNotasApertura(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
            {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setModalAbrir(false)}
                disabled={guardando}
                className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
              >
                Cancelar
              </button>
              <button
                onClick={abrirCaja}
                disabled={guardando}
                className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn disabled:opacity-50"
              >
                {guardando ? 'Abriendo...' : 'Abrir caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: movimiento manual */}
      {modalMov && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-xl neu-flat p-5">
            <h3 className="text-base font-bold mb-1">Movimiento de caja</h3>
            <p className="text-xs text-gray-500 mb-3">
              Retiro (entrega/consignación), ingreso manual, o ajuste (sobrante/fondo). Las ventas y
              gastos en efectivo ya se registran solos.
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
            <select
              value={movTipo}
              onChange={(e) =>
                setMovTipo(e.target.value as 'retiro' | 'ingreso' | 'egreso' | 'ajuste')
              }
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none mb-3"
            >
              <option value="retiro">Retiro (entrega / consignación)</option>
              <option value="ingreso">Ingreso manual</option>
              <option value="egreso">Egreso manual</option>
              <option value="ajuste">Ajuste (sobrante / fondo)</option>
            </select>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monto ($) *</label>
            <input
              type="number"
              min="1"
              value={movMonto}
              onChange={(e) => setMovMonto(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none mb-3"
            />
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
            <input
              type="text"
              value={movMotivo}
              onChange={(e) => setMovMotivo(e.target.value)}
              placeholder="Ej: consignación banco, entrega al dueño..."
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
            {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setModalMov(false)}
                disabled={guardando}
                className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
              >
                Cancelar
              </button>
              <button
                onClick={registrarMovimiento}
                disabled={guardando}
                className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: cerrar caja (arqueo) */}
      {modalCerrar && estado && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-xl neu-flat p-5">
            <h3 className="text-base font-bold mb-1">Cerrar caja (arqueo)</h3>
            <p className="text-xs text-gray-500 mb-3">
              Cuenta el efectivo físico del cajón y anótalo. El sistema calculó que debería haber{' '}
              <span className="font-semibold">{formatCOP(estado.saldo_esperado)}</span>.
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Efectivo contado ($) *
            </label>
            <input
              type="number"
              min="0"
              value={saldoContado}
              onChange={(e) => setSaldoContado(e.target.value)}
              autoFocus
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none mb-2"
            />
            {diferenciaEnVivo !== null && (
              <p
                className={`text-sm mb-2 ${
                  diferenciaEnVivo === 0
                    ? 'text-gray-600'
                    : diferenciaEnVivo > 0
                      ? 'text-green-700'
                      : 'text-red-600'
                }`}
              >
                Diferencia: {formatCOP(diferenciaEnVivo)}{' '}
                {diferenciaEnVivo === 0
                  ? '(cuadra)'
                  : diferenciaEnVivo > 0
                    ? '(sobrante)'
                    : '(faltante)'}
              </p>
            )}
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas del cierre</label>
            <input
              type="text"
              value={notasCierre}
              onChange={(e) => setNotasCierre(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
            {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setModalCerrar(false)}
                disabled={guardando}
                className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
              >
                Cancelar
              </button>
              <button
                onClick={cerrarCaja}
                disabled={guardando}
                className="bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {guardando ? 'Cerrando...' : 'Cerrar y arquear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
