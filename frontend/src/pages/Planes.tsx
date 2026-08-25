import { useState, useEffect } from 'react';
import { api } from '../services/api';

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
  const [tab, setTab] = useState<'planes' | 'suscripciones'>('planes');
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [porVencer, setPorVencer] = useState<Suscripcion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(FORM_VACIO);

  const cargarPlanes = async () => {
    try {
      const res = await api.get<ApiResponse<Plan[]>>('/planes?incluir_inactivos=1');
      setPlanes(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
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

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b">
        <button
          onClick={() => setTab('planes')}
          className={`pb-2 text-sm font-medium ${tab === 'planes' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
        >
          Planes
        </button>
        <button
          onClick={() => setTab('suscripciones')}
          className={`pb-2 text-sm font-medium ${tab === 'suscripciones' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
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
            >
              {showForm ? 'Cancelar' : '+ Nuevo plan'}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="p-4 rounded-xl neu-flat mb-4 grid grid-cols-3 gap-3"
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
              <div className="col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
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
                {planes.length === 0 ? (
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
                        >
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => abrirEditar(p)}
                          className="text-blue-600 hover:text-blue-800"
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
                {suscripciones.length === 0 ? (
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
    </div>
  );
}
