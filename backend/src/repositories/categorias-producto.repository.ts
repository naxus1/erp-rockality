/**
 * REPOSITORY — Categorías de Producto
 *
 * Queries directas a SQLite para la tabla categorias_producto.
 * Es la ÚNICA capa que toca la base de datos.
 */
import { getDatabase } from '../db/connection.js';

export interface CategoriaProducto {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export function findAll(): CategoriaProducto[] {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM categorias_producto ORDER BY nombre')
    .all() as CategoriaProducto[];
}

export function findById(id: number): CategoriaProducto | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM categorias_producto WHERE id = ?').get(id) as
    | CategoriaProducto
    | undefined;
}

export function create(data: { nombre: string; descripcion?: string }): CategoriaProducto {
  const db = getDatabase();
  const result = db
    .prepare('INSERT INTO categorias_producto (nombre, descripcion) VALUES (?, ?)')
    .run(data.nombre, data.descripcion || null);

  return findById(Number(result.lastInsertRowid))!;
}

export function update(
  id: number,
  data: { nombre?: string; descripcion?: string },
): CategoriaProducto | undefined {
  const db = getDatabase();
  const current = findById(id);
  if (!current) return undefined;

  db.prepare('UPDATE categorias_producto SET nombre = ?, descripcion = ? WHERE id = ?').run(
    data.nombre ?? current.nombre,
    data.descripcion ?? current.descripcion,
    id,
  );

  return findById(id);
}
