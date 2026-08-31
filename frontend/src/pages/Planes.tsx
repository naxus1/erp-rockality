import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { TableSkeletonRows } from '../components/Skeleton';

interface Plan {
  id: number;
  nombre: string;
  modalidad: string;
  duracion_dias: number;
  precio: number;
  aplica_iva: number;
  porcentaje_iva: number;
  descripcion: string | null;
  activo: number;
  motivo_inactivacion: string | null;
}
interface Suscripcion {
  id: number;
  cliente_cedula: string;
  cliente_nombre: string;
  cliente_apellidos: string;
  plan_nombre: string;
  plan_modalidad: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  dias_restantes: number;
  monto_pagado: number;
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

const FORM_VACIO = {
  nombre: '',
  modalidad: 'presencial',
  duracion_dias: '60',
  precio: '',
  aplica_iva: 0,
  porcentaje_iva: '19',
  descripcion: '',
};

export default function Planes() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'planes' | 'suscripciones'>(
    searchParams.get('tab') === 'suscripciones' ? 'suscripciones' : 'planes',
  );
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [porVencer, setPorVencer] = useState<Suscripcion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(FORM_VACIO);

  // Modal inactivar plan (id + motivo obligatorio)
  const [inactivarId, setInactivarId] = useState<number | null>(null);
  const [motivoInactivacion, setMotivoInactivacion] = useState('');
  const [inactivando, setInactivando] = useState(false);

  const cargarPlanes = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Plan[]>>('/planes?incluir_inactivos=1');
      setPlanes(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };
  const cargarSuscripciones = async () => {
    try {
      const [activas, vencer] = await Promise.all([
        api.get<ApiResponse<Suscripcion[]>>('/planes/suscripciones/activas'),
        api.get<ApiResponse<Suscripcion[]>>('/planes/suscripciones/por-vencer?dias=7'),
      ]);
      setSuscripciones(activas.data);
      setPorVencer(vencer.data);
    } catch {
      /* */
    }
  };

