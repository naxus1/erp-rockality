/**
 * REPOSITORY — Productos
 *
 * CRUD completo. PK = SKU (código único).
 * Stock disminuye automáticamente con ventas.
 */
import { getDatabase } from '../db/connection.js';

export interface Producto {
  sku: string;
  nombre: string;
  categoria_id: number;
  unidad_medida_id: number;
  proveedor_nit: string | null;
  precio_venta: number;
  precio_costo: number;
  stock_actual: number;
  stock_minimo: number;
  aplica_iva: number;
  porcentaje_iva: number;
  activo: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ProductoConRelaciones extends Producto {
  categoria_nombre: string;
  unidad_medida_nombre: string;
  unidad_medida_abreviatura: string;
  proveedor_nombre: string | null;
}

export interface CreateProductoData {
  sku: string;
  nombre: string;
  categoria_id: number;
  unidad_medida_id: number;
  proveedor_nit?: string;
  precio_venta: number;
  precio_costo: number;
  stock_actual?: number;
  stock_minimo?: number;
  aplica_iva?: number;
  porcentaje_iva?: number;
  created_by?: string;
}

export interface UpdateProductoData {
  nombre?: string;
  categoria_id?: number;
  unidad_medida_id?: number;
  proveedor_nit?: string;
  precio_venta?: number;
  precio_costo?: number;
  stock_actual?: number;
  stock_minimo?: number;
  aplica_iva?: number;
  porcentaje_iva?: number;
  activo?: number;
  updated_by?: string;
}

const SELECT_PRODUCTO = `
  SELECT p.*,
    cp.nombre as categoria_nombre,
    um.nombre as unidad_medida_nombre,
    um.abreviatura as unidad_medida_abreviatura,
    prov.nombre as proveedor_nombre
  FROM productos p
  JOIN categorias_producto cp ON p.categoria_id = cp.id
  JOIN unidades_medida um ON p.unidad_medida_id = um.id
  LEFT JOIN terceros prov ON p.proveedor_nit = prov.nit
`;

export function findAll(includeInactive = false): ProductoConRelaciones[] {
  const db = getDatabase();
  const where = includeInactive ? '' : 'WHERE p.activo = 1';
  return db
    .prepare(`${SELECT_PRODUCTO} ${where} ORDER BY p.nombre`)
    .all() as ProductoConRelaciones[];
}

export function findBySku(sku: string): ProductoConRelaciones | undefined {
  const db = getDatabase();
  return db.prepare(`${SELECT_PRODUCTO} WHERE p.sku = ?`).get(sku) as
    | ProductoConRelaciones
    | undefined;
}

export function findByCategoria(categoriaId: number): ProductoConRelaciones[] {
  const db = getDatabase();
  return db
    .prepare(`${SELECT_PRODUCTO} WHERE p.categoria_id = ? AND p.activo = 1 ORDER BY p.nombre`)
    .all(categoriaId) as ProductoConRelaciones[];
}

export function findStockBajo(): ProductoConRelaciones[] {
  const db = getDatabase();
  return db
    .prepare(
      `${SELECT_PRODUCTO} WHERE p.stock_actual <= p.stock_minimo AND p.activo = 1 ORDER BY p.stock_actual ASC`,
    )
    .all() as ProductoConRelaciones[];
}

export function create(data: CreateProductoData): ProductoConRelaciones {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO productos (sku, nombre, categoria_id, unidad_medida_id, proveedor_nit, precio_venta, precio_costo, stock_actual, stock_minimo, aplica_iva, porcentaje_iva, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    data.sku,
    data.nombre,
    data.categoria_id,
    data.unidad_medida_id,
    data.proveedor_nit || null,
    data.precio_venta,
    data.precio_costo,
    data.stock_actual ?? 0,
    data.stock_minimo ?? 5,
    data.aplica_iva ?? 1,
    data.porcentaje_iva ?? 19,
    data.created_by || null,
  );

  return findBySku(data.sku)!;
}

export function update(sku: string, data: UpdateProductoData): ProductoConRelaciones | undefined {
  const db = getDatabase();
  const current = findBySku(sku);
  if (!current) return undefined;

  db.prepare(
    `UPDATE productos SET
       nombre = ?, categoria_id = ?, unidad_medida_id = ?, proveedor_nit = ?,
       precio_venta = ?, precio_costo = ?,
       stock_actual = ?, stock_minimo = ?,
       aplica_iva = ?, porcentaje_iva = ?, activo = ?,
       updated_at = datetime('now'), updated_by = ?
     WHERE sku = ?`,
  ).run(
    data.nombre ?? current.nombre,
    data.categoria_id ?? current.categoria_id,
    data.unidad_medida_id ?? current.unidad_medida_id,
    data.proveedor_nit ?? current.proveedor_nit,
    data.precio_venta ?? current.precio_venta,
    data.precio_costo ?? current.precio_costo,
    data.stock_actual ?? current.stock_actual,
    data.stock_minimo ?? current.stock_minimo,
    data.aplica_iva ?? current.aplica_iva,
    data.porcentaje_iva ?? current.porcentaje_iva,
    data.activo ?? current.activo,
    data.updated_by || null,
    sku,
  );

  return findBySku(sku);
}

/** Disminuir stock al vender, aumentar al anular */
export function updateStock(sku: string, cantidad: number, updatedBy?: string): void {
  const db = getDatabase();
  db.prepare(
    "UPDATE productos SET stock_actual = stock_actual + ?, updated_at = datetime('now'), updated_by = ? WHERE sku = ?",
  ).run(cantidad, updatedBy || null, sku);
}

export function deactivate(sku: string, updatedBy?: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare(
      "UPDATE productos SET activo = 0, updated_at = datetime('now'), updated_by = ? WHERE sku = ?",
    )
    .run(updatedBy || null, sku);
  return result.changes > 0;
}
