import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Tercero {
  nit: string;
  nombre: string;
  tipo_tercero_id: number;
  tipo_tercero_nombre: string;
  direccion: string | null;
  telefono: string | null;
  nombre_contacto: string | null;
  observaciones: string | null;
  activo: number;
}

interface Catalogo {
  id: number;
  nombre: string;
}
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const FORM_VACIO = {
  nit: '',
  nombre: '',
  tipo_tercero_id: '',
  direccion: '',
  telefono: '',
  nombre_contacto: '',
  observaciones: '',
};

export default function Terceros() {
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [tiposTercero, setTiposTercero] = useState<Catalogo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(FORM_VACIO);

  const cargar = async () => {
    try {
      const url = filtroTipo ? `/terceros?tipo_tercero_id=${filtroTipo}` : '/terceros';
      const res = await api.get<ApiResponse<Tercero[]>>(url);
      setTerceros(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const buscar = async () => {
    if (busqueda.length < 2) {
      cargar();
      return;
    }
    try {
      const res = await api.get<ApiResponse<Tercero[]>>(`/terceros/buscar?q=${busqueda}`);
      setTerceros(res.data);
    } catch {
      /* */
    }
  };

  const cargarCatalogos = async () => {
    const res = await api.get<ApiResponse<Catalogo[]>>('/catalogos/tipos-tercero');
    setTiposTercero(res.data);
  };

  useEffect(() => {
    cargar();
    cargarCatalogos();
  }, []);
  useEffect(() => {
    cargar();
  }, [filtroTipo]);
  useEffect(() => {
    const t = setTimeout(() => buscar(), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setEditando(null);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const abrirEditar = (t: Tercero) => {
    setForm({
      nit: t.nit,
      nombre: t.nombre,
      tipo_tercero_id: String(t.tipo_tercero_id),
      direccion: t.direccion || '',
      telefono: t.telefono || '',
      nombre_contacto: t.nombre_contacto || '',
      observaciones: t.observaciones || '',
    });
    setEditando(t.nit);
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
      tipo_tercero_id: Number(form.tipo_tercero_id),
      direccion: form.direccion || undefined,
      telefono: form.telefono || undefined,
      nombre_contacto: form.nombre_contacto || undefined,
      observaciones: form.observaciones || undefined,
    };
    try {
      if (editando) {
        await api.put(`/terceros/${editando}`, body);
        setSuccess('Tercero actualizado');
      } else {
        await api.post('/terceros', { nit: form.nit, ...body });
        setSuccess('Tercero creado exitosamente');
      }
      cerrarForm();
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Terceros</h2>
        <button
          onClick={showForm ? cerrarForm : abrirCrear}
          className="bg-[#e0e5ec] text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
        >
          {showForm ? 'Cancelar' : '+ Nuevo tercero'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
      {success && <p className="text-green-600 text-sm mb-3 bg-green-50 p-2 rounded">{success}</p>}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-xl neu-flat mb-4 grid grid-cols-3 gap-3"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">NIT / Cédula *</label>
            <input
              type="text"
              required
              value={form.nit}
              onChange={(e) => setForm({ ...form, nit: e.target.value })}
              disabled={!!editando}
              className={`w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none ${editando ? 'bg-gray-100' : ''}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
            <select
              required
              value={form.tipo_tercero_id}
              onChange={(e) => setForm({ ...form, tipo_tercero_id: e.target.value })}
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            >
              <option value="">-- Seleccionar --</option>
              {tiposTercero.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contacto</label>
            <input
              type="text"
              value={form.nombre_contacto}
              onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })}
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
            <input
              type="text"
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div className="flex items-end justify-end">
            <button
              type="submit"
              className="bg-[#e0e5ec] text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
            >
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-3">
        <input
          type="text"
          placeholder="Buscar por nombre, NIT o contacto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 max-w-md bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
        >
          <option value="">Todos los tipos</option>
          {tiposTercero.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="rounded-xl neu-flat overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">NIT/Cédula</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Teléfono</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Observaciones</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {terceros.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                  No hay terceros registrados
                </td>
              </tr>
            ) : (
              terceros.map((t) => (
                <tr key={t.nit} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{t.nit}</td>
                  <td className="px-3 py-2">{t.nombre}</td>
                  <td className="px-3 py-2 text-xs">{t.tipo_tercero_nombre}</td>
                  <td className="px-3 py-2">{t.telefono || '-'}</td>
                  <td className="px-3 py-2 text-xs">{t.nombre_contacto || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{t.observaciones || '-'}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => abrirEditar(t)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
