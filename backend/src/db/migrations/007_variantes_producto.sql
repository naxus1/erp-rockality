-- ============================================
-- Migración 007: Variantes / Presentaciones de producto
-- ============================================
-- Esta migración agrega la tabla variantes_producto y el campo en productos.
-- Se aplica sobre DBs existentes sin perder datos.

CREATE TABLE IF NOT EXISTS variantes_producto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO variantes_producto (nombre) VALUES
  ('Vainilla'),
  ('Chocolate'),
  ('Cookies & Cream'),
  ('Chocolate Peanut Butter'),
  ('Fresa'),
  ('Sin sabor'),
  ('NA');

-- Agregar columna variante_id a productos (si no existe)
-- SQLite no soporta IF NOT EXISTS en ALTER TABLE, pero si la columna ya existe falla silenciosamente
-- Lo manejamos con un PRAGMA check
ALTER TABLE productos ADD COLUMN variante_id INTEGER REFERENCES variantes_producto(id);
ALTER TABLE productos ADD COLUMN notas TEXT;
