-- ============================================
-- Migración 006: Compras (entradas de inventario)
-- ============================================

-- Compras (encabezado)
CREATE TABLE compras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tercero_nit TEXT NOT NULL,                       -- FK: proveedor al que se le compra
  fecha TEXT NOT NULL DEFAULT (date('now')),
  factura_proveedor TEXT,                          -- número de factura del proveedor
  subtotal INTEGER NOT NULL,                       -- centavos COP sin IVA
  iva INTEGER NOT NULL DEFAULT 0,                  -- monto IVA centavos
  total INTEGER NOT NULL,                          -- subtotal + iva
  gasto_id INTEGER,                                -- FK: gasto generado automáticamente
  estado TEXT NOT NULL DEFAULT 'registrada' CHECK (estado IN ('registrada', 'anulada')),
  notas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (tercero_nit) REFERENCES terceros(nit),
  FOREIGN KEY (gasto_id) REFERENCES gastos(id)
);

-- Detalle de compra (qué productos entraron)
CREATE TABLE detalle_compra (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compra_id INTEGER NOT NULL,
  producto_sku TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario INTEGER NOT NULL,                -- precio de compra por unidad (centavos)
  subtotal INTEGER NOT NULL,                       -- cantidad × precio_unitario
  FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_sku) REFERENCES productos(sku)
);

-- Índices
CREATE INDEX idx_compras_fecha ON compras(fecha);
CREATE INDEX idx_compras_tercero ON compras(tercero_nit);
CREATE INDEX idx_compras_estado ON compras(estado);
CREATE INDEX idx_detalle_compra_compra ON detalle_compra(compra_id);
CREATE INDEX idx_detalle_compra_producto ON detalle_compra(producto_sku);
