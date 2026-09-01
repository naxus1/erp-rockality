/**
 * REPOSITORY — Caja (control de efectivo)
 *
 * Maneja el efectivo físico del negocio mediante "sesiones de caja":
 *  - Abrir sesión con un saldo inicial (fondo del cajón).
 *  - Registrar movimientos: ingresos (ventas en efectivo), egresos (gastos/
 *    compras en efectivo), retiros (entregas/consignaciones) y ajustes.
 *  - Cerrar sesión con arqueo: se cuenta el efectivo físico y se compara con el
 *    saldo esperado; la diferencia (faltante/sobrante) queda registrada.
 *
 * Saldo esperado = saldo_inicial + ingresos + ajustes - egresos - retiros.
 * Solo el efectivo pasa por caja; los pagos digitales se concilian aparte.
 *
 * Todos los montos en centavos COP (BIGINT).
 */
import { query, queryOne, type Executor } from '../db/connection.js';

export interface CajaSesion {
  id: number;
  saldo_inicial: number;
  fecha_apertura: string;
  abierta_por: string | null;
  notas_apertura: string | null;
  estado: 'abierta' | 'cerrada';
  fecha_cierre: string | null;
  cerrada_por: string | null;
  saldo_esperado: number | null;
  saldo_contado: number | null;
  diferencia: number | null;
  notas_cierre: string | null;
  created_at: string;
}

export type MovimientoTipo = 'ingreso' | 'egreso' | 'retiro' | 'ajuste';
export type MovimientoOrigen = 'venta' | 'pago' | 'gasto' | 'compra' | 'manual';

export interface CajaMovimiento {
  id: number;
  sesion_id: number;
  tipo: MovimientoTipo;
  origen: MovimientoOrigen;
  referencia_tipo: string | null;
  referencia_id: number | null;
  monto: number;
  motivo: string | null;
  fecha: string;
  created_at: string;
  created_by: string | null;
}

export interface AbrirSesionData {
  saldo_inicial?: number;
  notas_apertura?: string;
  abierta_por?: string;
}

export interface RegistrarMovimientoData {
  tipo: MovimientoTipo;
  monto: number;
  origen?: MovimientoOrigen;
  referencia_tipo?: string;
  referencia_id?: number;
  motivo?: string;
  created_by?: string;
}

export interface CerrarSesionData {
  saldo_contado: number;
  notas_cierre?: string;
  cerrada_por?: string;
}

/** La sesión abierta actual, o undefined si la caja está cerrada. */
export async function sesionAbierta(): Promise<CajaSesion | undefined> {
  const res = await query<CajaSesion>("SELECT * FROM caja_sesiones WHERE estado = 'abierta'");
  return res.rows[0];
}

/**
 * ¿El método de pago dado es "Efectivo"? Se resuelve por NOMBRE (no por id fijo)
 * para no romper si cambian los ids del catálogo. Devuelve false si no hay
 * método o no existe.
 */
export async function esEfectivo(
  db: Executor,
  metodoPagoId: number | null | undefined,
): Promise<boolean> {
  if (!metodoPagoId) return false;
  const res = await db.query<{ nombre: string }>('SELECT nombre FROM metodos_pago WHERE id = $1', [
    metodoPagoId,
  ]);
  const row = res.rows[0];
  return Boolean(row && row.nombre.trim().toLowerCase() === 'efectivo');
}

/** id de la sesión abierta usando una conexión dada (para transacciones). */
async function sesionAbiertaId(db: Executor): Promise<number | undefined> {
  const res = await db.query<{ id: number }>(
    "SELECT id FROM caja_sesiones WHERE estado = 'abierta'",
  );
  return res.rows[0]?.id;
}

/**
 * Enganche automático: registra un movimiento de caja SOLO si el método de pago
 * es Efectivo y hay una sesión abierta. Pensado para llamarse dentro de las
 * transacciones de ventas/pagos/gastos/compras reutilizando su conexión `db`.
 * Si el método no es efectivo o la caja está cerrada, es un no-op silencioso.
 */
export async function registrarMovimientoEfectivo(
  db: Executor,
  args: {
    metodo_pago_id: number | null | undefined;
    tipo: 'ingreso' | 'egreso';
    monto: number;
    origen: MovimientoOrigen;
    referencia_tipo: string;
    referencia_id: number;
    motivo?: string;
    created_by?: string;
  },
): Promise<void> {
  if (args.monto <= 0) return;
  if (!(await esEfectivo(db, args.metodo_pago_id))) return;
  const sesionId = await sesionAbiertaId(db);
  if (!sesionId) return; // caja cerrada: no se registra movimiento automático
  await insertarMovimiento(db, sesionId, {
    tipo: args.tipo,
    monto: args.monto,
    origen: args.origen,
    referencia_tipo: args.referencia_tipo,
    referencia_id: args.referencia_id,
    motivo: args.motivo,
    created_by: args.created_by,
  });
}

export async function findSesionById(id: number): Promise<CajaSesion | undefined> {
  const res = await query<CajaSesion>('SELECT * FROM caja_sesiones WHERE id = $1', [id]);
  return res.rows[0];
}

/** Últimas sesiones (para historial). */
export async function listarSesiones(limit = 50): Promise<CajaSesion[]> {
  const res = await query<CajaSesion>(
    'SELECT * FROM caja_sesiones ORDER BY fecha_apertura DESC LIMIT $1',
    [limit],
  );
  return res.rows;
}

