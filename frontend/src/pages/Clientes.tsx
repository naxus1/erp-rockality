import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Cliente {
  cedula: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  ciudad_id: number | null;
  sexo_id: number | null;
  canal_captacion_id: number | null;
  ciudad_nombre: string | null;
  sexo_nombre: string | null;
  canal_captacion_nombre: string | null;
  edad: number | null;
  notas: string | null;
  notas_salud: string | null;
  consentimiento_datos: number;
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
  cedula: '',
  nombre: '',
  apellidos: '',
  telefono: '',
  email: '',
  anio_nac: '',
  mes_nac: '',
  dia_nac: '',
  direccion: '',
  ciudad_id: '',
  sexo_id: '',
  canal_captacion_id: '',
  notas: '',
  notas_salud: '',
  consentimiento_datos: 0,
};

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null); // cédula del cliente editándose
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [ciudades, setCiudades] = useState<Catalogo[]>([]);
  const [sexos, setSexos] = useState<Catalogo[]>([]);
  const [canales, setCanales] = useState<Catalogo[]>([]);
  const [form, setForm] = useState(FORM_VACIO);

  const cargarClientes = async () => {
    try {
      const res = await api.get<ApiResponse<Cliente[]>>('/clientes');
      setClientes(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando clientes');
    }
  };

  const buscar = async () => {
    if (busqueda.length < 2) {
      cargarClientes();
      return;
    }
    try {
      const res = await api.get<ApiResponse<Cliente[]>>(`/clientes/buscar?q=${busqueda}`);
      setClientes(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en búsqueda');
    }
  };

  const cargarCatalogos = async () => {
    const [c, s, ca] = await Promise.all([
      api.get<ApiResponse<Catalogo[]>>('/catalogos/ciudades'),
      api.get<ApiResponse<Catalogo[]>>('/catalogos/sexos'),
      api.get<ApiResponse<Catalogo[]>>('/catalogos/canales-captacion'),
    ]);
    setCiudades(c.data);
    setSexos(s.data);
    setCanales(ca.data);
  };

  useEffect(() => {
    cargarClientes();
    cargarCatalogos();
  }, []);
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

  const abrirEditar = (c: Cliente) => {
    const [anio, mes, dia] = (c.fecha_nacimiento || '--').split('-');
    setForm({
      cedula: c.cedula,
      nombre: c.nombre,
      apellidos: c.apellidos,
      telefono: c.telefono || '',
      email: c.email || '',
      anio_nac: anio !== '' ? anio : '',
      mes_nac: mes ? String(Number(mes)) : '',
      dia_nac: dia ? String(Number(dia)) : '',
      direccion: c.direccion || '',
      ciudad_id: c.ciudad_id ? String(c.ciudad_id) : '',
      sexo_id: c.sexo_id ? String(c.sexo_id) : '',
      canal_captacion_id: c.canal_captacion_id ? String(c.canal_captacion_id) : '',
      notas: c.notas || '',
      notas_salud: c.notas_salud || '',
      consentimiento_datos: c.consentimiento_datos,
    });
    setEditando(c.cedula);
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

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('El email no tiene un formato válido');
      return;
    }

    const fechaNac =
      form.anio_nac && form.mes_nac && form.dia_nac
        ? `${form.anio_nac}-${form.mes_nac.padStart(2, '0')}-${form.dia_nac.padStart(2, '0')}`
        : undefined;

    const body = {
      nombre: form.nombre,
      apellidos: form.apellidos,
      telefono: form.telefono || undefined,
      email: form.email || undefined,
      fecha_nacimiento: fechaNac,
      direccion: form.direccion || undefined,
      ciudad_id: form.ciudad_id ? Number(form.ciudad_id) : undefined,
      sexo_id: form.sexo_id ? Number(form.sexo_id) : undefined,
      canal_captacion_id: form.canal_captacion_id ? Number(form.canal_captacion_id) : undefined,
      notas: form.notas || undefined,
      notas_salud: form.notas_salud || undefined,
      consentimiento_datos: form.consentimiento_datos,
    };

    try {
      if (editando) {
        await api.put(`/clientes/${editando}`, body);
        setSuccess('Cliente actualizado');
      } else {
        await api.post('/clientes', { cedula: form.cedula, ...body });
        setSuccess('Cliente creado exitosamente');
      }
      cerrarForm();
      cargarClientes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando cliente');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Clientes</h2>
        <button
          onClick={showForm ? cerrarForm : abrirCrear}
          className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm"
        >
          {showForm ? 'Cancelar' : '+ Nuevo cliente'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
      {success && <p className="text-green-600 text-sm mb-3 bg-green-50 p-2 rounded">{success}</p>}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded shadow mb-4 grid grid-cols-3 gap-3"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cédula *</label>
            <input
              type="text"
              required
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
              disabled={!!editando}
              className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm ${editando ? 'bg-gray-100' : ''}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos *</label>
            <input
              type="text"
              required
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="text"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ejemplo@correo.com"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha nacimiento</label>
            <div className="flex gap-1">
              <select
                value={form.dia_nac}
                onChange={(e) => setForm({ ...form, dia_nac: e.target.value })}
                className="w-16 border border-gray-300 rounded px-1 py-1.5 text-sm"
              >
                <option value="">Día</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <select
                value={form.mes_nac}
                onChange={(e) => setForm({ ...form, mes_nac: e.target.value })}
                className="w-20 border border-gray-300 rounded px-1 py-1.5 text-sm"
              >
                <option value="">Mes</option>
                {[
                  'Ene',
                  'Feb',
                  'Mar',
                  'Abr',
                  'May',
                  'Jun',
                  'Jul',
                  'Ago',
                  'Sep',
                  'Oct',
                  'Nov',
                  'Dic',
                ].map((m, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={form.anio_nac}
                onChange={(e) => setForm({ ...form, anio_nac: e.target.value })}
                className="w-20 border border-gray-300 rounded px-1 py-1.5 text-sm"
              >
                <option value="">Año</option>
                {Array.from({ length: 80 }, (_, i) => {
                  const y = new Date().getFullYear() - i - 10;
                  return (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
            <select
              value={form.ciudad_id}
              onChange={(e) => setForm({ ...form, ciudad_id: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="">-- Seleccionar --</option>
              {ciudades.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sexo</label>
            <select
              value={form.sexo_id}
              onChange={(e) => setForm({ ...form, sexo_id: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="">-- Seleccionar --</option>
              {sexos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cómo se enteró</label>
            <select
              value={form.canal_captacion_id}
              onChange={(e) => setForm({ ...form, canal_captacion_id: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="">-- Seleccionar --</option>
              {canales.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas generales</label>
            <input
              type="text"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas de salud</label>
            <input
              type="text"
              value={form.notas_salud}
              onChange={(e) => setForm({ ...form, notas_salud: e.target.value })}
              placeholder="Lesiones, restricciones..."
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-3 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.consentimiento_datos === 1}
                onChange={(e) =>
                  setForm({ ...form, consentimiento_datos: e.target.checked ? 1 : 0 })
                }
              />
              Autoriza tratamiento de datos personales
            </label>
            <button
              type="submit"
              className="ml-auto bg-gray-900 text-white px-4 py-1.5 rounded text-sm"
            >
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* Búsqueda */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, cédula o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">Cédula</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Teléfono</th>
              <th className="px-3 py-2">Ciudad</th>
              <th className="px-3 py-2">Sexo</th>
              <th className="px-3 py-2">Edad</th>
              <th className="px-3 py-2">Canal</th>
              <th className="px-3 py-2">Salud</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-center text-gray-400">
                  No hay clientes registrados
                </td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.cedula} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{c.cedula}</td>
                  <td className="px-3 py-2">
                    {c.nombre} {c.apellidos}
                  </td>
                  <td className="px-3 py-2">{c.telefono || '-'}</td>
                  <td className="px-3 py-2">{c.ciudad_nombre || '-'}</td>
                  <td className="px-3 py-2">{c.sexo_nombre || '-'}</td>
                  <td className="px-3 py-2">{c.edad ?? '-'}</td>
                  <td className="px-3 py-2 text-xs">{c.canal_captacion_nombre || '-'}</td>
                  <td className="px-3 py-2 text-xs text-orange-600">{c.notas_salud || '-'}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => abrirEditar(c)}
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
