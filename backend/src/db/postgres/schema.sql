-- ============================================================
-- Esquema PostgreSQL (Neon) — ERP Rockality
-- ============================================================
-- Portado desde las 13 migraciones SQLite (001..013), consolidado.
-- Decisiones de portado:
--  - INTEGER PRIMARY KEY AUTOINCREMENT -> INTEGER GENERATED ALWAYS AS IDENTITY.
--  - Timestamps de auditoria (created_at/updated_at) -> TIMESTAMPTZ DEFAULT now().
--  - Fechas de negocio (fecha_nacimiento, fecha_pago, fecha_inicio/fin) -> TEXT
--    (YYYY-MM-DD) para no cambiar la logica actual de la app.
--  - Booleanos que en SQLite eran INTEGER 0/1 se MANTIENEN como INTEGER 0/1
--    (minimiza cambios en repositorios).
--  - Montos en centavos COP como BIGINT (evita overflow en sumas grandes).
--  - INSERT OR IGNORE -> INSERT ... ON CONFLICT DO NOTHING.
-- Idempotente: usa CREATE TABLE IF NOT EXISTS y ON CONFLICT en seeds.

-- ── Catálogos ────────────────────────────────────────────
-- Convención de catálogos: el nombre se guarda en MAYÚSCULAS y SIN TILDES
-- (la app normaliza con toCatalogo() antes de insertar). Para impedir
-- "repetidos" que solo difieran por mayúsculas, la unicidad se hace con un
-- ÍNDICE ÚNICO sobre UPPER(nombre) en vez del UNIQUE(nombre) plano. Como los
-- valores ya entran sin tildes, UPPER() basta para bloquear duplicados.
CREATE TABLE IF NOT EXISTS canales_captacion (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_canales_captacion_nombre ON canales_captacion (UPPER(nombre));
INSERT INTO canales_captacion (nombre) VALUES
  ('REDES SOCIALES'), ('EVENTOS'), ('WALKING'), ('REFERIDO'), ('OTRO')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

CREATE TABLE IF NOT EXISTS sexos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sexos_nombre ON sexos (UPPER(nombre));
INSERT INTO sexos (nombre) VALUES ('MASCULINO'), ('FEMENINO'), ('OTRO')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

CREATE TABLE IF NOT EXISTS ciudades (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ciudades_nombre ON ciudades (UPPER(nombre));
INSERT INTO ciudades (nombre) VALUES
  ('BOGOTA'), ('MEDELLIN'), ('CALI'), ('BARRANQUILLA'), ('BUCARAMANGA')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

CREATE TABLE IF NOT EXISTS categorias_producto (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  prefijo_sku TEXT NOT NULL,
  descripcion TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_categorias_producto_nombre ON categorias_producto (UPPER(nombre));
INSERT INTO categorias_producto (nombre, prefijo_sku, descripcion) VALUES
  ('ACCESORIOS', 'ACC', 'Guantes, vendas y accesorios de entrenamiento'),
  ('SUPLEMENTOS', 'SUPL', 'Creatina, proteína y suplementos deportivos')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

CREATE TABLE IF NOT EXISTS unidades_medida (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  abreviatura TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_unidades_medida_nombre ON unidades_medida (UPPER(nombre));
INSERT INTO unidades_medida (nombre, abreviatura) VALUES
  ('UNIDAD', 'und'), ('GRAMOS', 'g'), ('MILILITROS', 'ml'),
  ('KILOGRAMOS', 'kg'), ('LITROS', 'L')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

CREATE TABLE IF NOT EXISTS metodos_pago (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_metodos_pago_nombre ON metodos_pago (UPPER(nombre));
INSERT INTO metodos_pago (nombre) VALUES
  ('EFECTIVO'), ('TRANSFERENCIA'), ('TARJETA'), ('NEQUI'), ('DAVIPLATA')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

CREATE TABLE IF NOT EXISTS tipos_tercero (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tipos_tercero_nombre ON tipos_tercero (UPPER(nombre));
INSERT INTO tipos_tercero (nombre) VALUES
  ('PROVEEDOR'), ('EMPLEADO'), ('EMPRESA DE SERVICIOS')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

CREATE TABLE IF NOT EXISTS gerencias (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_gerencias_nombre ON gerencias (UPPER(nombre));
INSERT INTO gerencias (nombre) VALUES ('DEPORTIVA'), ('ADMINISTRATIVA')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

CREATE TABLE IF NOT EXISTS tipos_gasto (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tipos_gasto_nombre ON tipos_gasto (UPPER(nombre));
INSERT INTO tipos_gasto (nombre) VALUES
  ('NOMINA'), ('GASTOS GENERALES'), ('GASTOS FIJOS')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

CREATE TABLE IF NOT EXISTS categorias_gasto (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_categorias_gasto_nombre ON categorias_gasto (UPPER(nombre));
INSERT INTO categorias_gasto (nombre, descripcion) VALUES
  ('ARRIENDO', 'Pago mensual del local'),
  ('SERVICIOS PUBLICOS', 'Agua, luz, internet, gas'),
  ('INSUMOS', 'Productos de aseo, toallas, etc'),
  ('MANTENIMIENTO', 'Reparación de equipos y local'),
  ('MARKETING', 'Publicidad, redes sociales, volantes'),
  ('NOMINA ENTRENADORES', 'Pagos a entrenadores'),
  ('NOMINA ADMINISTRATIVOS', 'Pagos a personal administrativo'),
  ('OTROS', 'Gastos no clasificados')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

CREATE TABLE IF NOT EXISTS variantes_producto (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_variantes_producto_nombre ON variantes_producto (UPPER(nombre));
INSERT INTO variantes_producto (nombre) VALUES
  ('VAINILLA'), ('CHOCOLATE'), ('COOKIES & CREAM'),
  ('CHOCOLATE PEANUT BUTTER'), ('FRESA'), ('SIN SABOR'), ('NA')
ON CONFLICT (UPPER(nombre)) DO NOTHING;

-- ── Usuarios del sistema y auditoría ─────────────────────
CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'gerente', 'vendedor')),
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO usuarios_sistema (id, nombre, email, rol) VALUES
  ('admin', 'Administrador', 'admin@rockality.com', 'admin'),
  ('gerente', 'Gerente', 'gerente@rockality.com', 'gerente'),
  ('vendedor', 'Vendedor', 'vendedor@rockality.com', 'vendedor')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('crear', 'editar', 'eliminar', 'anular')),
  entidad TEXT NOT NULL,
  entidad_id TEXT NOT NULL,
  datos_anteriores TEXT,
  datos_nuevos TEXT,
  ip_origen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_entidad ON audit_log(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_accion ON audit_log(accion);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios_sistema(rol);

-- ── Clientes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  cedula TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  fecha_nacimiento TEXT,
  direccion TEXT,
  ciudad_id INTEGER REFERENCES ciudades(id),
  sexo_id INTEGER REFERENCES sexos(id),
  canal_captacion_id INTEGER REFERENCES canales_captacion(id),
  consentimiento_datos INTEGER NOT NULL DEFAULT 0,
  consentimiento_fecha TEXT,
  notas TEXT,
  notas_salud TEXT,
  instagram TEXT,
  linkedin TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  referido_por TEXT,
  referido_por_nombre TEXT,
  telefono_hash TEXT,
  hace_ejercicio INTEGER NOT NULL DEFAULT 0,
  whatsapp TEXT
);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre, apellidos);
CREATE INDEX IF NOT EXISTS idx_clientes_ciudad ON clientes(ciudad_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono_hash ON clientes(telefono_hash);

-- ── Terceros ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS terceros (
  nit TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo_tercero_id INTEGER NOT NULL REFERENCES tipos_tercero(id),
  direccion TEXT,
  telefono TEXT,
  nombre_contacto TEXT,
  observaciones TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_terceros_nombre ON terceros(nombre);
CREATE INDEX IF NOT EXISTS idx_terceros_tipo ON terceros(tipo_tercero_id);

-- ── Productos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  sku TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria_id INTEGER NOT NULL REFERENCES categorias_producto(id),
  unidad_medida_id INTEGER NOT NULL REFERENCES unidades_medida(id),
  proveedor_nit TEXT REFERENCES terceros(nit),
  precio_venta BIGINT NOT NULL,
  precio_costo BIGINT NOT NULL,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 5,
  aplica_iva INTEGER NOT NULL DEFAULT 1,
  porcentaje_iva INTEGER NOT NULL DEFAULT 19,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  variante_id INTEGER REFERENCES variantes_producto(id),
  notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(proveedor_nit);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);

-- ── Planes y suscripciones ───────────────────────────────
CREATE TABLE IF NOT EXISTS planes (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  modalidad TEXT NOT NULL CHECK (modalidad IN ('presencial', 'virtual', 'mixto')),
  duracion_dias INTEGER NOT NULL,
  precio BIGINT NOT NULL,
  aplica_iva INTEGER NOT NULL DEFAULT 0,
  porcentaje_iva INTEGER NOT NULL DEFAULT 19,
  descripcion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  motivo_inactivacion TEXT
);
CREATE INDEX IF NOT EXISTS idx_planes_activo ON planes(activo);
CREATE INDEX IF NOT EXISTS idx_planes_modalidad ON planes(modalidad);

CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_cedula TEXT REFERENCES clientes(cedula),
  usuario_id TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  subtotal BIGINT NOT NULL,
  iva BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('nueva', 'recompra', 'historico')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'anulada')),
  metodo_pago_principal_id INTEGER REFERENCES metodos_pago(id),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  motivo_anulacion TEXT
);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_cedula);
CREATE INDEX IF NOT EXISTS idx_ventas_tipo ON ventas(tipo);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);

CREATE TABLE IF NOT EXISTS detalle_venta (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  tipo_item TEXT NOT NULL CHECK (tipo_item IN ('producto', 'plan')),
  producto_sku TEXT REFERENCES productos(sku),
  plan_id INTEGER REFERENCES planes(id),
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario BIGINT NOT NULL,
  descuento BIGINT NOT NULL DEFAULT 0,
  subtotal BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON detalle_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_producto ON detalle_venta(producto_sku);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_plan ON detalle_venta(plan_id);

CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id),
  monto BIGINT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  metodo_pago_id INTEGER NOT NULL REFERENCES metodos_pago(id),
  referencia TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(venta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha);

CREATE TABLE IF NOT EXISTS suscripciones (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_cedula TEXT NOT NULL REFERENCES clientes(cedula),
  plan_id INTEGER NOT NULL REFERENCES planes(id),
  venta_id INTEGER REFERENCES ventas(id),
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'vencida', 'cancelada')),
  monto_pagado BIGINT NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_suscripciones_cliente ON suscripciones(cliente_cedula);
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado ON suscripciones(estado);
CREATE INDEX IF NOT EXISTS idx_suscripciones_fecha_fin ON suscripciones(fecha_fin);

-- Plan de cortesía (semana gratis)
INSERT INTO planes (nombre, modalidad, duracion_dias, precio, aplica_iva, porcentaje_iva, descripcion, activo)
SELECT 'Semana cortesía', 'presencial', 7, 0, 0, 0, 'Semana de cortesía sin costo para nuevos prospectos', 1
WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'Semana cortesía');

