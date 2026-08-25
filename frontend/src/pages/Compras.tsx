import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Producto {
  sku: string;
  nombre: string;
  precio_costo: number;
}
interface Tercero {
  nit: string;
  nombre: string;
}
interface MetodoPago {
  id: number;
  nombre: string;
}
interface CompraResumen {
  id: number;
  tercero_nit: string;
  tercero_nombre: string;
  fecha: string;
  total: number;
  factura_proveedor: string | null;
  estado: string;
}
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ItemCompra {
  producto_sku: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

function formatCOP(centavos: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(centavos / 100);
}

export default function Compras() {
  const [vista, setVista] = useState<'lista' | 'nueva'>('lista');
  const [compras, setCompras] = useState<CompraResumen[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Tercero[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);

  // Form
  const [terceroNit, setTerceroNit] = useState('');
  const [factura, setFactura] = useState('');
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [iva, setIva] = useState('');
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [notas, setNotas] = useState('');

  const cargarCompras = async () => {
    try {
      const res = await api.get<ApiResponse<CompraResumen[]>>('/compras');
      setCompras(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const cargarDatos = async () => {
    try {
      const [prod, prov, mp] = await Promise.all([
        api.get<ApiResponse<Producto[]>>('/productos?incluir_inactivos=1'),
        api.get<ApiResponse<Tercero[]>>('/terceros?tipo_tercero_id=1'),
        api.get<ApiResponse<MetodoPago[]>>('/catalogos/metodos-pago'),
      ]);
      setProductos(prod.data);
      setProveedores(prov.data || []);
      setMetodosPago(mp.data);
    } catch {
      /* */
    }
  };

  useEffect(() => {
    cargarCompras();
    cargarDatos();
  }, []);

  const agregarProducto = (sku: string) => {
    const prod = productos.find((p) => p.sku === sku);
    if (!prod) return;
    const existente = items.find((i) => i.producto_sku === sku);
    if (existente) {
      setItems(items.map((i) => (i === existente ? { ...i, cantidad: i.cantidad + 1 } : i)));
    } else {
      setItems([
        ...items,
        { producto_sku: sku, nombre: prod.nombre, cantidad: 1, precio_unitario: prod.precio_costo },
      ]);
    }
  };

  const quitarItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const cambiarCantidad = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    setItems(items.map((item, i) => (i === index ? { ...item, cantidad } : item)));
  };
  const cambiarPrecio = (index: number, precio: number) => {
    setItems(
      items.map((item, i) =>
        i === index ? { ...item, precio_unitario: Math.round(precio * 100) } : item,
      ),
    );
  };

  const subtotal = items.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0);
  const ivaNum = iva ? Math.round(Number(iva) * 100) : 0;
  const total = subtotal + ivaNum;

  const registrarCompra = async () => {
    setError('');
    setSuccess('');
    if (!terceroNit) {
      setError('Selecciona un proveedor');
      return;
    }
    if (items.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }

    try {
      await api.post('/compras', {
        tercero_nit: terceroNit,
        factura_proveedor: factura || undefined,
        items: items.map((i) => ({
          producto_sku: i.producto_sku,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
        iva: ivaNum || undefined,
        metodo_pago_id: metodoPagoId ? Number(metodoPagoId) : undefined,
        notas: notas || undefined,
      });
      setSuccess('Compra registrada. Stock actualizado.');
      setItems([]);
      setTerceroNit('');
      setFactura('');
      setIva('');
      setMetodoPagoId('');
      setNotas('');
      setVista('lista');
      cargarCompras();
      cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registrando compra');
    }
  };

  const anularCompra = async (id: number) => {
    if (!window.confirm('¿Anular esta compra? Se restará el stock.')) return;
    try {
      await api.post(`/compras/${id}/anular`, {});
      setSuccess('Compra anulada. Stock restado.');
      cargarCompras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  // ─── LISTA ────────────────────────────────────────────
  if (vista === 'lista') {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Compras</h2>
          <button
            onClick={() => {
              setVista('nueva');
              setError('');
              setSuccess('');
            }}
            className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
          >
            + Nueva compra
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm mb-3 bg-green-50 p-2 rounded">{success}</p>
        )}

        <div className="rounded-xl neu-flat overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Proveedor</th>
                <th className="px-3 py-2">Factura</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {compras.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                    No hay compras registradas
                  </td>
                </tr>
              ) : (
                compras.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{c.id}</td>
                    <td className="px-3 py-2 text-xs">{c.fecha}</td>
                    <td className="px-3 py-2">{c.tercero_nombre}</td>
                    <td className="px-3 py-2 text-xs">{c.factura_proveedor || '-'}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCOP(c.total)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${c.estado === 'registrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {c.estado !== 'anulada' && (
                        <button
                          onClick={() => anularCompra(c.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          title="Anular compra"
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
                      )}
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

  // ─── NUEVA COMPRA ─────────────────────────────────────
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Nueva compra</h2>
        <button
          onClick={() => setVista('lista')}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Volver
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* Proveedor */}
          <div className="p-4 rounded-xl neu-flat">
            <h3 className="text-sm font-medium mb-2">Proveedor *</h3>
            <select
              value={terceroNit}
              onChange={(e) => setTerceroNit(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            >
              <option value="">-- Seleccionar proveedor --</option>
              {proveedores.map((p) => (
                <option key={p.nit} value={p.nit}>
                  {p.nombre} ({p.nit})
                </option>
              ))}
            </select>
          </div>

          {/* Productos */}
          <div className="p-4 rounded-xl neu-flat">
            <h3 className="text-sm font-medium mb-2">Agregar productos</h3>
            <select
              onChange={(e) => {
                if (e.target.value) agregarProducto(e.target.value);
                e.target.value = '';
              }}
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            >
              <option value="">-- Seleccionar producto --</option>
              {productos.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.nombre} (costo: {formatCOP(p.precio_costo)})
                </option>
              ))}
            </select>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="p-4 rounded-xl neu-flat">
              <h3 className="text-sm font-medium mb-2">Productos a comprar</h3>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="pb-1">Producto</th>
                    <th className="pb-1 w-20">Cant.</th>
                    <th className="pb-1 w-28">Costo unit. ($)</th>
                    <th className="pb-1 text-right">Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="py-1.5">{item.nombre}</td>
                      <td className="py-1.5">
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => cambiarCantidad(idx, Number(e.target.value))}
                          className="w-16 border border-gray-300 rounded px-1 py-0.5 text-sm text-center"
                        />
                      </td>
                      <td className="py-1.5">
                        <input
                          type="number"
                          min="0"
                          value={item.precio_unitario / 100}
                          onChange={(e) => cambiarPrecio(idx, Number(e.target.value))}
                          className="w-24 border border-gray-300 rounded px-1 py-0.5 text-sm text-right"
                        />
                      </td>
                      <td className="py-1.5 text-right font-medium">
                        {formatCOP(item.precio_unitario * item.cantidad)}
                      </td>
                      <td className="py-1.5 text-right">
                        <button onClick={() => quitarItem(idx)} className="text-red-500 text-xs">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Columna derecha */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl neu-flat">
            <h3 className="text-sm font-medium mb-3">Resumen</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal:</span>
                <span>{formatCOP(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IVA:</span>
                <span>{formatCOP(ivaNum)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Total:</span>
                <span>{formatCOP(total)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl neu-flat space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Factura proveedor
              </label>
              <input
                type="text"
                value={factura}
                onChange={(e) => setFactura(e.target.value)}
                placeholder="Nº factura"
                className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">IVA total ($)</label>
              <input
                type="number"
                min="0"
                value={iva}
                onChange={(e) => setIva(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
              <select
                value={metodoPagoId}
                onChange={(e) => setMetodoPagoId(e.target.value)}
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
              />
            </div>
          </div>

          <button
            onClick={registrarCompra}
            disabled={items.length === 0 || !terceroNit}
            className="w-full bg-gray-900 text-white py-2.5 rounded text-sm font-medium disabled:bg-gray-400"
          >
            Registrar compra
          </button>
        </div>
      </div>
    </div>
  );
}
