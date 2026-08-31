import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { TableSkeletonRows } from '../components/Skeleton';

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
interface VentaDetalle extends VentaResumen {
  subtotal: number;
  iva: number;
  notas: string | null;
  updated_by: string | null;
  updated_at: string | null;
  motivo_anulacion: string | null;
  items: Array<{
    id: number;
    tipo_item: string;
    producto_sku: string | null;
    plan_id: number | null;
    producto_nombre: string | null;
    plan_nombre: string | null;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
  pagos: Array<{
    id: number;
    monto: number;
    fecha: string;
    metodo_pago_nombre: string;
    referencia: string | null;
  }>;
  total_pagado: number;
  saldo_pendiente: number;
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
  const [searchParams] = useSearchParams();
  const [vista, setVista] = useState<'lista' | 'nueva' | 'detalle'>('lista');
  // Modal de anulación (id de la venta a anular + motivo)
  const [anularId, setAnularId] = useState<number | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [ventaDetalle, setVentaDetalle] = useState<VentaDetalle | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') || '');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<'fecha' | 'total' | 'cliente' | 'estado'>('fecha');
  const [ordenDir, setOrdenDir] = useState<'asc' | 'desc'>('desc');

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

  // Form pago en detalle
  const [nuevopagoMonto, setNuevopagoMonto] = useState('');
  const [nuevopagoMetodo, setNuevopagoMetodo] = useState('');
  const [nuevopagoRef, setNuevopagoRef] = useState('');

  const cargarVentas = async () => {
    setLoading(true);
    try {
      let url = '/ventas?';
      if (filtroEstado) url += `estado=${filtroEstado}&`;
      if (filtroTipo) url += `tipo=${filtroTipo}&`;
      const res = await api.get<ApiResponse<VentaResumen[]>>(url);
      setVentas(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
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
      /* */
    }
  };

  const buscarCliente = async () => {
    if (busquedaCliente.length < 2) return;
    try {
      const res = await api.get<ApiResponse<Cliente[]>>(`/clientes/buscar?q=${busquedaCliente}`);
      setClientes(res.data);
    } catch {
      /* */
    }
  };

  const verDetalle = async (id: number) => {
    try {
      const res = await api.get<ApiResponse<VentaDetalle>>(`/ventas/${id}`);
      setVentaDetalle(res.data);
      setVista('detalle');
      setError('');
      setSuccess('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando detalle');
    }
  };

  // Abre el modal que pide el motivo antes de anular
  const abrirAnular = (id: number) => {
    setAnularId(id);
    setMotivoAnulacion('');
    setError('');
  };

  const cerrarAnular = () => {
    setAnularId(null);
    setMotivoAnulacion('');
  };

  const confirmarAnular = async () => {
    if (anularId === null) return;
    if (!motivoAnulacion.trim()) {
      setError('Debes indicar el motivo de la anulación');
      return;
    }
    setAnulando(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/ventas/${anularId}/anular`, {
        motivo: motivoAnulacion.trim(),
      });
      setSuccess('Venta anulada. Stock restaurado.');
      const anuladaId = anularId;
      cerrarAnular();
      cargarVentas();
      if (ventaDetalle?.id === anuladaId) verDetalle(anuladaId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error anulando');
    } finally {
      setAnulando(false);
    }
  };

  const registrarPago = async () => {
    if (!ventaDetalle || !nuevopagoMonto || !nuevopagoMetodo) {
      setError('Monto y método de pago son obligatorios');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api.post('/pagos', {
        venta_id: ventaDetalle.id,
        monto: Math.round(Number(nuevopagoMonto) * 100),
        metodo_pago_id: Number(nuevopagoMetodo),
        referencia: nuevopagoRef || undefined,
      });
      setSuccess('Pago registrado');
      setNuevopagoMonto('');
      setNuevopagoMetodo('');
      setNuevopagoRef('');
      verDetalle(ventaDetalle.id);
      cargarVentas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registrando pago');
    }
  };

  useEffect(() => {
    cargarVentas();
    cargarDatos();
  }, []);
  useEffect(() => {
    cargarVentas();
  }, [filtroEstado, filtroTipo]);
  useEffect(() => {
    const t = setTimeout(() => buscarCliente(), 300);
    return () => clearTimeout(t);
  }, [busquedaCliente]);

  const agregarProducto = (sku: string) => {
    const prod = productos.find((p) => p.sku === sku);
    if (!prod) return;
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

  const quitarItem = (index: number) => setItems(items.filter((_, i) => i !== index));
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
      cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registrando venta');
    }
  };

  // Modal reutilizable para capturar el motivo de anulación
  const modalAnular = anularId !== null && (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-xl neu-flat p-5">
        <h3 className="text-base font-bold mb-1">Anular venta #{anularId}</h3>
        <p className="text-xs text-gray-500 mb-3">
          Se restaurará el stock y se cancelarán las suscripciones. Esta acción queda registrada.
          Indica el motivo (obligatorio).
        </p>
        <textarea
          value={motivoAnulacion}
          onChange={(e) => setMotivoAnulacion(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Ej: cliente se arrepintió, error en el registro, pago rechazado..."
          className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none resize-none"
        />
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={cerrarAnular}
            disabled={anulando}
            className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
            title="Cancelar y no anular"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarAnular}
            disabled={anulando || !motivoAnulacion.trim()}
            className="bg-red-600 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:bg-red-300"
            title="Confirmar la anulación de la venta"
          >
            {anulando ? 'Anulando...' : 'Anular venta'}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── VISTA DETALLE ────────────────────────────────────
  if (vista === 'detalle' && ventaDetalle) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Venta #{ventaDetalle.id}</h2>
          <button
            onClick={() => {
              setVista('lista');
              setError('');
              setSuccess('');
            }}
            className="text-sm text-gray-500 hover:text-gray-800"
            title="Volver a la lista de ventas"
          >
            ← Volver
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm mb-3 bg-green-50 p-2 rounded">{success}</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Info + Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-xl neu-flat">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Cliente:</span>{' '}
                  <span className="font-medium">
                    {ventaDetalle.cliente_nombre
                      ? `${ventaDetalle.cliente_nombre} ${ventaDetalle.cliente_apellidos}`
                      : 'Sin cliente'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Fecha:</span> {ventaDetalle.fecha.split(' ')[0]}
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>{' '}
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${ventaDetalle.estado === 'pagada' ? 'bg-green-100 text-green-700' : ventaDetalle.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {ventaDetalle.estado}
                  </span>
                </div>
              </div>
              {ventaDetalle.notas && (
                <p className="text-xs text-gray-500">Notas: {ventaDetalle.notas}</p>
              )}
              {ventaDetalle.estado === 'anulada' && (
                <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                  <span className="font-medium">Venta anulada</span>
                  {ventaDetalle.updated_by && <> por {ventaDetalle.updated_by}</>}
                  {ventaDetalle.updated_at && <> el {ventaDetalle.updated_at.split(' ')[0]}</>}.
                  {ventaDetalle.motivo_anulacion && (
                    <>
                      {' '}
                      Motivo: <span className="italic">{ventaDetalle.motivo_anulacion}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="p-4 rounded-xl neu-flat">
              <h3 className="text-sm font-medium mb-2">Items</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 text-left">
                  <tr>
                    <th className="pb-1">Producto/Plan</th>
                    <th className="pb-1 w-16">Cant.</th>
                    <th className="pb-1 text-right">P. Unit.</th>
                    <th className="pb-1 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {ventaDetalle.items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="py-1.5">{item.producto_nombre || item.plan_nombre}</td>
                      <td className="py-1.5">{item.cantidad}</td>
                      <td className="py-1.5 text-right text-xs">
                        {formatCOP(item.precio_unitario)}
                      </td>
                      <td className="py-1.5 text-right font-medium">{formatCOP(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200">
                  <tr>
                    <td colSpan={3} className="py-1.5 text-right text-xs text-gray-500">
                      Subtotal:
                    </td>
                    <td className="py-1.5 text-right">{formatCOP(ventaDetalle.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="text-right text-xs text-gray-500">
                      IVA:
                    </td>
                    <td className="text-right">{formatCOP(ventaDetalle.iva)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="text-right font-bold">
                      Total:
                    </td>
                    <td className="text-right font-bold">{formatCOP(ventaDetalle.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Historial de pagos */}
            <div className="p-4 rounded-xl neu-flat">
              <h3 className="text-sm font-medium mb-2">Pagos realizados</h3>
              {ventaDetalle.pagos.length === 0 ? (
                <p className="text-xs text-gray-400">No hay pagos registrados.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 text-left">
                    <tr>
                      <th className="pb-1">Fecha</th>
                      <th className="pb-1">Método</th>
                      <th className="pb-1">Referencia</th>
                      <th className="pb-1 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventaDetalle.pagos.map((p) => (
                      <tr key={p.id} className="border-t border-gray-100">
                        <td className="py-1.5 text-xs">{p.fecha.split(' ')[0]}</td>
                        <td className="py-1.5">{p.metodo_pago_nombre}</td>
                        <td className="py-1.5 text-xs text-gray-500">{p.referencia || '-'}</td>
                        <td className="py-1.5 text-right font-medium">{formatCOP(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Columna derecha: resumen pagos + registrar pago */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl neu-flat">
              <h3 className="text-sm font-medium mb-3">Resumen de pagos</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total venta:</span>
                  <span>{formatCOP(ventaDetalle.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pagado:</span>
                  <span className="text-green-600">{formatCOP(ventaDetalle.total_pagado)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Saldo pendiente:</span>
                  <span
                    className={ventaDetalle.saldo_pendiente > 0 ? 'text-red-600' : 'text-green-600'}
                  >
                    {formatCOP(ventaDetalle.saldo_pendiente)}
                  </span>
                </div>
              </div>
            </div>

            {/* Registrar pago (solo si hay saldo pendiente) */}
            {ventaDetalle.saldo_pendiente > 0 && ventaDetalle.estado !== 'anulada' && (
              <div className="p-4 rounded-xl neu-flat">
                <h3 className="text-sm font-medium mb-2">Registrar pago</h3>
                <div className="space-y-2">
                  <input
                    type="number"
                    min="1"
                    value={nuevopagoMonto}
                    onChange={(e) => setNuevopagoMonto(e.target.value)}
                    placeholder={`Máx: ${(ventaDetalle.saldo_pendiente / 100).toLocaleString()}`}
                    className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
                  />
                  <select
                    value={nuevopagoMetodo}
                    onChange={(e) => setNuevopagoMetodo(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
                  >
                    <option value="">-- Método --</option>
                    {metodosPago.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={nuevopagoRef}
                    onChange={(e) => setNuevopagoRef(e.target.value)}
                    placeholder="Referencia (opcional)"
                    className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
                  />
                  <button
                    onClick={registrarPago}
                    className="w-full bg-gray-900 text-white py-1.5 rounded text-sm"
                    title="Registrar abono o pago de la venta"
                  >
                    Registrar pago
                  </button>
                </div>
              </div>
            )}

            {/* Anular */}
            {ventaDetalle.estado !== 'anulada' && (
              <button
                onClick={() => abrirAnular(ventaDetalle.id)}
                className="w-full border border-red-300 text-red-600 py-1.5 rounded text-sm hover:bg-red-50"
                title="Anular esta venta"
              >
                Anular venta
              </button>
            )}
          </div>
        </div>
        {modalAnular}
      </div>
    );
  }

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
            className="text-gray-700 font-medium px-4 py-2 rounded-lg text-sm neu-btn"
            title="Registrar una nueva venta"
          >
            + Nueva venta
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm mb-3 bg-green-50 p-2 rounded">{success}</p>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-3">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
            <option value="anulada">Anulada</option>
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
          >
            <option value="">Todos los tipos</option>
            <option value="nueva">Nueva</option>
            <option value="recompra">Recompra</option>
          </select>
          {(filtroEstado || filtroTipo) && (
            <button
              onClick={() => {
                setFiltroEstado('');
                setFiltroTipo('');
              }}
              className="text-xs text-gray-500 hover:text-gray-800"
              title="Quitar todos los filtros"
            >
              Limpiar filtros
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">{ventas.length} resultado(s)</span>
        </div>

        <div className="rounded-xl neu-flat overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th
                  className="px-3 py-2 cursor-pointer hover:text-gray-900"
                  onClick={() => {
                    setOrdenarPor('fecha');
                    setOrdenDir(ordenarPor === 'fecha' && ordenDir === 'desc' ? 'asc' : 'desc');
                  }}
                >
                  Fecha {ordenarPor === 'fecha' && (ordenDir === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="px-3 py-2 cursor-pointer hover:text-gray-900"
                  onClick={() => {
                    setOrdenarPor('cliente');
                    setOrdenDir(ordenarPor === 'cliente' && ordenDir === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Cliente {ordenarPor === 'cliente' && (ordenDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2">Tipo</th>
                <th
                  className="px-3 py-2 text-right cursor-pointer hover:text-gray-900"
                  onClick={() => {
                    setOrdenarPor('total');
                    setOrdenDir(ordenarPor === 'total' && ordenDir === 'desc' ? 'asc' : 'desc');
                  }}
                >
                  Total {ordenarPor === 'total' && (ordenDir === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="px-3 py-2 cursor-pointer hover:text-gray-900"
                  onClick={() => {
                    setOrdenarPor('estado');
                    setOrdenDir(ordenarPor === 'estado' && ordenDir === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Estado {ordenarPor === 'estado' && (ordenDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows cols={7} />
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                    No hay ventas registradas
                  </td>
                </tr>
              ) : (
                [...ventas]
                  .sort((a, b) => {
                    let cmp = 0;
                    if (ordenarPor === 'fecha') cmp = a.fecha.localeCompare(b.fecha);
                    else if (ordenarPor === 'total') cmp = a.total - b.total;
                    else if (ordenarPor === 'cliente')
                      cmp = (a.cliente_nombre || '').localeCompare(b.cliente_nombre || '');
                    else if (ordenarPor === 'estado')
                      cmp = (a.estado || '').localeCompare(b.estado || '');
                    return ordenDir === 'desc' ? -cmp : cmp;
                  })
                  .map((v) => (
                    <tr
                      key={v.id}
                      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => verDetalle(v.id)}
                    >
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
                      <td className="px-3 py-2">
                        {v.estado !== 'anulada' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirAnular(v.id);
                            }}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                            title="Anular venta"
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
        {modalAnular}
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
          title="Volver a la lista de ventas"
        >
          ← Volver
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Cliente */}
          <div className="p-4 rounded-xl neu-flat">
            <h3 className="text-sm font-medium mb-2">Cliente (opcional)</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="Buscar por nombre o cédula..."
                className="flex-1 rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
              />
              {clienteCedula && (
                <button
                  onClick={() => {
                    setClienteCedula('');
                    setBusquedaCliente('');
                  }}
                  className="text-xs text-red-500"
                  title="Quitar cliente seleccionado"
                >
                  ✕
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
                    title="Seleccionar este cliente"
                  >
                    {c.nombre} {c.apellidos} — {c.cedula}
                  </button>
                ))}
              </div>
            )}
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
                  className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
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

          {/* Items */}
          {items.length > 0 && (
            <div className="p-4 rounded-xl neu-flat">
              <h3 className="text-sm font-medium mb-2">Items</h3>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="pb-1">Item</th>
                    <th className="pb-1 w-20">Cant.</th>
                    <th className="pb-1 text-right">P. Unit.</th>
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
                      <td className="py-1.5 text-right text-xs">
                        {formatCOP(item.precio_unitario)}
                      </td>
                      <td className="py-1.5 text-right font-medium">
                        {formatCOP(item.precio_unitario * item.cantidad)}
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          onClick={() => quitarItem(idx)}
                          className="text-red-500 text-xs"
                          title="Quitar producto"
                        >
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
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCOP(totalVenta)}</span>
            </div>
          </div>
          <div className="p-4 rounded-xl neu-flat">
            <h3 className="text-sm font-medium mb-2">Tipo</h3>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'nueva' | 'recompra')}
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            >
              <option value="nueva">Nueva</option>
              <option value="recompra">Recompra</option>
            </select>
          </div>
          <div className="p-4 rounded-xl neu-flat">
            <h3 className="text-sm font-medium mb-2">Pago (opcional)</h3>
            <p className="text-xs text-gray-400 mb-2">Sin pago = queda pendiente.</p>
            <div className="space-y-2">
              <input
                type="number"
                min="0"
                value={pagoMonto}
                onChange={(e) => setPagoMonto(e.target.value)}
                placeholder="Monto en pesos"
                className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
              />
              <select
                value={pagoMetodo}
                onChange={(e) => setPagoMetodo(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
              >
                <option value="">-- Método --</option>
                {metodosPago.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-4 rounded-xl neu-flat">
            <h3 className="text-sm font-medium mb-2">Notas</h3>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional..."
              className="w-full rounded-lg px-3 py-2 text-sm neu-pressed outline-none"
            />
          </div>
          <button
            onClick={registrarVenta}
            disabled={items.length === 0}
            className="w-full bg-gray-900 text-white py-2.5 rounded text-sm font-medium disabled:bg-gray-400"
            title="Guardar y registrar la venta"
          >
            Registrar venta
          </button>
        </div>
      </div>
    </div>
  );
}
