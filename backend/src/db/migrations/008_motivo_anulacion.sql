-- ============================================
-- Migración 008: Motivo de anulación y edición limitada de gastos
-- ============================================
-- - ventas: guardar el motivo de anulación (quién y cuándo ya existen en updated_by/updated_at).
-- - gastos: agregar trazabilidad de edición (updated_at/updated_by) y motivo de anulación.
-- Se aplica sobre DBs existentes sin perder datos.

-- Ventas: motivo de por qué se anuló
ALTER TABLE ventas ADD COLUMN motivo_anulacion TEXT;

-- Gastos: trazabilidad de edición y anulación
ALTER TABLE gastos ADD COLUMN updated_at TEXT;
ALTER TABLE gastos ADD COLUMN updated_by TEXT;
ALTER TABLE gastos ADD COLUMN motivo_anulacion TEXT;
