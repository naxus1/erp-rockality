/**
 * REPOSITORY — Productos
 *
 * CRUD completo para la tabla productos.
 * Precios en centavos COP. Stock con control de mínimos.
 */
import { getDatabase } from '../db/connection.js';

export interface Producto {
  id: number;
  nombre: string;
  categoria_id: number;
  precio_venta: number;
  precio_costo: number;
  stock_actual: number;
  stock_minimo: number;
  aplica_iva: number;
  porcentaje_iva: number;
  activo: number;
  created_at: string;
  updated_at: string;
}

export interface ProductoConCategoria extends Producto {
  categoria_nombre: string;
}

export interface CreateProductoData {
  nombre: string;
  categoria_id: number;
  precio_venta: number;
  precio_costo: number;
  stock_actual?: number;
  stock_minimo?: number;
  aplica_iva?: number;
  porcentaje_iva?: number;
}

export interface UpdateProductoData {
  nombre?: string;
  categoria_id?: number;
  precio_venta?: number;
  precio_costo?: number;
  stock_actual?: number;
  stock_minimo?: number;
  aplica_iva?: number;
  porcentaje_iva?: number;
  activo?: number;
}

export function findAll(includeInactive = false): ProductoConCategoria[] {
  const db = getDatabase();
  const where = includeInactive ? '' : 'WHERE p.activo = 1';
  return db
    .prepare(
      `SELECT p.*, cp.nombre as categoria_nombre
       FROM productos p
       JOIN categorias_producto cp ON p.categoria_id = cp.id
       ${where}
       ORDER BY p.nombre`,
    )
    .all() as ProductoConCategoria[];
}

export function findById(id: number): ProductoConCategoria | undefined {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT p.*, cp.nombre as categoria_nombre
       FROM productos p
       JOIN categorias_producto cp ON p.categoria_id = cp.id
       WHERE p.id = ?`,
    )
    .get(id) as ProductoConCategoria | undefined;
}

export function findByCategoria(categoriaId: number): ProductoConCategoria[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT p.*, cp.nombre as categoria_nombre
       FROM productos p
       JOIN categorias_producto cp ON p.categoria_id = cp.id
       WHERE p.categoria_id = ? AND p.activo = 1
       ORDER BY p.nombre`,
    )
    .all(categoriaId) as ProductoConCategoria[];
}

export function findStockBajo(): ProductoConCategoria[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT p.*, cp.nombre as categoria_nombre
       FROM productos p
       JOIN categorias_producto cp ON p.categoria_id = cp.id
       WHERE p.stock_actual <= p.stock_minimo AND p.activo = 1
       ORDER BY p.stock_actual ASC`,
    )
    .all() as ProductoConCategoria[];
}

export function create(data: CreateProductoData): ProductoConCategoria {
  const db = getDatabase();
  const result = db
    .prepare(
      `INSERT INTO productos (nombre, categoria_id, precio_venta, precio_costo, stock_actual, stock_minimo, aplica_iva, porcentaje_iva)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.nombre,
      data.categoria_id,
      data.precio_venta,
      data.precio_costo,
      data.stock_actual ?? 0,
      data.stock_minimo ?? 5,
      data.aplica_iva ?? 1,
      data.porcentaje_iva ?? 19,
    );

  return findById(Number(result.lastInsertRowid))!;
}

export function update(id: number, data: UpdateProductoData): ProductoConCategoria | undefined {
  const db = getDatabase();
  const current = findById(id);
  if (!current) return undefined;

  db.prepare(
    `UPDATE productos SET
       nombre = ?, categoria_id = ?, precio_venta = ?, precio_costo = ?,
       stock_actual = ?, stock_minimo = ?, aplica_iva = ?, porcentaje_iva = ?,
       activo = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    data.nombre ?? current.nombre,
    data.categoria_id ?? current.categoria_id,
    data.precio_venta ?? current.precio_venta,
    data.precio_costo ?? current.precio_costo,
    data.stock_actual ?? current.stock_actual,
    data.stock_minimo ?? current.stock_minimo,
    data.aplica_iva ?? current.aplica_iva,
    data.porcentaje_iva ?? current.porcentaje_iva,
    data.activo ?? current.activo,
    id,
  );

  return findById(id);
}

export function updateStock(id: number, cantidad: number): void {
  const db = getDatabase();
  db.prepare(
    "UPDATE productos SET stock_actual = stock_actual + ?, updated_at = datetime('now') WHERE id = ?",
  ).run(cantidad, id);
}

export function deactivate(id: number): boolean {
  const db = getDatabase();
  const result = db
    .prepare("UPDATE productos SET activo = 0, updated_at = datetime('now') WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
