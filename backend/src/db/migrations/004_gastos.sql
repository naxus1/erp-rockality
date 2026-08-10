-- ============================================
-- Migración 004: Gastos operativos
-- ============================================

-- Categorías de gastos
CREATE TABLE categorias_gasto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT
);

-- Gastos del gimnasio (variables)
CREATE TABLE gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  monto INTEGER NOT NULL,                          -- en centavos COP
  fecha TEXT NOT NULL DEFAULT (date('now')),
  usuario_id TEXT NOT NULL,                        -- ID del usuario que registra
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (categoria_id) REFERENCES categorias_gasto(id)
);

-- Datos iniciales de categorías de gasto
INSERT INTO categorias_gasto (nombre, descripcion) VALUES
  ('Arriendo', 'Pago mensual del local'),
  ('Servicios', 'Agua, luz, internet, gas'),
  ('Insumos', 'Productos de aseo, toallas, etc'),
  ('Mantenimiento', 'Reparación de equipos y local'),
  ('Marketing', 'Publicidad, redes sociales, volantes'),
  ('Nómina', 'Pagos a entrenadores y personal'),
  ('Otros', 'Gastos no clasificados');

-- Índices para reportes
CREATE INDEX idx_gastos_fecha ON gastos(fecha);
CREATE INDEX idx_gastos_categoria ON gastos(categoria_id);
