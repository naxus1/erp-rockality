-- ============================================
-- Migración 004: Gastos operativos
-- ============================================

CREATE TABLE categorias_gasto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT
);

CREATE TABLE gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  monto INTEGER NOT NULL,                          -- centavos COP
  fecha TEXT NOT NULL DEFAULT (date('now')),
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,                                 -- quién registró el gasto
  FOREIGN KEY (categoria_id) REFERENCES categorias_gasto(id)
);

INSERT INTO categorias_gasto (nombre, descripcion) VALUES
  ('Arriendo', 'Pago mensual del local'),
  ('Servicios', 'Agua, luz, internet, gas'),
  ('Insumos', 'Productos de aseo, toallas, etc'),
  ('Mantenimiento', 'Reparación de equipos y local'),
  ('Marketing', 'Publicidad, redes sociales, volantes'),
  ('Nómina', 'Pagos a entrenadores y personal'),
  ('Otros', 'Gastos no clasificados');

CREATE INDEX idx_gastos_fecha ON gastos(fecha);
CREATE INDEX idx_gastos_categoria ON gastos(categoria_id);
