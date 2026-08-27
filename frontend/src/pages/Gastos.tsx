import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Gasto {
  id: number;
  tercero_nombre: string;
  gerencia_nombre: string;
  tipo_gasto_nombre: string;
  categoria_gasto_nombre: string;
  descripcion: string;
  valor_base: number;
  iva: number;
  total: number;
  periodo_mes: number;
  periodo_anio: number;
  fecha_pago: string;
  metodo_pago_nombre: string | null;
  referencia_pago: string | null;
  estado: string;
  recurrente: number;
  notas: string | null;
  updated_by: string | null;
  motivo_anulacion: string | null;
}
interface Catalogo {
  id: number;
  nombre: string;
}
interface Tercero {
  nit: string;
  nombre: string;
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

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Gastos() {
  const { user } = useAuth();
  const [vista, setVista] = useState<'lista' | 'nuevo'>('lista');
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal de edición limitada (solo descripción, referencia, notas)
  const [editGasto, setEditGasto] = useState<Gasto | null>(null);
  const [editForm, setEditForm] = useState({ descripcion: '', referencia_pago: '', notas: '' });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Modal de anulación (id + motivo obligatorio)
  const [anularId, setAnularId] = useState<number | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  // Filtros
  const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth() + 1));
  const [filtroAnio, setFiltroAnio] = useState(String(new Date().getFullYear()));
  const [filtroGerencia, setFiltroGerencia] = useState('');

  // Catálogos
  const [gerencias, setGerencias] = useState<Catalogo[]>([]);
  const [tiposGasto, setTiposGasto] = useState<Catalogo[]>([]);
  const [categoriasGasto, setCategoriasGasto] = useState<Catalogo[]>([]);
  const [metodosPago, setMetodosPago] = useState<Catalogo[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);

  // Form
  const [form, setForm] = useState({
    tercero_nit: '',
    gerencia_id: '',
    tipo_gasto_id: '',
    categoria_gasto_id: '',
    descripcion: '',
    valor_base: '',
    iva: '',
    periodo_mes: String(new Date().getMonth() + 1),
    periodo_anio: String(new Date().getFullYear()),
    fecha_pago: new Date().toISOString().split('T')[0],
    metodo_pago_id: '',
    referencia_pago: '',
    recurrente: 0,
    notas: '',
  });

  const cargarGastos = async () => {
    try {
      let url = `/gastos?periodo_mes=${filtroMes}&periodo_anio=${filtroAnio}`;
      if (filtroGerencia) url += `&gerencia_id=${filtroGerencia}`;
      const res = await api.get<ApiResponse<Gasto[]>>(url);
      setGastos(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const cargarCatalogos = async () => {
    try {
      const [g, tg, cg, mp, t] = await Promise.all([
        api.get<ApiResponse<Catalogo[]>>('/catalogos/gerencias'),
        api.get<ApiResponse<Catalogo[]>>('/catalogos/tipos-gasto'),
        api.get<ApiResponse<Catalogo[]>>('/catalogos/categorias-gasto'),
        api.get<ApiResponse<Catalogo[]>>('/catalogos/metodos-pago'),
        api.get<ApiResponse<Tercero[]>>('/terceros'),
      ]);
      setGerencias(g.data);
      setTiposGasto(tg.data);
      setCategoriasGasto(cg.data);
      setMetodosPago(mp.data);
      setTerceros(t.data);
    } catch {
      /* */
    }
  };

  // ─── Edición limitada ───────────────────────────────
  const abrirEditar = (g: Gasto) => {
    setEditGasto(g);
    setEditForm({
      descripcion: g.descripcion,
      referencia_pago: g.referencia_pago || '',
      notas: g.notas || '',
    });
    setError('');
    setSuccess('');
  };

  const cerrarEditar = () => {
    setEditGasto(null);
  };

  const guardarEdicion = async () => {
    if (!editGasto) return;
    if (!editForm.descripcion.trim()) {
      setError('La descripción es obligatoria');
      return;
    }
    setGuardandoEdicion(true);
    setError('');
    try {
      await api.put(`/gastos/${editGasto.id}`, {
        descripcion: editForm.descripcion.trim(),
        referencia_pago: editForm.referencia_pago.trim() || undefined,
        notas: editForm.notas.trim() || undefined,
        updated_by: user?.id,
      });
      setSuccess('Gasto actualizado');
      cerrarEditar();
      cargarGastos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // ─── Anulación ──────────────────────────────────────
  const abrirAnular = (id: number) => {
    setAnularId(id);
    setMotivoAnulacion('');
    setError('');
    setSuccess('');
  };

  const cerrarAnular = () => {
    setAnularId(null);
    setMotivoAnulacion('');
  };

  const confirmarAnular = async () => {
    if (anularId === null) return;
    if (!motivoAnulacion.trim()) {
      setError('Debes indicar el motivo de la anulación');
      return;
    }
    setAnulando(true);
    setError('');
    try {
      await api.post(`/gastos/${anularId}/anular`, {
        usuario_id: user?.id,
        motivo: motivoAnulacion.trim(),
      });
      setSuccess('Gasto anulado');
      cerrarAnular();
      cargarGastos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error anulando');
    } finally {
      setAnulando(false);
    }
  };

  useEffect(() => {
    cargarGastos();
    cargarCatalogos();
  }, []);
  useEffect(() => {
    cargarGastos();
  }, [filtroMes, filtroAnio, filtroGerencia]);

  const totalMes = gastos
    .filter((g) => g.estado !== 'anulado')
    .reduce((sum, g) => sum + g.total, 0);

  const registrarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (
      !form.tercero_nit ||
      !form.gerencia_id ||
      !form.tipo_gasto_id ||
      !form.categoria_gasto_id ||
      !form.descripcion ||
      !form.valor_base
    ) {
      setError('Campos obligatorios: tercero, gerencia, tipo, categoría, descripción, valor');
      return;
    }
    try {
      await api.post('/gastos', {
        tercero_nit: form.tercero_nit,
        gerencia_id: Number(form.gerencia_id),
        tipo_gasto_id: Number(form.tipo_gasto_id),
        categoria_gasto_id: Number(form.categoria_gasto_id),
        descripcion: form.descripcion,
        valor_base: Math.round(Number(form.valor_base) * 100),
        iva: form.iva ? Math.round(Number(form.iva) * 100) : 0,
        periodo_mes: Number(form.periodo_mes),
        periodo_anio: Number(form.periodo_anio),
        fecha_pago: form.fecha_pago || undefined,
        metodo_pago_id: form.metodo_pago_id ? Number(form.metodo_pago_id) : undefined,
        referencia_pago: form.referencia_pago || undefined,
        notas: form.notas || undefined,
      });
      setSuccess('Gasto registrado');
      setForm({
        ...form,
        descripcion: '',
        valor_base: '',
        iva: '',
        referencia_pago: '',
        notas: '',
      });
      setVista('lista');
      cargarGastos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  // ─── LISTA ────────────────────────────────────────────
  if (vista === 'lista') {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Gastos</h2>
          <button
            onClick={() => {
              setVista('nuevo');
              setError('');
              setSuccess('');
            }}
            className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
            title="Registrar un nuevo gasto"
          >
            + Registrar gasto
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm mb-3 bg-green-50 p-2 rounded">{success}</p>
        )}

        {/* Filtros + Resumen */}
        <div className="flex gap-3 mb-3 items-center">
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={filtroGerencia}
            onChange={(e) => setFiltroGerencia(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            <option value="">Todas las gerencias</option>
            {gerencias.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm font-bold">Total mes: {formatCOP(totalMes)}</span>
        </div>

        <div className="rounded-xl neu-flat overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Tercero</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Gerencia</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-400">
                    No hay gastos en este periodo
                  </td>
                </tr>
              ) : (
                gastos.map((g) => (
                  <tr key={g.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs">{g.fecha_pago}</td>
                    <td className="px-3 py-2">{g.tercero_nombre}</td>
                    <td className="px-3 py-2 text-xs">
                      {g.descripcion}
                      {g.estado === 'anulado' && g.motivo_anulacion && (
                        <span className="block text-red-500 italic">
                          Anulado{g.updated_by ? ` por ${g.updated_by}` : ''}: {g.motivo_anulacion}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">{g.gerencia_nombre}</td>
                    <td className="px-3 py-2 text-xs">{g.tipo_gasto_nombre}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCOP(g.total)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${g.estado === 'registrado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {g.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {g.estado === 'registrado' && (
                        <>
                          <button
                            onClick={() => abrirEditar(g)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                            title="Editar descripción, referencia o notas"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => abrirAnular(g.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-colors ml-1"
                            title="Anular gasto"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal edición limitada */}
        {editGasto && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div
              className="w-full max-w-md rounded-xl neu-flat p-5"
              style={{ background: '#e0e5ec' }}
            >
              <h3 className="text-base font-bold mb-1">Editar gasto #{editGasto.id}</h3>
              <p className="text-xs text-gray-500 mb-3">
                Solo se pueden editar descripción, referencia y notas. Para corregir montos o
                periodo, anula el gasto y registra uno nuevo.
              </p>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
              <input
                type="text"
                value={editForm.descripcion}
                onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none mb-3"
              />
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Referencia de pago
              </label>
              <input
                type="text"
                value={editForm.referencia_pago}
                onChange={(e) => setEditForm({ ...editForm, referencia_pago: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none mb-3"
              />
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
              <textarea
                value={editForm.notas}
                onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none resize-none"
              />
              {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={cerrarEditar}
                  disabled={guardandoEdicion}
                  className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
                  title="Descartar cambios"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarEdicion}
                  disabled={guardandoEdicion || !editForm.descripcion.trim()}
                  className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn disabled:opacity-50"
                  title="Guardar los cambios del gasto"
                >
                  {guardandoEdicion ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal anulación */}
        {anularId !== null && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div
              className="w-full max-w-md rounded-xl neu-flat p-5"
              style={{ background: '#e0e5ec' }}
            >
              <h3 className="text-base font-bold mb-1">Anular gasto #{anularId}</h3>
              <p className="text-xs text-gray-500 mb-3">
                El gasto quedará marcado como anulado y no sumará al total del periodo. Esta acción
                queda registrada. Indica el motivo (obligatorio).
              </p>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Ej: monto mal digitado, gasto duplicado, error de tercero..."
                className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none resize-none"
              />
              {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={cerrarAnular}
                  disabled={anulando}
                  className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
                  title="Cancelar y no anular"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAnular}
                  disabled={anulando || !motivoAnulacion.trim()}
                  className="bg-red-600 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:bg-red-300"
                  title="Confirmar la anulación del gasto"
                >
                  {anulando ? 'Anulando...' : 'Anular gasto'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── NUEVO GASTO ──────────────────────────────────────
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Registrar gasto</h2>
        <button
          onClick={() => setVista('lista')}
          className="text-sm text-gray-500 hover:text-gray-800"
          title="Volver a la lista de gastos"
        >
          ← Volver
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
      <form onSubmit={registrarGasto} className="p-4 rounded-xl neu-flat grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Tercero (a quién se paga) *
          </label>
          <select
            required
            value={form.tercero_nit}
            onChange={(e) => setForm({ ...form, tercero_nit: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            <option value="">-- Seleccionar --</option>
            {terceros.map((t) => (
              <option key={t.nit} value={t.nit}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gerencia *</label>
          <select
            required
            value={form.gerencia_id}
            onChange={(e) => setForm({ ...form, gerencia_id: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            <option value="">-- Seleccionar --</option>
            {gerencias.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de gasto *</label>
          <select
            required
            value={form.tipo_gasto_id}
            onChange={(e) => setForm({ ...form, tipo_gasto_id: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            <option value="">-- Seleccionar --</option>
            {tiposGasto.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoría *</label>
          <select
            required
            value={form.categoria_gasto_id}
            onChange={(e) => setForm({ ...form, categoria_gasto_id: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            <option value="">-- Seleccionar --</option>
            {categoriasGasto.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
          <input
            type="text"
            required
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valor base ($) *</label>
          <input
            type="number"
            required
            min="1"
            value={form.valor_base}
            onChange={(e) => setForm({ ...form, valor_base: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">IVA ($)</label>
          <input
            type="number"
            min="0"
            value={form.iva}
            onChange={(e) => setForm({ ...form, iva: e.target.value })}
            placeholder="0"
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de pago</label>
          <input
            type="date"
            value={form.fecha_pago}
            onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Periodo mes</label>
          <select
            value={form.periodo_mes}
            onChange={(e) => setForm({ ...form, periodo_mes: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Periodo año</label>
          <select
            value={form.periodo_anio}
            onChange={(e) => setForm({ ...form, periodo_anio: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
          <select
            value={form.metodo_pago_id}
            onChange={(e) => setForm({ ...form, metodo_pago_id: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            <option value="">-- Seleccionar --</option>
            {metodosPago.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Referencia/Factura</label>
          <input
            type="text"
            value={form.referencia_pago}
            onChange={(e) => setForm({ ...form, referencia_pago: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
          <input
            type="text"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.recurrente === 1}
              onChange={(e) => setForm({ ...form, recurrente: e.target.checked ? 1 : 0 })}
            />
            Gasto recurrente
          </label>
        </div>
        <div className="col-span-3 flex justify-end">
          <button
            type="submit"
            className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
            title="Guardar y registrar el gasto"
          >
            Registrar gasto
          </button>
        </div>
      </form>
    </div>
  );
}