-- ── Gastos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gastos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tercero_nit TEXT NOT NULL REFERENCES terceros(nit),
  gerencia_id INTEGER NOT NULL REFERENCES gerencias(id),
  tipo_gasto_id INTEGER NOT NULL REFERENCES tipos_gasto(id),
  categoria_gasto_id INTEGER NOT NULL REFERENCES categorias_gasto(id),
  descripcion TEXT NOT NULL,
  valor_base BIGINT NOT NULL,
  iva BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL,
  periodo_mes INTEGER NOT NULL,
  periodo_anio INTEGER NOT NULL,
  fecha_pago TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD')),
  metodo_pago_id INTEGER REFERENCES metodos_pago(id),
  referencia_pago TEXT,
  estado TEXT NOT NULL DEFAULT 'registrado' CHECK (estado IN ('registrado', 'anulado')),
  recurrente INTEGER NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ,
  updated_by TEXT,
  motivo_anulacion TEXT
);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_gastos_periodo ON gastos(periodo_anio, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_gastos_tercero ON gastos(tercero_nit);
CREATE INDEX IF NOT EXISTS idx_gastos_gerencia ON gastos(gerencia_id);
CREATE INDEX IF NOT EXISTS idx_gastos_tipo ON gastos(tipo_gasto_id);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria_gasto_id);
CREATE INDEX IF NOT EXISTS idx_gastos_estado ON gastos(estado);

