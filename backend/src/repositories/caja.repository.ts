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
 * Todos los montos en centavos COP (INTEGER).
 */
import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection.js';

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
export function sesionAbierta(): CajaSesion | undefined {
  const db = getDatabase();
  return db.prepare("SELECT * FROM caja_sesiones WHERE estado = 'abierta'").get() as
    | CajaSesion
    | undefined;
}

/**
 * ¿El método de pago dado es "Efectivo"? Se resuelve por NOMBRE (no por id fijo)
 * para no romper si cambian los ids del catálogo. Devuelve false si no hay
 * método o no existe.
 */
export function esEfectivo(
  db: Database.Database,
  metodoPagoId: number | null | undefined,
): boolean {
  if (!metodoPagoId) return false;
  const row = db.prepare('SELECT nombre FROM metodos_pago WHERE id = ?').get(metodoPagoId) as
    | { nombre: string }
    | undefined;
  return Boolean(row && row.nombre.trim().toLowerCase() === 'efectivo');
}

/** id de la sesión abierta usando una conexión dada (para transacciones). */
function sesionAbiertaId(db: Database.Database): number | undefined {
  const row = db.prepare("SELECT id FROM caja_sesiones WHERE estado = 'abierta'").get() as
    | { id: number }
    | undefined;
  return row?.id;
}

/**
 * Enganche automático: registra un movimiento de caja SOLO si el método de pago
 * es Efectivo y hay una sesión abierta. Pensado para llamarse dentro de las
 * transacciones de ventas/pagos/gastos/compras reutilizando su conexión `db`.
 * Si el método no es efectivo o la caja está cerrada, es un no-op silencioso.
 */
export function registrarMovimientoEfectivo(
  db: Database.Database,
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
): void {
  if (args.monto <= 0) return;
  if (!esEfectivo(db, args.metodo_pago_id)) return;
  const sesionId = sesionAbiertaId(db);
  if (!sesionId) return; // caja cerrada: no se registra movimiento automático
  insertarMovimiento(db, sesionId, {
    tipo: args.tipo,
    monto: args.monto,
    origen: args.origen,
    referencia_tipo: args.referencia_tipo,
    referencia_id: args.referencia_id,
    motivo: args.motivo,
    created_by: args.created_by,
  });
}

export function findSesionById(id: number): CajaSesion | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM caja_sesiones WHERE id = ?').get(id) as CajaSesion | undefined;
}

/** Últimas sesiones (para historial). */
export function listarSesiones(limit = 50): CajaSesion[] {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM caja_sesiones ORDER BY fecha_apertura DESC LIMIT ?')
    .all(limit) as CajaSesion[];
}

/**
 * Suma neta de movimientos de una sesión (sin el saldo inicial):
 * ingresos + ajustes - egresos - retiros.
 */
export function totalMovimientos(sesionId: number): number {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(
         CASE WHEN tipo IN ('ingreso', 'ajuste') THEN monto ELSE -monto END
       ), 0) as neto
       FROM caja_movimientos WHERE sesion_id = ?`,
    )
    .get(sesionId) as { neto: number };
  return row.neto;
}

/** Saldo esperado de una sesión = saldo_inicial + neto de movimientos. */
export function saldoEsperado(sesionId: number): number {
  const sesion = findSesionById(sesionId);
  if (!sesion) return 0;
  return sesion.saldo_inicial + totalMovimientos(sesionId);
}

/** Movimientos de una sesión, del más reciente al más antiguo. */
export function listarMovimientos(sesionId: number): CajaMovimiento[] {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM caja_movimientos WHERE sesion_id = ? ORDER BY fecha DESC, id DESC')
    .all(sesionId) as CajaMovimiento[];
}

/** Desglose de una sesión por tipo (para el resumen del arqueo). */
export function resumenSesion(sesionId: number): {
  ingresos: number;
  egresos: number;
  retiros: number;
  ajustes: number;
} {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) as ingresos,
         COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0) as egresos,
         COALESCE(SUM(CASE WHEN tipo = 'retiro'  THEN monto ELSE 0 END), 0) as retiros,
         COALESCE(SUM(CASE WHEN tipo = 'ajuste'  THEN monto ELSE 0 END), 0) as ajustes
       FROM caja_movimientos WHERE sesion_id = ?`,
    )
    .get(sesionId) as { ingresos: number; egresos: number; retiros: number; ajustes: number };
  return row;
}

/**
 * Abre una nueva sesión de caja. Falla si ya hay una abierta.
 * El saldo inicial por defecto es el saldo esperado de la última sesión cerrada
 * (se arrastra el efectivo que quedó), o 0 si es la primera.
 */
export function abrirSesion(data: AbrirSesionData): CajaSesion {
  const db = getDatabase();
  if (sesionAbierta()) {
    throw new Error('Ya hay una sesión de caja abierta. Ciérrala antes de abrir otra.');
  }

  const result = db
    .prepare(
      `INSERT INTO caja_sesiones (saldo_inicial, abierta_por, notas_apertura)
       VALUES (?, ?, ?)`,
    )
    .run(data.saldo_inicial ?? 0, data.abierta_por || null, data.notas_apertura || null);

  return findSesionById(Number(result.lastInsertRowid))!;
}

/**
 * Registra un movimiento en la sesión ABIERTA actual.
 * Si no hay sesión abierta, no hace nada y devuelve undefined (esto permite que
 * los enganches automáticos de ventas/gastos no fallen cuando la caja está
 * cerrada; el efectivo se registrará manualmente si hace falta).
 */
export function registrarMovimiento(data: RegistrarMovimientoData): CajaMovimiento | undefined {
  const db = getDatabase();
  const sesion = sesionAbierta();
  if (!sesion) return undefined;
  return insertarMovimiento(db, sesion.id, data);
}

/**
 * Inserta un movimiento en una sesión concreta. Se expone para poder engancharlo
 * dentro de transacciones existentes (ventas/pagos/gastos/compras) reutilizando
 * la misma conexión `db`.
 */
export function insertarMovimiento(
  db: Database.Database,
  sesionId: number,
  data: RegistrarMovimientoData,
): CajaMovimiento {
  const result = db
    .prepare(
      `INSERT INTO caja_movimientos (sesion_id, tipo, origen, referencia_tipo, referencia_id, monto, motivo, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      sesionId,
      data.tipo,
      data.origen || 'manual',
      data.referencia_tipo || null,
      data.referencia_id || null,
      data.monto,
      data.motivo || null,
      data.created_by || null,
    );
  return db
    .prepare('SELECT * FROM caja_movimientos WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as CajaMovimiento;
}

/**
 * Cierra la sesión abierta con arqueo: guarda el saldo esperado calculado, el
 * efectivo contado y la diferencia. Falla si no hay sesión abierta.
 */
export function cerrarSesion(data: CerrarSesionData): CajaSesion {
  const db = getDatabase();
  const sesion = sesionAbierta();
  if (!sesion) {
    throw new Error('No hay una sesión de caja abierta para cerrar.');
  }

  const esperado = saldoEsperado(sesion.id);
  const diferencia = data.saldo_contado - esperado;

  db.prepare(
    `UPDATE caja_sesiones
       SET estado = 'cerrada',
           fecha_cierre = datetime('now'),
           cerrada_por = ?,
           saldo_esperado = ?,
           saldo_contado = ?,
           diferencia = ?,
           notas_cierre = ?
     WHERE id = ?`,
  ).run(
    data.cerrada_por || null,
    esperado,
    data.saldo_contado,
    diferencia,
    data.notas_cierre || null,
    sesion.id,
  );

  return findSesionById(sesion.id)!;
}