  useEffect(() => {
    cargarPlanes();
    cargarSuscripciones();
  }, []);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setEditando(null);
    setShowForm(true);
    setError('');
    setSuccess('');
  };
  const abrirEditar = (p: Plan) => {
    setForm({
      nombre: p.nombre,
      modalidad: p.modalidad,
      duracion_dias: String(p.duracion_dias),
      precio: String(p.precio / 100),
      aplica_iva: p.aplica_iva,
      porcentaje_iva: String(p.porcentaje_iva),
      descripcion: p.descripcion || '',
    });
    setEditando(p.id);
    setShowForm(true);
    setError('');
    setSuccess('');
  };
  const cerrarForm = () => {
    setShowForm(false);
    setEditando(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const body = {
      nombre: form.nombre,
      modalidad: form.modalidad,
      duracion_dias: Number(form.duracion_dias),
      precio: Math.round(Number(form.precio) * 100),
      aplica_iva: form.aplica_iva,
      porcentaje_iva: Number(form.porcentaje_iva),
      descripcion: form.descripcion || undefined,
    };
    try {
      if (editando) {
        await api.put(`/planes/${editando}`, body);
        setSuccess('Plan actualizado');
      } else {
        await api.post('/planes', body);
        setSuccess('Plan creado');
      }
      cerrarForm();
      cargarPlanes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  // ─── Inactivar / Reactivar ──────────────────────────
  const abrirInactivar = (id: number) => {
    setInactivarId(id);
    setMotivoInactivacion('');
    setError('');
    setSuccess('');
  };
  const cerrarInactivar = () => {
    setInactivarId(null);
    setMotivoInactivacion('');
  };
  const confirmarInactivar = async () => {
    if (inactivarId === null) return;
    if (!motivoInactivacion.trim()) {
      setError('Debes indicar el motivo de la inactivación');
      return;
    }
    setInactivando(true);
    setError('');
    try {
      await api.put(`/planes/${inactivarId}`, {
        activo: 0,
        motivo_inactivacion: motivoInactivacion.trim(),
      });
      setSuccess('Plan inactivado');
      cerrarInactivar();
      cargarPlanes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inactivando');
    } finally {
      setInactivando(false);
    }
  };
  const reactivar = async (id: number) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/planes/${id}`, { activo: 1 });
      setSuccess('Plan reactivado');
      cargarPlanes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reactivando');
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b">
        <button
          onClick={() => setTab('planes')}
          className={`pb-2 text-sm font-medium ${tab === 'planes' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
          title="Ver los planes de entrenamiento"
        >
          Planes
        </button>
        <button
          onClick={() => setTab('suscripciones')}
          className={`pb-2 text-sm font-medium ${tab === 'suscripciones' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
          title="Ver las suscripciones activas"
        >
          Suscripciones activas ({suscripciones.length})
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
      {success && <p className="text-green-600 text-sm mb-3 bg-green-50 p-2 rounded">{success}</p>}

      {/* TAB PLANES */}
      {tab === 'planes' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Planes de entrenamiento</h2>
            <button
              onClick={showForm ? cerrarForm : abrirCrear}
              className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
              title={showForm ? 'Cerrar el formulario' : 'Crear un nuevo plan'}
            >
              {showForm ? 'Cancelar' : '+ Nuevo plan'}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="p-4 rounded-xl neu-flat mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Modalidad *</label>
                <select
                  required
                  value={form.modalidad}
                  onChange={(e) => setForm({ ...form, modalidad: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
                >
                  <option value="presencial">Presencial</option>
                  <option value="virtual">Virtual</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Duración (días) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.duracion_dias}
                  onChange={(e) => setForm({ ...form, duracion_dias: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Precio (COP) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.aplica_iva === 1}
                    onChange={(e) => setForm({ ...form, aplica_iva: e.target.checked ? 1 : 0 })}
                  />
                  IVA
                </label>
                {form.aplica_iva === 1 && (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.porcentaje_iva}
                    onChange={(e) => setForm({ ...form, porcentaje_iva: e.target.value })}
                    className="w-16 rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
                />
              </div>
              <div className="col-span-1 sm:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
                  title={editando ? 'Guardar los cambios del plan' : 'Guardar el nuevo plan'}
                >
                  {editando ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          )}

          <div className="rounded-xl neu-flat overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Modalidad</th>
                  <th className="px-3 py-2">Duración</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                  <th className="px-3 py-2">IVA</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeletonRows cols={7} />
                ) : planes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                      No hay planes
                    </td>
                  </tr>
                ) : (
                  planes.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{p.nombre}</td>
                      <td className="px-3 py-2 text-xs capitalize">{p.modalidad}</td>
                      <td className="px-3 py-2">{p.duracion_dias} días</td>
                      <td className="px-3 py-2 text-right">{formatCOP(p.precio)}</td>
                      <td className="px-3 py-2 text-xs">
                        {p.aplica_iva ? `${p.porcentaje_iva}%` : 'No'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                          title={
                            !p.activo && p.motivo_inactivacion
                              ? `Motivo: ${p.motivo_inactivacion}`
                              : undefined
                          }
                        >
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        {!p.activo && p.motivo_inactivacion && (
                          <span className="block text-[10px] text-gray-400 italic mt-0.5">
                            {p.motivo_inactivacion}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => abrirEditar(p)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                          title="Editar"
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
                        {p.activo ? (
                          <button
                            onClick={() => abrirInactivar(p.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors ml-1"
                            title="Inactivar plan"
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
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                              />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivar(p.id)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1.5 rounded-lg transition-colors ml-1"
                            title="Reactivar plan"
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
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB SUSCRIPCIONES */}
      {tab === 'suscripciones' && (
        <div>
          {porVencer.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-1">
                ⚠ Por vencer en 7 días ({porVencer.length})
              </h3>
              <ul className="text-xs text-yellow-700 space-y-1">
                {porVencer.map((s) => (
                  <li key={s.id}>
                    {s.cliente_nombre} {s.cliente_apellidos} — {s.plan_nombre} — vence {s.fecha_fin}{' '}
                    ({s.dias_restantes} días)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl neu-flat overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Modalidad</th>
                  <th className="px-3 py-2">Inicio</th>
                  <th className="px-3 py-2">Fin</th>
                  <th className="px-3 py-2">Días restantes</th>
                  <th className="px-3 py-2 text-right">Pagado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeletonRows cols={7} />
                ) : suscripciones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                      No hay suscripciones activas
                    </td>
                  </tr>
                ) : (
                  suscripciones.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2">
                        {s.cliente_nombre} {s.cliente_apellidos}
                      </td>
                      <td className="px-3 py-2 font-medium">{s.plan_nombre}</td>
                      <td className="px-3 py-2 text-xs capitalize">{s.plan_modalidad}</td>
                      <td className="px-3 py-2 text-xs">{s.fecha_inicio}</td>
                      <td className="px-3 py-2 text-xs">{s.fecha_fin}</td>
                      <td
                        className={`px-3 py-2 font-medium ${s.dias_restantes <= 7 ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {s.dias_restantes}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCOP(s.monto_pagado)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal inactivar plan */}
      {inactivarId !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-md rounded-xl neu-flat p-5"
            style={{ background: '#e0e5ec' }}
          >
            <h3 className="text-base font-bold mb-1">Inactivar plan</h3>
            <p className="text-xs text-gray-500 mb-3">
              El plan dejará de estar disponible para nuevas ventas. Las suscripciones actuales no
              se afectan. Indica el motivo (obligatorio) para el historial.
            </p>
            <textarea
              value={motivoInactivacion}
              onChange={(e) => setMotivoInactivacion(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Ej: se reemplazó por un plan nuevo, dejó de ofrecerse, precio desactualizado..."
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none resize-none"
            />
            {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={cerrarInactivar}
                disabled={inactivando}
                className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
                title="Cancelar y no inactivar"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarInactivar}
                disabled={inactivando || !motivoInactivacion.trim()}
                className="bg-red-600 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:bg-red-300"
                title="Confirmar la inactivación del plan"
              >
                {inactivando ? 'Inactivando...' : 'Inactivar plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