/**
 * Suma neta de movimientos de una sesión (sin el saldo inicial):
 * ingresos + ajustes - egresos - retiros.
 */
export async function totalMovimientos(sesionId: number): Promise<number> {
  const row = await queryOne<{ neto: number }>(
    `SELECT COALESCE(SUM(
       CASE WHEN tipo IN ('ingreso', 'ajuste') THEN monto ELSE -monto END
     ), 0)::bigint as neto
     FROM caja_movimientos WHERE sesion_id = $1`,
    [sesionId],
  );
  return Number(row.neto);
}

/** Saldo esperado de una sesión = saldo_inicial + neto de movimientos. */
export async function saldoEsperado(sesionId: number): Promise<number> {
  const sesion = await findSesionById(sesionId);
  if (!sesion) return 0;
  return Number(sesion.saldo_inicial) + (await totalMovimientos(sesionId));
}

/** Movimientos de una sesión, del más reciente al más antiguo. */
export async function listarMovimientos(sesionId: number): Promise<CajaMovimiento[]> {
  const res = await query<CajaMovimiento>(
    'SELECT * FROM caja_movimientos WHERE sesion_id = $1 ORDER BY fecha DESC, id DESC',
    [sesionId],
  );
  return res.rows;
}

/** Desglose de una sesión por tipo (para el resumen del arqueo). */
export async function resumenSesion(sesionId: number): Promise<{
  ingresos: number;
  egresos: number;
  retiros: number;
  ajustes: number;
}> {
  const row = await queryOne<{
    ingresos: number;
    egresos: number;
    retiros: number;
    ajustes: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0)::bigint as ingresos,
       COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0)::bigint as egresos,
       COALESCE(SUM(CASE WHEN tipo = 'retiro'  THEN monto ELSE 0 END), 0)::bigint as retiros,
       COALESCE(SUM(CASE WHEN tipo = 'ajuste'  THEN monto ELSE 0 END), 0)::bigint as ajustes
     FROM caja_movimientos WHERE sesion_id = $1`,
    [sesionId],
  );
  return {
    ingresos: Number(row.ingresos),
    egresos: Number(row.egresos),
    retiros: Number(row.retiros),
    ajustes: Number(row.ajustes),
  };
}

/**
 * Abre una nueva sesión de caja. Falla si ya hay una abierta.
 */
export async function abrirSesion(data: AbrirSesionData): Promise<CajaSesion> {
  if (await sesionAbierta()) {
    throw new Error('Ya hay una sesión de caja abierta. Ciérrala antes de abrir otra.');
  }

  return queryOne<CajaSesion>(
    `INSERT INTO caja_sesiones (saldo_inicial, abierta_por, notas_apertura)
     VALUES ($1, $2, $3) RETURNING *`,
    [data.saldo_inicial ?? 0, data.abierta_por || null, data.notas_apertura || null],
  );
}

/**
 * Registra un movimiento en la sesión ABIERTA actual.
 * Si no hay sesión abierta, no hace nada y devuelve undefined (esto permite que
 * los enganches automáticos de ventas/gastos no fallen cuando la caja está
 * cerrada; el efectivo se registrará manualmente si hace falta).
 */
export async function registrarMovimiento(
  data: RegistrarMovimientoData,
): Promise<CajaMovimiento | undefined> {
  const sesion = await sesionAbierta();
  if (!sesion) return undefined;
  return insertarMovimiento(getPoolExecutor(), sesion.id, data);
}

/**
 * Inserta un movimiento en una sesión concreta. Se expone para poder engancharlo
 * dentro de transacciones existentes (ventas/pagos/gastos/compras) reutilizando
 * la misma conexión `db`.
 */
export async function insertarMovimiento(
  db: Executor,
  sesionId: number,
  data: RegistrarMovimientoData,
): Promise<CajaMovimiento> {
  const res = await db.query<CajaMovimiento>(
    `INSERT INTO caja_movimientos (sesion_id, tipo, origen, referencia_tipo, referencia_id, monto, motivo, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      sesionId,
      data.tipo,
      data.origen || 'manual',
      data.referencia_tipo || null,
      data.referencia_id || null,
      data.monto,
      data.motivo || null,
      data.created_by || null,
    ],
  );
  return res.rows[0]!;
}

/**
 * Cierra la sesión abierta con arqueo: guarda el saldo esperado calculado, el
 * efectivo contado y la diferencia. Falla si no hay sesión abierta.
 */
export async function cerrarSesion(data: CerrarSesionData): Promise<CajaSesion> {
  const sesion = await sesionAbierta();
  if (!sesion) {
    throw new Error('No hay una sesión de caja abierta para cerrar.');
  }

  const esperado = await saldoEsperado(sesion.id);
  const diferencia = data.saldo_contado - esperado;

  return queryOne<CajaSesion>(
    `UPDATE caja_sesiones
       SET estado = 'cerrada',
           fecha_cierre = now(),
           cerrada_por = $1,
           saldo_esperado = $2,
           saldo_contado = $3,
           diferencia = $4,
           notas_cierre = $5
     WHERE id = $6
     RETURNING *`,
    [
      data.cerrada_por || null,
      esperado,
      data.saldo_contado,
      diferencia,
      data.notas_cierre || null,
      sesion.id,
    ],
  );
}

/** Executor sobre el pool (para movimientos fuera de una transacción). */
function getPoolExecutor(): Executor {
  return { query: (text, params) => query(text, params as unknown[]) };
}
