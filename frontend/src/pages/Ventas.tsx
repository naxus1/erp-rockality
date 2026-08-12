import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Producto {
  sku: string;
  nombre: string;
  precio_venta: number;
  stock_actual: number;
}
interface Plan {
  id: number;
  nombre: string;
  modalidad: string;
  duracion_dias: number;
  precio: number;
}
interface Cliente {
  cedula: string;
  nombre: string;
  apellidos: string;
}
interface MetodoPago {
  id: number;
  nombre: string;
}
interface VentaResumen {
  id: number;
  cliente_cedula: string | null;
  cliente_nombre: string | null;
  cliente_apellidos: string | null;
  fecha: string;
  total: number;
  tipo: string;
  estado: string;
}
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ItemVenta {
  tipo_item: 'producto' | 'plan';
  producto_sku?: string;
  plan_id?: number;
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

export default function Ventas() {
  const [vista, setVista] = useState<'lista' | 'nueva'>('lista');
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Datos para nueva venta
  const [productos, setProductos] = useState<Producto[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);

  // Form nueva venta
  const [clienteCedula, setClienteCedula] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [items, setItems] = useState<ItemVenta[]>([]);
  const [tipo, setTipo] = useState<'nueva' | 'recompra'>('nueva');
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('');
  const [notas, setNotas] = useState('');

  const cargarVentas = async () => {
    try {
      const res = await api.get<ApiResponse<VentaResumen[]>>('/ventas');
      setVentas(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando ventas');
    }
  };

  const cargarDatos = async () => {
    try {
      const [prod, plan, mp] = await Promise.all([
        api.get<ApiResponse<Producto[]>>('/productos'),
        api.get<ApiResponse<Plan[]>>('/catalogos/planes'),
        api.get<ApiResponse<MetodoPago[]>>('/catalogos/metodos-pago'),
      ]);
      setProductos(prod.data);
      setPlanes(plan.data || []);
      setMetodosPago(mp.data);
    } catch {
      /* planes puede no tener endpoint aún */
    }
  };

  const buscarCliente = async () => {
    if (busquedaCliente.length < 2) return;
    try {
      const res = await api.get<ApiResponse<Cliente[]>>(`/clientes/buscar?q=${busquedaCliente}`);
      setClientes(res.data);
    } catch {
      /* silenciar */
    }
  };

  useEffect(() => {
    cargarVentas();
    cargarDatos();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => buscarCliente(), 300);
    return () => clearTimeout(t);
  }, [busquedaCliente]);

  const agregarProducto = (sku: string) => {
    const prod = productos.find((p) => p.sku === sku);
    if (!prod) return;
    // Si ya está, incrementar cantidad
    const existente = items.find((i) => i.tipo_item === 'producto' && i.producto_sku === sku);
    if (existente) {
      setItems(items.map((i) => (i === existente ? { ...i, cantidad: i.cantidad + 1 } : i)));
    } else {
      setItems([
        ...items,
        {
          tipo_item: 'producto',
          producto_sku: sku,
          nombre: prod.nombre,
          cantidad: 1,
          precio_unitario: prod.precio_venta,
        },
      ]);
    }
  };

  const agregarPlan = (planId: number) => {
    const plan = planes.find((p) => p.id === planId);
    if (!plan) return;
    setItems([
      ...items,
      {
        tipo_item: 'plan',
        plan_id: planId,
        nombre: `${plan.nombre} (${plan.modalidad}, ${plan.duracion_dias} días)`,
        cantidad: 1,
        precio_unitario: plan.precio,
      },
    ]);
  };

  const quitarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const cambiarCantidad = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    setItems(items.map((item, i) => (i === index ? { ...item, cantidad } : item)));
  };

  const totalVenta = items.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0);

  const registrarVenta = async () => {
    setError('');
    setSuccess('');

    if (items.length === 0) {
      setError('Agrega al menos un producto o plan');
      return;
    }

    const body: Record<string, unknown> = {
      cliente_cedula: clienteCedula || undefined,
      tipo,
      items: items.map((i) => ({
        tipo_item: i.tipo_item,
        producto_sku: i.producto_sku,
        plan_id: i.plan_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      })),
      notas: notas || undefined,
    };

    if (pagoMonto && pagoMetodo) {
      body.pago_inmediato = {
        monto: Math.round(Number(pagoMonto) * 100),
        metodo_pago_id: Number(pagoMetodo),
      };
    }

    try {
      await api.post('/ventas', body);
      setSuccess('Venta registrada exitosamente');
      setItems([]);
      setClienteCedula('');
      setBusquedaCliente('');
      setPagoMonto('');
      setPagoMetodo('');
      setNotas('');
      setVista('lista');
      cargarVentas();
      cargarDatos(); // refrescar stock
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registrando venta');
    }
  };

  // ─── VISTA LISTA ──────────────────────────────────────
  if (vista === 'lista') {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Ventas</h2>
          <button
            onClick={() => {
              setVista('nueva');
              setError('');
              setSuccess('');
            }}
            className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm"
          >
            + Nueva venta
          </button>
        </div>

        {success && (
          <p className="text-green-600 text-sm mb-3 bg-green-50 p-2 rounded">{success}</p>
        )}

        <div className="bg-white rounded shadow overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-gray-400">
                    No hay ventas registradas
                  </td>
                </tr>
              ) : (
                ventas.map((v) => (
                  <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{v.id}</td>
                    <td className="px-3 py-2 text-xs">{v.fecha.split(' ')[0]}</td>
                    <td className="px-3 py-2">
                      {v.cliente_nombre
                        ? `${v.cliente_nombre} ${v.cliente_apellidos}`
                        : 'Sin cliente'}
                    </td>
                    <td className="px-3 py-2 text-xs">{v.tipo}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCOP(v.total)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${v.estado === 'pagada' ? 'bg-green-100 text-green-700' : v.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {v.estado}
                      </span>
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

  // ─── VISTA NUEVA VENTA ────────────────────────────────
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Nueva venta</h2>
        <button
          onClick={() => setVista('lista')}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Volver al listado
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}

      <div className="grid grid-cols-3 gap-4">
        {/* Columna izquierda: Cliente + Items */}
        <div className="col-span-2 space-y-4">
          {/* Cliente */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium mb-2">Cliente (opcional)</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="Buscar por nombre o cédula..."
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
              {clienteCedula && (
                <button
                  onClick={() => {
                    setClienteCedula('');
                    setBusquedaCliente('');
                  }}
                  className="text-xs text-red-500"
                >
                  ✕ Quitar
                </button>
              )}
            </div>
            {clientes.length > 0 && !clienteCedula && (
              <div className="mt-2 border rounded max-h-32 overflow-auto">
                {clientes.map((c) => (
                  <button
                    key={c.cedula}
                    onClick={() => {
                      setClienteCedula(c.cedula);
                      setBusquedaCliente(`${c.nombre} ${c.apellidos}`);
                      setClientes([]);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                  >
                    {c.nombre} {c.apellidos} — {c.cedula}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Agregar productos */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium mb-2">Agregar productos</h3>
            <select
              onChange={(e) => {
                if (e.target.value) agregarProducto(e.target.value);
                e.target.value = '';
              }}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="">-- Seleccionar producto --</option>
              {productos
                .filter((p) => p.stock_actual > 0)
                .map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.nombre} — {formatCOP(p.precio_venta)} (stock: {p.stock_actual})
                  </option>
                ))}
            </select>

            {planes.length > 0 && (
              <>
                <h3 className="text-sm font-medium mb-2 mt-3">Agregar plan</h3>
                <select
                  onChange={(e) => {
                    if (e.target.value) agregarPlan(Number(e.target.value));
                    e.target.value = '';
                  }}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">-- Seleccionar plan --</option>
                  {planes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.modalidad}, {p.duracion_dias} días) — {formatCOP(p.precio)}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Items agregados */}
          {items.length > 0 && (
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm font-medium mb-2">Items de la venta</h3>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="pb-1">Item</th>
                    <th className="pb-1 w-20">Cant.</th>
                    <th className="pb-1 text-right">P. Unit.</th>
                    <th className="pb-1 text-right">Subtotal</th>
                    <th className="pb-1"></th>
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
                      <td className="py-1.5 text-right text-xs">
                        {formatCOP(item.precio_unitario)}
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

        {/* Columna derecha: Resumen + Pago */}
        <div className="space-y-4">
          {/* Resumen */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium mb-3">Resumen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Items:</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCOP(totalVenta)}</span>
              </div>
            </div>
          </div>

          {/* Tipo de venta */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium mb-2">Tipo</h3>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'nueva' | 'recompra')}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="nueva">Nueva</option>
              <option value="recompra">Recompra</option>
            </select>
          </div>

          {/* Pago */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium mb-2">Pago (opcional)</h3>
            <p className="text-xs text-gray-400 mb-2">Si no se paga ahora, queda como pendiente.</p>
            <div className="space-y-2">
              <input
                type="number"
                min="0"
                value={pagoMonto}
                onChange={(e) => setPagoMonto(e.target.value)}
                placeholder="Monto en pesos"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
              <select
                value={pagoMetodo}
                onChange={(e) => setPagoMetodo(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="">-- Método de pago --</option>
                {metodosPago.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium mb-2">Notas</h3>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional..."
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>

          {/* Botón registrar */}
          <button
            onClick={registrarVenta}
            disabled={items.length === 0}
            className="w-full bg-gray-900 text-white py-2.5 rounded text-sm font-medium disabled:bg-gray-400"
          >
            Registrar venta
          </button>
        </div>
      </div>
    </div>
  );
}