-- ── Compras ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compras (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tercero_nit TEXT NOT NULL REFERENCES terceros(nit),
  fecha TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD')),
  factura_proveedor TEXT,
  subtotal BIGINT NOT NULL,
  iva BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL,
  gasto_id INTEGER REFERENCES gastos(id),
  estado TEXT NOT NULL DEFAULT 'registrada' CHECK (estado IN ('registrada', 'anulada')),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha);
CREATE INDEX IF NOT EXISTS idx_compras_tercero ON compras(tercero_nit);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras(estado);

CREATE TABLE IF NOT EXISTS detalle_compra (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_sku TEXT NOT NULL REFERENCES productos(sku),
  cantidad INTEGER NOT NULL,
  precio_unitario BIGINT NOT NULL,
  subtotal BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_detalle_compra_compra ON detalle_compra(compra_id);
CREATE INDEX IF NOT EXISTS idx_detalle_compra_producto ON detalle_compra(producto_sku);

-- ── Caja (control de efectivo) ───────────────────────────
CREATE TABLE IF NOT EXISTS caja_sesiones (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  saldo_inicial BIGINT NOT NULL DEFAULT 0,
  fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  abierta_por TEXT,
  notas_apertura TEXT,
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  fecha_cierre TIMESTAMPTZ,
  cerrada_por TEXT,
  saldo_esperado BIGINT,
  saldo_contado BIGINT,
  diferencia BIGINT,
  notas_cierre TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Solo una sesión abierta a la vez (índice único parcial, igual que en SQLite)
CREATE UNIQUE INDEX IF NOT EXISTS idx_caja_una_abierta ON caja_sesiones(estado) WHERE estado = 'abierta';
CREATE INDEX IF NOT EXISTS idx_caja_sesiones_estado ON caja_sesiones(estado);
CREATE INDEX IF NOT EXISTS idx_caja_sesiones_apertura ON caja_sesiones(fecha_apertura);

CREATE TABLE IF NOT EXISTS caja_movimientos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sesion_id INTEGER NOT NULL REFERENCES caja_sesiones(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'retiro', 'ajuste')),
  origen TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('venta', 'pago', 'gasto', 'compra', 'manual')),
  referencia_tipo TEXT,
  referencia_id INTEGER,
  monto BIGINT NOT NULL,
  motivo TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_caja_mov_sesion ON caja_movimientos(sesion_id);
CREATE INDEX IF NOT EXISTS idx_caja_mov_tipo ON caja_movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_caja_mov_origen ON caja_movimientos(origen);
CREATE INDEX IF NOT EXISTS idx_caja_mov_referencia ON caja_movimientos(referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_caja_mov_fecha ON caja_movimientos(fecha);
