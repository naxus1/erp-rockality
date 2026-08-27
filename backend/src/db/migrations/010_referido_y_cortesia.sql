-- ============================================
-- Migración 010: Referido y plan de cortesía
-- ============================================
-- - clientes: quién refirió al cliente (cédula de un cliente existente + nombre libre de respaldo).
-- - planes: plan "Semana cortesía" ($0, 7 días) para suscripciones de cortesía sin venta.
-- Se aplica sobre DBs existentes sin perder datos.

-- Referido: cédula del cliente que lo refirió (FK lógica) + nombre libre para quien no es cliente
ALTER TABLE clientes ADD COLUMN referido_por TEXT;
ALTER TABLE clientes ADD COLUMN referido_por_nombre TEXT;

-- Plan de cortesía (semana gratis). Si ya existe por nombre, no se duplica.
INSERT OR IGNORE INTO planes (nombre, modalidad, duracion_dias, precio, aplica_iva, porcentaje_iva, descripcion, activo)
VALUES ('Semana cortesía', 'presencial', 7, 0, 0, 0, 'Semana de cortesía sin costo para nuevos prospectos', 1);
