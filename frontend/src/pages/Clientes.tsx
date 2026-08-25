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
  instagram: string | null;
  linkedin: string | null;
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
  instagram: '',
  linkedin: '',
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

  const [ficha, setFicha] = useState<{
    cliente: Cliente;
    ventas: Array<{ id: number; fecha: string; total: number; estado: string; tipo: string }>;
    suscripciones: Array<{
      id: number;
      plan_nombre: string;
      plan_modalidad: string;
      fecha_inicio: string;
      fecha_fin: string;
      estado: string;
      dias_restantes: number;
      monto_pagado: number;
    }>;
  } | null>(null);

  // Filtros y ordenamiento
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroSexo, setFiltroSexo] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<string>('nombre');
  const [ordenDir, setOrdenDir] = useState<'asc' | 'desc'>('asc');

  const toggleOrden = (campo: string) => {
    if (ordenarPor === campo) setOrdenDir(ordenDir === 'asc' ? 'desc' : 'asc');
    else {
      setOrdenarPor(campo);
      setOrdenDir('asc');
    }
  };

  const clientesFiltrados = clientes
    .filter((c) => !filtroCiudad || c.ciudad_nombre === filtroCiudad)
    .filter((c) => !filtroSexo || c.sexo_nombre === filtroSexo)
    .sort((a, b) => {
      let cmp = 0;
      if (ordenarPor === 'nombre')
        cmp = `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`);
      else if (ordenarPor === 'ciudad')
        cmp = (a.ciudad_nombre || '').localeCompare(b.ciudad_nombre || '');
      else if (ordenarPor === 'sexo')
        cmp = (a.sexo_nombre || '').localeCompare(b.sexo_nombre || '');
      else if (ordenarPor === 'edad') cmp = (a.edad || 0) - (b.edad || 0);
      else if (ordenarPor === 'salud')
        cmp = (a.notas_salud || '').localeCompare(b.notas_salud || '');
      return ordenDir === 'desc' ? -cmp : cmp;
    });

  const verFicha = async (cedula: string) => {
    try {
      const res = await api.get<ApiResponse<typeof ficha>>(`/clientes/${cedula}/ficha`);
      setFicha(res.data);
    } catch {
      /* */
    }
  };

  const cerrarFicha = () => setFicha(null);

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
      instagram: c.instagram || '',
      linkedin: c.linkedin || '',
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
      instagram: form.instagram || undefined,
      linkedin: form.linkedin || undefined,
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
          className="bg-[#e0e5ec] text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
        >
          {showForm ? 'Cancelar' : '+ Nuevo cliente'}
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Cédula *</label>
            <input
              type="text"
              required
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos *</label>
            <input
              type="text"
              required
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="text"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ejemplo@correo.com"
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
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
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
            <select
              value={form.ciudad_id}
              onChange={(e) => setForm({ ...form, ciudad_id: e.target.value })}
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
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
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
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
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
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
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas de salud</label>
            <input
              type="text"
              value={form.notas_salud}
              onChange={(e) => setForm({ ...form, notas_salud: e.target.value })}
              placeholder="Lesiones, restricciones..."
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Instagram</label>
            <input
              type="text"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              placeholder="@usuario"
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn</label>
            <input
              type="text"
              value={form.linkedin}
              onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
              placeholder="URL perfil"
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
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
              className="ml-auto bg-[#e0e5ec] text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
            >
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* Búsqueda y filtros */}
      <div className="flex gap-3 mb-3 items-center">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, cédula o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 max-w-md bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
        />
        <select
          value={filtroCiudad}
          onChange={(e) => setFiltroCiudad(e.target.value)}
          className="bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
        >
          <option value="">Todas las ciudades</option>
          {ciudades.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroSexo}
          onChange={(e) => setFiltroSexo(e.target.value)}
          className="bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
        >
          <option value="">Todos</option>
          {sexos.map((s) => (
            <option key={s.id} value={s.nombre}>
              {s.nombre}
            </option>
          ))}
        </select>
        {(filtroCiudad || filtroSexo) && (
          <button
            onClick={() => {
              setFiltroCiudad('');
              setFiltroSexo('');
            }}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {clientesFiltrados.length} resultado(s)
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-xl neu-flat overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">Cédula</th>
              <th
                className="px-3 py-2 cursor-pointer hover:text-gray-900"
                onClick={() => toggleOrden('nombre')}
              >
                Nombre {ordenarPor === 'nombre' && (ordenDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2">Teléfono</th>
              <th
                className="px-3 py-2 cursor-pointer hover:text-gray-900"
                onClick={() => toggleOrden('ciudad')}
              >
                Ciudad {ordenarPor === 'ciudad' && (ordenDir === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-3 py-2 cursor-pointer hover:text-gray-900"
                onClick={() => toggleOrden('sexo')}
              >
                Sexo {ordenarPor === 'sexo' && (ordenDir === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-3 py-2 cursor-pointer hover:text-gray-900"
                onClick={() => toggleOrden('edad')}
              >
                Edad {ordenarPor === 'edad' && (ordenDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2">Canal</th>
              <th
                className="px-3 py-2 cursor-pointer hover:text-gray-900"
                onClick={() => toggleOrden('salud')}
              >
                Salud {ordenarPor === 'salud' && (ordenDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-center text-gray-400">
                  No hay clientes registrados
                </td>
              </tr>
            ) : (
              clientesFiltrados.map((c) => (
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
                    <button
                      onClick={() => verFicha(c.cedula)}
                      className="text-green-600 hover:text-green-800 ml-2"
                      title="Ver ficha"
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
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

      {/* Ficha del cliente (modal) */}
      {ficha && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center pt-10 z-50">
          <div className="rounded-xl neu-flat-lg w-full max-w-2xl max-h-[80vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Ficha: {ficha.cliente.nombre} {ficha.cliente.apellidos}
              </h3>
              <button onClick={cerrarFicha} className="text-gray-400 hover:text-gray-800 text-lg">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-4">
              <div>
                <span className="text-gray-500">Cédula:</span> {ficha.cliente.cedula}
              </div>
              <div>
                <span className="text-gray-500">Teléfono:</span> {ficha.cliente.telefono || '-'}
              </div>
              <div>
                <span className="text-gray-500">Edad:</span> {ficha.cliente.edad ?? '-'}
              </div>
              <div>
                <span className="text-gray-500">Ciudad:</span> {ficha.cliente.ciudad_nombre || '-'}
              </div>
              <div>
                <span className="text-gray-500">Sexo:</span> {ficha.cliente.sexo_nombre || '-'}
              </div>
              <div>
                <span className="text-gray-500">Canal:</span>{' '}
                {ficha.cliente.canal_captacion_nombre || '-'}
              </div>
            </div>
            {ficha.cliente.notas_salud && (
              <p className="text-xs bg-orange-50 border border-orange-200 rounded p-2 mb-4 text-orange-800">
                Salud: {ficha.cliente.notas_salud}
              </p>
            )}

            {/* Suscripciones */}
            <h4 className="text-sm font-medium mb-2">
              Suscripciones ({ficha.suscripciones.length})
            </h4>
            {ficha.suscripciones.length === 0 ? (
              <p className="text-xs text-gray-400 mb-4">Sin suscripciones</p>
            ) : (
              <table className="w-full text-xs mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left">Plan</th>
                    <th className="px-2 py-1">Inicio</th>
                    <th className="px-2 py-1">Fin</th>
                    <th className="px-2 py-1">Estado</th>
                    <th className="px-2 py-1">Días rest.</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.suscripciones.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-2 py-1">
                        {s.plan_nombre} ({s.plan_modalidad})
                      </td>
                      <td className="px-2 py-1">{s.fecha_inicio}</td>
                      <td className="px-2 py-1">{s.fecha_fin}</td>
                      <td className="px-2 py-1">
                        <span
                          className={
                            s.estado === 'activa'
                              ? 'text-green-600'
                              : s.estado === 'vencida'
                                ? 'text-red-600'
                                : 'text-gray-500'
                          }
                        >
                          {s.estado}
                        </span>
                      </td>
                      <td
                        className={`px-2 py-1 font-medium ${s.dias_restantes <= 7 ? 'text-red-600' : ''}`}
                      >
                        {s.dias_restantes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Ventas */}
            <h4 className="text-sm font-medium mb-2">Ventas ({ficha.ventas.length})</h4>
            {ficha.ventas.length === 0 ? (
              <p className="text-xs text-gray-400">Sin ventas</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1">Fecha</th>
                    <th className="px-2 py-1">Tipo</th>
                    <th className="px-2 py-1 text-right">Total</th>
                    <th className="px-2 py-1">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.ventas.map((v) => (
                    <tr key={v.id} className="border-t">
                      <td className="px-2 py-1">{v.id}</td>
                      <td className="px-2 py-1">{v.fecha.split(' ')[0]}</td>
                      <td className="px-2 py-1">{v.tipo}</td>
                      <td className="px-2 py-1 text-right font-medium">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0,
                        }).format(v.total / 100)}
                      </td>
                      <td className="px-2 py-1">
                        <span
                          className={
                            v.estado === 'pagada'
                              ? 'text-green-600'
                              : v.estado === 'pendiente'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }
                        >
                          {v.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
