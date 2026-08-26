import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface CatalogoItem {
  id: number;
  nombre: string;
  descripcion?: string;
}
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const CATALOGOS = [
  { key: 'ciudades', label: 'Ciudades' },
  { key: 'categorias-producto', label: 'Categorías de producto', useOwnEndpoint: true },
  { key: 'unidades-medida', label: 'Unidades de medida' },
  { key: 'metodos-pago', label: 'Métodos de pago' },
  { key: 'canales-captacion', label: 'Canales de captación' },
  { key: 'gerencias', label: 'Gerencias' },
  { key: 'tipos-gasto', label: 'Tipos de gasto' },
  { key: 'categorias-gasto', label: 'Categorías de gasto' },
  { key: 'tipos-tercero', label: 'Tipos de tercero' },
  { key: 'sexos', label: 'Sexos' },
];

export default function Catalogos() {
  const [selected, setSelected] = useState(CATALOGOS[0]);
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const endpoint = selected.useOwnEndpoint ? '/categorias-producto' : `/catalogos/${selected.key}`;

  const cargar = async () => {
    try {
      const res = await api.get<ApiResponse<CatalogoItem[]>>(endpoint);
      setItems(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  useEffect(() => {
    cargar();
    setError('');
    setSuccess('');
    setEditandoId(null);
  }, [selected]);

  const agregar = async () => {
    if (!nuevoNombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setError('');
    setSuccess('');
    try {
      if (selected.useOwnEndpoint) {
        await api.post('/categorias-producto', { nombre: nuevoNombre });
      } else {
        await api.post(`/catalogos/${selected.key}`, { nombre: nuevoNombre });
      }
      setSuccess(`"${nuevoNombre}" agregado`);
      setNuevoNombre('');
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar');
    }
  };

  const guardarEdicion = async () => {
    if (!editandoNombre.trim() || !editandoId) return;
    setError('');
    setSuccess('');
    try {
      if (selected.useOwnEndpoint) {
        await api.put(`/categorias-producto/${editandoId}`, { nombre: editandoNombre });
      } else {
        await api.put(`/catalogos/${selected.key}/${editandoId}`, { nombre: editandoNombre });
      }
      setSuccess('Actualizado');
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al editar');
    }
  };

  const desactivar = async (id: number, nombre: string) => {
    if (
      !window.confirm(
        `¿Desactivar "${nombre}"? No se eliminará pero dejará de aparecer en nuevos registros.`,
      )
    )
      return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/catalogos/${selected.key}/${id}`);
      setSuccess(`"${nombre}" desactivado`);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const reactivar = async (id: number, nombre: string) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/catalogos/${selected.key}/${id}/activar`);
      setSuccess(`"${nombre.replace(' (inactivo)', '')}" reactivado`);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Catálogos</h2>

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-48 space-y-1">
          {CATALOGOS.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelected(cat)}
              className={`block w-full text-left px-3 py-1.5 rounded text-sm ${selected.key === cat.key ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1">
          <h3 className="text-sm font-medium mb-3">{selected.label}</h3>

          {error && <p className="text-red-600 text-sm mb-2 bg-red-50 p-2 rounded">{error}</p>}
          {success && (
            <p className="text-green-600 text-sm mb-2 bg-green-50 p-2 rounded">{success}</p>
          )}

          {/* Agregar */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nuevo nombre"
              onKeyDown={(e) => e.key === 'Enter' && agregar()}
              className="flex-1 rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
            <button
              onClick={agregar}
              className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
            >
              Agregar
            </button>
          </div>

          {/* Tabla */}
          <div className="rounded-xl neu-flat overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-3 py-2 w-12">ID</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-gray-400">
                      Sin datos
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
                      <td className="px-3 py-2">
                        {editandoId === item.id ? (
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={editandoNombre}
                              onChange={(e) => setEditandoNombre(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && guardarEdicion()}
                              className="flex-1 border border-gray-300 rounded px-2 py-0.5 text-sm"
                              autoFocus
                            />
                            <button onClick={guardarEdicion} className="text-xs text-green-600">
                              ✓
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="text-xs text-gray-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span
                            className={
                              item.nombre.includes('(inactivo)') ? 'text-gray-400 line-through' : ''
                            }
                          >
                            {item.nombre}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editandoId !== item.id && !item.nombre.includes('(inactivo)') && (
                          <>
                            <button
                              onClick={() => {
                                setEditandoId(item.id);
                                setEditandoNombre(item.nombre);
                              }}
                              className="text-blue-600 hover:text-blue-800 mr-2"
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
                            {!selected.useOwnEndpoint && (
                              <button
                                onClick={() => desactivar(item.id, item.nombre)}
                                className="text-red-500 hover:text-red-700"
                                title="Desactivar"
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
                            )}
                          </>
                        )}
                        {item.nombre.includes('(inactivo)') && !selected.useOwnEndpoint && (
                          <button
                            onClick={() => reactivar(item.id, item.nombre)}
                            className="text-green-600 hover:text-green-800"
                            title="Activar"
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
      </div>
    </div>
  );
}
