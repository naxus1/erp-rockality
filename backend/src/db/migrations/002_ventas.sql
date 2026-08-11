-- ============================================
-- Migración 002: Ventas, Detalle y Pagos
-- ============================================

-- Ventas (encabezado)
CREATE TABLE ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_cedula TEXT,
  usuario_id TEXT NOT NULL,                        -- FK lógica a usuarios_sistema
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  subtotal INTEGER NOT NULL,                       -- centavos COP (sin IVA)
  iva INTEGER NOT NULL DEFAULT 0,                  -- monto IVA centavos
  total INTEGER NOT NULL,                          -- subtotal + iva centavos
  tipo TEXT NOT NULL CHECK (tipo IN ('nueva', 'recompra', 'historico')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'anulada')),
  metodo_pago_principal_id INTEGER,                -- método de pago principal (para reportes rápidos)
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT,                                 -- quién anuló o modificó
  FOREIGN KEY (cliente_cedula) REFERENCES clientes(cedula),
  FOREIGN KEY (metodo_pago_principal_id) REFERENCES metodos_pago(id)
);

-- Detalle de cada venta (productos y/o planes)
CREATE TABLE detalle_venta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  tipo_item TEXT NOT NULL CHECK (tipo_item IN ('producto', 'plan')),
  producto_sku TEXT,
  plan_id INTEGER,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario INTEGER NOT NULL,                -- centavos COP al momento de la venta
  descuento INTEGER NOT NULL DEFAULT 0,            -- descuento en centavos (promociones, volumen)
  subtotal INTEGER NOT NULL,                       -- (precio_unitario × cantidad) - descuento
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_sku) REFERENCES productos(sku),
  FOREIGN KEY (plan_id) REFERENCES planes(id)
);

-- Pagos (abonos parciales o pago completo)
CREATE TABLE pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  monto INTEGER NOT NULL,                          -- centavos COP
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  metodo_pago_id INTEGER NOT NULL,
  referencia TEXT,                                 -- número de transacción, recibo, etc.
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id)
);

-- Índices
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_cedula);
CREATE INDEX idx_ventas_tipo ON ventas(tipo);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_detalle_venta_venta ON detalle_venta(venta_id);
CREATE INDEX idx_detalle_venta_producto ON detalle_venta(producto_sku);
CREATE INDEX idx_detalle_venta_plan ON detalle_venta(plan_id);
CREATE INDEX idx_pagos_venta ON pagos(venta_id);
CREATE INDEX idx_pagos_fecha ON pagos(fecha);
