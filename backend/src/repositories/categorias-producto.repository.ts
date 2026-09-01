/**
 * REPOSITORY — Categorías de Producto
 *
 * Queries directas a PostgreSQL para la tabla categorias_producto.
 * Es la ÚNICA capa que toca la base de datos.
 */
import { query, queryOne } from '../db/connection.js';

export interface CategoriaProducto {
  id: number;
  nombre: string;
  prefijo_sku: string;
  descripcion: string | null;
}

export async function findAll(): Promise<CategoriaProducto[]> {
  const res = await query<CategoriaProducto>('SELECT * FROM categorias_producto ORDER BY nombre');
  return res.rows;
}

export async function findById(id: number): Promise<CategoriaProducto | undefined> {
  const res = await query<CategoriaProducto>('SELECT * FROM categorias_producto WHERE id = $1', [
    id,
  ]);
  return res.rows[0];
}

export async function create(data: {
  nombre: string;
  prefijo_sku?: string;
  descripcion?: string;
}): Promise<CategoriaProducto> {
  // Auto-generar prefijo si no se proporciona (primeras 4 letras del nombre en mayúscula)
  const prefijo = data.prefijo_sku || data.nombre.substring(0, 4).toUpperCase().replace(/\s/g, '');
  return queryOne<CategoriaProducto>(
    'INSERT INTO categorias_producto (nombre, prefijo_sku, descripcion) VALUES ($1, $2, $3) RETURNING *',
    [data.nombre, prefijo, data.descripcion || null],
  );
}

export async function update(
  id: number,
  data: { nombre?: string; descripcion?: string },
): Promise<CategoriaProducto | undefined> {
  const current = await findById(id);
  if (!current) return undefined;

  const res = await query<CategoriaProducto>(
    'UPDATE categorias_producto SET nombre = $1, descripcion = $2 WHERE id = $3 RETURNING *',
    [data.nombre ?? current.nombre, data.descripcion ?? current.descripcion, id],
  );
  return res.rows[0];
}
