-- ============================================
-- Migración 001: Catálogos, Clientes, Proveedores y Productos
-- ============================================

-- ── Tablas catálogo ───────────────────────────────────────

-- ¿Cómo se enteró del gimnasio?
CREATE TABLE canales_captacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO canales_captacion (nombre) VALUES
  ('Redes sociales'),
  ('Eventos'),
  ('Walking'),
  ('Referido'),
  ('Otro');

-- Sexo
CREATE TABLE sexos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO sexos (nombre) VALUES
  ('Masculino'),
  ('Femenino'),
  ('Otro');

-- Ciudades
CREATE TABLE ciudades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO ciudades (nombre) VALUES
  ('Bogotá'),
  ('Medellín'),
  ('Cali'),
  ('Barranquilla'),
  ('Bucaramanga');

-- Categorías de productos
CREATE TABLE categorias_producto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT
);

INSERT INTO categorias_producto (nombre, descripcion) VALUES
  ('Accesorios', 'Guantes, vendas y accesorios de entrenamiento'),
  ('Suplementos', 'Creatina, proteína y suplementos deportivos');

-- Unidades de medida
CREATE TABLE unidades_medida (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  abreviatura TEXT NOT NULL
);

INSERT INTO unidades_medida (nombre, abreviatura) VALUES
  ('Unidad', 'und'),
  ('Gramos', 'g'),
  ('Mililitros', 'ml'),
  ('Kilogramos', 'kg'),
  ('Litros', 'L');

-- Métodos de pago
CREATE TABLE metodos_pago (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO metodos_pago (nombre) VALUES
  ('Efectivo'),
  ('Transferencia'),
  ('Tarjeta'),
  ('Nequi'),
  ('Daviplata');

-- ── Clientes ──────────────────────────────────────────────

CREATE TABLE clientes (
  cedula TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  fecha_nacimiento TEXT,                           -- YYYY-MM-DD, edad se calcula
  direccion TEXT,
  ciudad_id INTEGER,                               -- FK a ciudades
  sexo_id INTEGER,                                 -- FK a sexos
  canal_captacion_id INTEGER,
  consentimiento_datos INTEGER NOT NULL DEFAULT 0,
  consentimiento_fecha TEXT,
  notas TEXT,                                      -- notas generales
  notas_salud TEXT,                                -- lesiones, restricciones, condiciones médicas
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT,
  FOREIGN KEY (ciudad_id) REFERENCES ciudades(id),
  FOREIGN KEY (sexo_id) REFERENCES sexos(id),
  FOREIGN KEY (canal_captacion_id) REFERENCES canales_captacion(id)
);

-- ── Proveedores ───────────────────────────────────────────

CREATE TABLE proveedores (
  nit TEXT PRIMARY KEY,
  nombre_empresa TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  nombre_contacto TEXT,
  observaciones TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

-- ── Productos ─────────────────────────────────────────────

CREATE TABLE productos (
  sku TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria_id INTEGER NOT NULL,
  unidad_medida_id INTEGER NOT NULL,
  proveedor_nit TEXT,
  precio_venta INTEGER NOT NULL,                   -- centavos COP
  precio_costo INTEGER NOT NULL,                   -- centavos COP
  stock_actual INTEGER NOT NULL DEFAULT 0,         -- disminuye con ventas
  stock_minimo INTEGER NOT NULL DEFAULT 5,
  aplica_iva INTEGER NOT NULL DEFAULT 1,
  porcentaje_iva INTEGER NOT NULL DEFAULT 19,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT,
  FOREIGN KEY (categoria_id) REFERENCES categorias_producto(id),
  FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id),
  FOREIGN KEY (proveedor_nit) REFERENCES proveedores(nit)
);

-- ── Índices ───────────────────────────────────────────────

CREATE INDEX idx_clientes_nombre ON clientes(nombre, apellidos);
CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_clientes_ciudad ON clientes(ciudad_id);
CREATE INDEX idx_proveedores_nombre ON proveedores(nombre_empresa);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_proveedor ON productos(proveedor_nit);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_nombre ON productos(nombre);
