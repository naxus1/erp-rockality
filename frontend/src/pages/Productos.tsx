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
          className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm"
        >
          {showForm ? 'Cancelar' : '+ Nuevo producto'}
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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              SKU {editando ? '' : <span className="text-gray-400">(auto)</span>}
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
              disabled={!!editando}
              placeholder="Se genera automáticamente"
              className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono ${editando ? 'bg-gray-100' : 'bg-gray-50'}`}
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría *</label>
            <select
              required
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
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
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
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
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
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
              Precio venta (COP) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={form.precio_venta}
              onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
              placeholder="85000"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
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
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
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
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stock mínimo</label>
            <input
              type="number"
              min="0"
              value={form.stock_minimo}
              onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
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
                className="w-16 border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            )}
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" className="bg-gray-900 text-white px-4 py-1.5 rounded text-sm">
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Unidad</th>
              <th className="px-3 py-2 text-right">P. Venta</th>
              <th className="px-3 py-2 text-right">P. Costo</th>
              <th className="px-3 py-2 text-center">Stock</th>
              <th className="px-3 py-2">Proveedor</th>
              <th className="px-3 py-2">IVA</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-4 text-center text-gray-400">
                  No hay productos registrados
                </td>
              </tr>
            ) : (
              productos.map((p) => (
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
