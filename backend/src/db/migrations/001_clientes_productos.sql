-- ============================================
-- Migración 001: Clientes y Productos
-- ============================================

-- Clientes del gimnasio
CREATE TABLE clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  notas TEXT,
  consentimiento_datos INTEGER NOT NULL DEFAULT 0,  -- 1 = aceptó tratamiento de datos
  consentimiento_fecha TEXT,                         -- fecha en que aceptó
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categorías de productos
CREATE TABLE categorias_producto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT
);

-- Productos físicos (guantes, vendas, creatina, suplementos)
CREATE TABLE productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  categoria_id INTEGER NOT NULL,
  precio_venta INTEGER NOT NULL,       -- en centavos COP (evita errores de decimales)
  precio_costo INTEGER NOT NULL,       -- en centavos COP
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 5,
  aplica_iva INTEGER NOT NULL DEFAULT 1,
  porcentaje_iva INTEGER NOT NULL DEFAULT 19,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (categoria_id) REFERENCES categorias_producto(id)
);

-- Datos iniciales de categorías
INSERT INTO categorias_producto (nombre, descripcion) VALUES
  ('Accesorios', 'Guantes, vendas y accesorios de entrenamiento'),
  ('Suplementos', 'Creatina, proteína y suplementos deportivos');

-- Índices para búsquedas frecuentes
CREATE INDEX idx_clientes_nombre ON clientes(nombre);
CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_activo ON productos(activo);
