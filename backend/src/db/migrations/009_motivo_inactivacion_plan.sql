-- ============================================
-- Migración 009: Motivo de inactivación de planes
-- ============================================
-- Permite guardar por qué se inactivó un plan (queda para el historial).
-- Se aplica sobre DBs existentes sin perder datos.

ALTER TABLE planes ADD COLUMN motivo_inactivacion TEXT;
