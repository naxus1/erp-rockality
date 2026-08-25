import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface CatalogoItem {
  id: number;
  nombre: string;
  descripcion?: string;
  abreviatura?: string;
  prefijo_sku?: string;
}
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const CATALOGOS = [
  { key: 'ciudades', label: 'Ciudades', endpoint: '/catalogos/ciudades', canAdd: true },
  {
    key: 'categorias-producto',
    label: 'Categorías de producto',
    endpoint: '/categorias-producto',
    canAdd: true,
    hasDesc: true,
  },
  {
    key: 'unidades-medida',
    label: 'Unidades de medida',
    endpoint: '/catalogos/unidades-medida',
    canAdd: false,
  },
  {
    key: 'metodos-pago',
    label: 'Métodos de pago',
    endpoint: '/catalogos/metodos-pago',
    canAdd: false,
  },
  {
    key: 'canales-captacion',
    label: 'Canales de captación',
    endpoint: '/catalogos/canales-captacion',
    canAdd: false,
  },
  { key: 'gerencias', label: 'Gerencias', endpoint: '/catalogos/gerencias', canAdd: false },
  {
    key: 'tipos-gasto',
    label: 'Tipos de gasto',
    endpoint: '/catalogos/tipos-gasto',
    canAdd: false,
  },
  {
    key: 'categorias-gasto',
    label: 'Categorías de gasto',
    endpoint: '/catalogos/categorias-gasto',
    canAdd: false,
  },
  {
    key: 'tipos-tercero',
    label: 'Tipos de tercero',
    endpoint: '/catalogos/tipos-tercero',
    canAdd: false,
  },
  { key: 'sexos', label: 'Sexos', endpoint: '/catalogos/sexos', canAdd: false },
];

export default function Catalogos() {
  const [selected, setSelected] = useState(CATALOGOS[0]);
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cargar = async () => {
    try {
      const res = await api.get<ApiResponse<CatalogoItem[]>>(selected.endpoint);
      setItems(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  useEffect(() => {
    cargar();
    setError('');
    setSuccess('');
  }, [selected]);

  const agregar = async () => {
    if (!nuevoNombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setError('');
    setSuccess('');
    try {
      if (selected.key === 'ciudades') {
        await api.post('/catalogos/ciudades', { nombre: nuevoNombre });
      } else if (selected.key === 'categorias-producto') {
        await api.post('/categorias-producto', {
          nombre: nuevoNombre,
          descripcion: nuevaDesc || undefined,
        });
      }
      setSuccess(`"${nuevoNombre}" agregado`);
      setNuevoNombre('');
      setNuevaDesc('');
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar');
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Catálogos</h2>

      <div className="flex gap-4">
        {/* Sidebar de catálogos */}
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

          {/* Formulario agregar */}
          {selected.canAdd && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Nombre"
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
              {selected.hasDesc && (
                <input
                  type="text"
                  value={nuevaDesc}
                  onChange={(e) => setNuevaDesc(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
                />
              )}
              <button
                onClick={agregar}
                className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm"
              >
                Agregar
              </button>
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white rounded shadow overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Nombre</th>
                  {selected.hasDesc && <th className="px-3 py-2">Descripción</th>}
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
                      <td className="px-3 py-2">{item.nombre}</td>
                      {selected.hasDesc && (
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {item.descripcion || '-'}
                        </td>
                      )}
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
