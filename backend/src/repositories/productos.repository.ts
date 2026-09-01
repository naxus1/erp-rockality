/**
 * REPOSITORY — Productos
 *
 * CRUD completo. PK = SKU (código único).
 * Stock disminuye automáticamente con ventas.
 */
import { query, queryOne } from '../db/connection.js';

export interface Producto {
  sku: string;
  nombre: string;
  categoria_id: number;
  unidad_medida_id: number;
  proveedor_nit: string | null;
  variante_id: number | null;
  notas: string | null;
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
  variante_nombre: string | null;
}

export interface CreateProductoData {
  sku?: string; // opcional: se autogenera si no se envía
  nombre: string;
  categoria_id: number;
  unidad_medida_id: number;
  proveedor_nit?: string;
  variante_id?: number;
  notas?: string;
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
  variante_id?: number;
  notas?: string;
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
    prov.nombre as proveedor_nombre,
    vp.nombre as variante_nombre
  FROM productos p
  JOIN categorias_producto cp ON p.categoria_id = cp.id
  JOIN unidades_medida um ON p.unidad_medida_id = um.id
  LEFT JOIN terceros prov ON p.proveedor_nit = prov.nit
  LEFT JOIN variantes_producto vp ON p.variante_id = vp.id
`;

export async function findAll(includeInactive = false): Promise<ProductoConRelaciones[]> {
  const where = includeInactive ? '' : 'WHERE p.activo = 1';
  const res = await query<ProductoConRelaciones>(`${SELECT_PRODUCTO} ${where} ORDER BY p.nombre`);
  return res.rows;
}

export async function findBySku(sku: string): Promise<ProductoConRelaciones | undefined> {
  const res = await query<ProductoConRelaciones>(`${SELECT_PRODUCTO} WHERE p.sku = $1`, [sku]);
  return res.rows[0];
}

/** Genera SKU automático: PREFIJO-001, PREFIJO-002, etc */
export async function generarSku(categoriaId: number): Promise<string> {
  // Obtener prefijo de la categoría
  const catRes = await query<{ prefijo_sku: string }>(
    'SELECT prefijo_sku FROM categorias_producto WHERE id = $1',
    [categoriaId],
  );
  const categoria = catRes.rows[0];
  if (!categoria) throw new Error('Categoría no encontrada');

  // Contar productos existentes en esa categoría para el consecutivo
  const count = await queryOne<{ total: number }>(
    'SELECT COUNT(*)::int as total FROM productos WHERE categoria_id = $1',
    [categoriaId],
  );
  const consecutivo = String(count.total + 1).padStart(3, '0');

  return `${categoria.prefijo_sku}-${consecutivo}`;
}

export async function findByCategoria(categoriaId: number): Promise<ProductoConRelaciones[]> {
  const res = await query<ProductoConRelaciones>(
    `${SELECT_PRODUCTO} WHERE p.categoria_id = $1 AND p.activo = 1 ORDER BY p.nombre`,
    [categoriaId],
  );
  return res.rows;
}

export async function findStockBajo(): Promise<ProductoConRelaciones[]> {
  const res = await query<ProductoConRelaciones>(
    `${SELECT_PRODUCTO} WHERE p.stock_actual <= p.stock_minimo AND p.activo = 1 ORDER BY p.stock_actual ASC`,
  );
  return res.rows;
}

export async function create(data: CreateProductoData): Promise<ProductoConRelaciones> {
  const sku = data.sku || (await generarSku(data.categoria_id));

  await query(
    `INSERT INTO productos (sku, nombre, categoria_id, unidad_medida_id, proveedor_nit, variante_id, notas, precio_venta, precio_costo, stock_actual, stock_minimo, aplica_iva, porcentaje_iva, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      sku,
      data.nombre,
      data.categoria_id,
      data.unidad_medida_id,
      data.proveedor_nit || null,
      data.variante_id || null,
      data.notas || null,
      data.precio_venta,
      data.precio_costo,
      data.stock_actual ?? 0,
      data.stock_minimo ?? 5,
      data.aplica_iva ?? 1,
      data.porcentaje_iva ?? 19,
      data.created_by || null,
    ],
  );

  return (await findBySku(sku))!;
}

export async function update(
  sku: string,
  data: UpdateProductoData,
): Promise<ProductoConRelaciones | undefined> {
  const current = await findBySku(sku);
  if (!current) return undefined;

  await query(
    `UPDATE productos SET
       nombre = $1, categoria_id = $2, unidad_medida_id = $3, proveedor_nit = $4,
       variante_id = $5, notas = $6,
       precio_venta = $7, precio_costo = $8,
       stock_actual = $9, stock_minimo = $10,
       aplica_iva = $11, porcentaje_iva = $12, activo = $13,
       updated_at = now(), updated_by = $14
     WHERE sku = $15`,
    [
      data.nombre ?? current.nombre,
      data.categoria_id ?? current.categoria_id,
      data.unidad_medida_id ?? current.unidad_medida_id,
      data.proveedor_nit ?? current.proveedor_nit,
      data.variante_id ?? current.variante_id,
      data.notas ?? current.notas,
      data.precio_venta ?? current.precio_venta,
      data.precio_costo ?? current.precio_costo,
      data.stock_actual ?? current.stock_actual,
      data.stock_minimo ?? current.stock_minimo,
      data.aplica_iva ?? current.aplica_iva,
      data.porcentaje_iva ?? current.porcentaje_iva,
      data.activo ?? current.activo,
      data.updated_by || null,
      sku,
    ],
  );

  return findBySku(sku);
}

/** Disminuir stock al vender, aumentar al anular */
export async function updateStock(
  sku: string,
  cantidad: number,
  updatedBy?: string,
): Promise<void> {
  await query(
    'UPDATE productos SET stock_actual = stock_actual + $1, updated_at = now(), updated_by = $2 WHERE sku = $3',
    [cantidad, updatedBy || null, sku],
  );
}

export async function deactivate(sku: string, updatedBy?: string): Promise<boolean> {
  const res = await query(
    'UPDATE productos SET activo = 0, updated_at = now(), updated_by = $1 WHERE sku = $2',
    [updatedBy || null, sku],
  );
  return (res.rowCount ?? 0) > 0;
}
