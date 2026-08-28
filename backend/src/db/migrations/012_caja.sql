-- ============================================
-- Migración 012: Caja (control de efectivo)
-- ============================================
--
-- Controla el EFECTIVO físico del negocio: cuánto entra (ventas en efectivo),
-- cuánto sale (gastos/compras en efectivo + retiros/entregas) y cuál es el saldo
-- que debería estar en el cajón en cualquier momento.
--
-- Modelo: una "sesión de caja" agrupa los movimientos entre una apertura y un
-- cierre (arqueo). El cierre es FLEXIBLE: se puede cerrar a diario o semanalmente.
-- Los pagos digitales (transferencia, tarjeta, Nequi, Daviplata) NO afectan la
-- caja física; se concilian aparte contra el banco (reporte).
--
-- Todos los montos en centavos COP (INTEGER), igual que el resto del sistema.

-- Sesiones de caja (una apertura -> cierre/arqueo)
CREATE TABLE caja_sesiones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  saldo_inicial INTEGER NOT NULL DEFAULT 0,        -- base/fondo con que se abre el cajón (centavos)
  fecha_apertura TEXT NOT NULL DEFAULT (datetime('now')),
  abierta_por TEXT,                                -- usuario que abrió
  notas_apertura TEXT,
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  -- Campos de cierre (se rellenan al arquear)
  fecha_cierre TEXT,
  cerrada_por TEXT,                                -- usuario que cerró
  saldo_esperado INTEGER,                          -- lo que el sistema calculó que debía haber
  saldo_contado INTEGER,                           -- efectivo físico contado en el arqueo
  diferencia INTEGER,                              -- contado - esperado (negativo = faltante)
  notas_cierre TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Solo puede haber UNA sesión abierta a la vez (índice parcial único).
CREATE UNIQUE INDEX idx_caja_una_abierta ON caja_sesiones(estado) WHERE estado = 'abierta';
CREATE INDEX idx_caja_sesiones_estado ON caja_sesiones(estado);
CREATE INDEX idx_caja_sesiones_apertura ON caja_sesiones(fecha_apertura);

-- Movimientos de efectivo dentro de una sesión (el "libro" de caja)
CREATE TABLE caja_movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sesion_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'retiro', 'ajuste')),
  -- ingreso: efectivo que entra (venta en efectivo, ingreso manual)
  -- egreso : efectivo que sale para pagar (gasto/compra en efectivo)
  -- retiro : entrega del efectivo (consignación al banco, entrega al dueño)
  -- ajuste : corrección manual (sobrante/faltante, fondo de cambio)
  origen TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('venta', 'pago', 'gasto', 'compra', 'manual')),
  referencia_tipo TEXT,                            -- 'venta' | 'gasto' | 'compra' | 'pago' (para trazar)
  referencia_id INTEGER,                           -- id de la venta/gasto/compra/pago que lo generó
  monto INTEGER NOT NULL,                          -- SIEMPRE positivo (el signo lo da 'tipo'), centavos
  motivo TEXT,                                     -- descripción (obligatoria para movimientos manuales)
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (sesion_id) REFERENCES caja_sesiones(id)
);

CREATE INDEX idx_caja_mov_sesion ON caja_movimientos(sesion_id);
CREATE INDEX idx_caja_mov_tipo ON caja_movimientos(tipo);
CREATE INDEX idx_caja_mov_origen ON caja_movimientos(origen);
CREATE INDEX idx_caja_mov_referencia ON caja_movimientos(referencia_tipo, referencia_id);
CREATE INDEX idx_caja_mov_fecha ON caja_movimientos(fecha);
