import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Producto {
  sku: string;
  nombre: string;
  categoria_id: number;
  unidad_medida_id: number;
  categoria_nombre: string;
  unidad_medida_nombre: string;
  unidad_medida_abreviatura: string;
  proveedor_nit: string | null;
  proveedor_nombre: string | null;
  variante: string | null;
  notas: string | null;
  precio_venta: number;
  precio_costo: number;
  stock_actual: number;
  stock_minimo: number;
  aplica_iva: number;
  porcentaje_iva: number;
  activo: number;
}

interface Catalogo {
  id: number;
  nombre: string;
}
interface CatalogoUM extends Catalogo {
  abreviatura: string;
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

const FORM_VACIO = {
  sku: '',
  nombre: '',
  categoria_id: '',
  unidad_medida_id: '',
  proveedor_nit: '',
  variante: '',
  notas_producto: '',
  precio_venta: '',
  precio_costo: '',
  stock_actual: '',
  stock_minimo: '5',
  aplica_iva: 1,
  porcentaje_iva: '19',
};

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null); // SKU editándose
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [categorias, setCategorias] = useState<Catalogo[]>([]);
  const [unidades, setUnidades] = useState<CatalogoUM[]>([]);
  const [proveedores, setProveedores] = useState<Tercero[]>([]);
  const [form, setForm] = useState(FORM_VACIO);

  // Filtros y ordenamiento
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStock, setFiltroStock] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<string>('nombre');
  const [ordenDir, setOrdenDir] = useState<'asc' | 'desc'>('asc');

  const toggleOrden = (campo: string) => {
    if (ordenarPor === campo) setOrdenDir(ordenDir === 'asc' ? 'desc' : 'asc');
    else {
      setOrdenarPor(campo);
      setOrdenDir('asc');
    }
  };

  const productosFiltrados = productos
    .filter((p) => !filtroCategoria || p.categoria_nombre === filtroCategoria)
    .filter(
      (p) =>
        !filtroStock ||
        (filtroStock === 'bajo' && p.stock_actual <= p.stock_minimo) ||
        (filtroStock === 'ok' && p.stock_actual > p.stock_minimo),
    )
    .sort((a, b) => {
      let cmp = 0;
      if (ordenarPor === 'nombre') cmp = a.nombre.localeCompare(b.nombre);
      else if (ordenarPor === 'categoria')
        cmp = a.categoria_nombre.localeCompare(b.categoria_nombre);
      else if (ordenarPor === 'unidad')
        cmp = a.unidad_medida_nombre.localeCompare(b.unidad_medida_nombre);
      else if (ordenarPor === 'stock') cmp = a.stock_actual - b.stock_actual;
      else if (ordenarPor === 'precio') cmp = a.precio_venta - b.precio_venta;
      return ordenDir === 'desc' ? -cmp : cmp;
    });

  const cargarProductos = async () => {
    try {
      const res = await api.get<ApiResponse<Producto[]>>('/productos');
      setProductos(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando productos');
    }
  };

  const cargarCatalogos = async () => {
    try {
      const [cat, uni, prov] = await Promise.all([
        api.get<ApiResponse<Catalogo[]>>('/categorias-producto'),
        api.get<ApiResponse<CatalogoUM[]>>('/catalogos/unidades-medida'),
        api.get<ApiResponse<Tercero[]>>('/terceros?tipo_tercero_id=1'),
      ]);
      setCategorias(cat.data);
      setUnidades(uni.data);
      setProveedores(prov.data || []);
    } catch {
      /* catálogos pueden fallar si no hay proveedores */
    }
  };

  useEffect(() => {
    cargarProductos();
    cargarCatalogos();
  }, []);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setEditando(null);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const abrirEditar = (p: Producto) => {
    setForm({
      sku: p.sku,
      nombre: p.nombre,
      categoria_id: String(p.categoria_id),
      unidad_medida_id: String(p.unidad_medida_id),
      proveedor_nit: p.proveedor_nit || '',
      variante: p.variante || '',
      notas_producto: p.notas || '',
      precio_venta: String(p.precio_venta / 100),
      precio_costo: String(p.precio_costo / 100),
      stock_actual: String(p.stock_actual),
      stock_minimo: String(p.stock_minimo),
      aplica_iva: p.aplica_iva,
      porcentaje_iva: String(p.porcentaje_iva),
    });
    setEditando(p.sku);
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

    if (
      !form.nombre ||
      !form.categoria_id ||
      !form.unidad_medida_id ||
      !form.precio_venta ||
      !form.precio_costo
    ) {
      setError('Nombre, categoría, unidad de medida, precio venta y precio costo son obligatorios');
      return;
    }

    const body = {
      nombre: form.nombre,
      categoria_id: Number(form.categoria_id),
      unidad_medida_id: Number(form.unidad_medida_id),
      proveedor_nit: form.proveedor_nit || undefined,
      variante: form.variante || undefined,
      notas: form.notas_producto || undefined,
      precio_venta: Math.round(Number(form.precio_venta) * 100),
      precio_costo: Math.round(Number(form.precio_costo) * 100),
      stock_actual: Number(form.stock_actual) || 0,
      stock_minimo: Number(form.stock_minimo) || 5,
      aplica_iva: form.aplica_iva,
      porcentaje_iva: Number(form.porcentaje_iva) || 19,
    };

    try {
      if (editando) {
        await api.put(`/productos/${editando}`, body);
        setSuccess('Producto actualizado');
      } else {
        await api.post('/productos', { sku: form.sku || undefined, ...body });
        setSuccess('Producto creado exitosamente');
      }
      cerrarForm();
      cargarProductos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando producto');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Productos</h2>
        <button
          onClick={showForm ? cerrarForm : abrirCrear}
          className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
        >
          {showForm ? 'Cancelar' : '+ Nuevo producto'}
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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              SKU {editando ? '' : <span className="text-gray-400">(auto)</span>}
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
              disabled={!!editando}
              placeholder="Se genera automáticamente"
              className={`w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none font-mono ${editando ? 'bg-gray-100' : 'bg-gray-50'}`}
            />
          </div>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría *</label>
            <select
              required
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            >
              <option value="">-- Seleccionar --</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Unidad de medida *
            </label>
            <select
              required
              value={form.unidad_medida_id}
              onChange={(e) => setForm({ ...form, unidad_medida_id: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            >
              <option value="">-- Seleccionar --</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.abreviatura})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
            <select
              value={form.proveedor_nit}
              onChange={(e) => setForm({ ...form, proveedor_nit: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            >
              <option value="">-- Sin proveedor --</option>
              {proveedores.map((p) => (
                <option key={p.nit} value={p.nit}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Variante / Presentación
            </label>
            <input
              type="text"
              value={form.variante}
              onChange={(e) => setForm({ ...form, variante: e.target.value })}
              placeholder="Vainilla, Chocolate, NA..."
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <input
              type="text"
              value={form.notas_producto}
              onChange={(e) => setForm({ ...form, notas_producto: e.target.value })}
              placeholder="Observaciones..."
              className="w-full bg-[#e0e5ec] rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Precio venta (COP) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={form.precio_venta}
              onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
              placeholder="85000"
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Precio costo (COP) *
            </label>
            <input
              type="number"
              required
              min="0"
              value={form.precio_costo}
              onChange={(e) => setForm({ ...form, precio_costo: e.target.value })}
              placeholder="50000"
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stock actual</label>
            <input
              type="number"
              min="0"
              value={form.stock_actual}
              onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
              placeholder="0"
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stock mínimo</label>
            <input
              type="number"
              min="0"
              value={form.stock_minimo}
              onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.aplica_iva === 1}
                onChange={(e) => setForm({ ...form, aplica_iva: e.target.checked ? 1 : 0 })}
              />
              Aplica IVA
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
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
            >
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-3 items-center">
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroStock}
          onChange={(e) => setFiltroStock(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
        >
          <option value="">Todo el stock</option>
          <option value="bajo">Stock bajo</option>
          <option value="ok">Stock OK</option>
        </select>
        {(filtroCategoria || filtroStock) && (
          <button
            onClick={() => {
              setFiltroCategoria('');
              setFiltroStock('');
            }}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {productosFiltrados.length} resultado(s)
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-xl neu-flat overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th
                className="px-3 py-2 cursor-pointer hover:text-gray-900"
                onClick={() => toggleOrden('nombre')}
              >
                Nombre {ordenarPor === 'nombre' && (ordenDir === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-3 py-2 cursor-pointer hover:text-gray-900"
                onClick={() => toggleOrden('categoria')}
              >
                Categoría {ordenarPor === 'categoria' && (ordenDir === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-3 py-2 cursor-pointer hover:text-gray-900"
                onClick={() => toggleOrden('unidad')}
              >
                Unidad {ordenarPor === 'unidad' && (ordenDir === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer hover:text-gray-900"
                onClick={() => toggleOrden('precio')}
              >
                P. Venta {ordenarPor === 'precio' && (ordenDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2 text-right">P. Costo</th>
              <th
                className="px-3 py-2 text-center cursor-pointer hover:text-gray-900"
                onClick={() => toggleOrden('stock')}
              >
                Stock {ordenarPor === 'stock' && (ordenDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2">Proveedor</th>
              <th className="px-3 py-2">IVA</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-4 text-center text-gray-400">
                  No hay productos registrados
                </td>
              </tr>
            ) : (
              productosFiltrados.map((p) => (
                <tr key={p.sku} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                  <td className="px-3 py-2">{p.nombre}</td>
                  <td className="px-3 py-2 text-xs">{p.categoria_nombre}</td>
                  <td className="px-3 py-2 text-xs">{p.unidad_medida_abreviatura}</td>
                  <td className="px-3 py-2 text-right">{formatCOP(p.precio_venta)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {formatCOP(p.precio_costo)}
                  </td>
                  <td
                    className={`px-3 py-2 text-center font-medium ${p.stock_actual <= p.stock_minimo ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {p.stock_actual}
                  </td>
                  <td className="px-3 py-2 text-xs">{p.proveedor_nombre || '-'}</td>
                  <td className="px-3 py-2 text-xs">
                    {p.aplica_iva ? `${p.porcentaje_iva}%` : 'No'}
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
