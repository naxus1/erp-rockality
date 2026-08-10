-- ============================================
-- Migración 002: Ventas y Detalle de Venta
-- ============================================

-- Ventas (encabezado de cada transacción)
CREATE TABLE ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER,                              -- nullable: venta sin cliente registrado
  usuario_id TEXT NOT NULL,                        -- ID del usuario de Cognito que registra
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  subtotal INTEGER NOT NULL,                       -- en centavos COP (sin IVA)
  iva INTEGER NOT NULL DEFAULT 0,                  -- monto de IVA en centavos
  total INTEGER NOT NULL,                          -- subtotal + iva en centavos
  tipo TEXT NOT NULL CHECK (tipo IN ('nueva', 'recompra', 'historico')),
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Detalle de cada venta (productos y/o planes en la misma transacción)
CREATE TABLE detalle_venta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  tipo_item TEXT NOT NULL CHECK (tipo_item IN ('producto', 'plan')),
  producto_id INTEGER,                             -- FK si tipo_item = 'producto'
  plan_id INTEGER,                                 -- FK si tipo_item = 'plan' (se crea en migración 003)
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario INTEGER NOT NULL,                -- en centavos COP (precio al momento de la venta)
  subtotal INTEGER NOT NULL,                       -- cantidad × precio_unitario
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Índices para reportes y consultas
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_tipo ON ventas(tipo);
CREATE INDEX idx_detalle_venta_venta ON detalle_venta(venta_id);
CREATE INDEX idx_detalle_venta_producto ON detalle_venta(producto_id);
