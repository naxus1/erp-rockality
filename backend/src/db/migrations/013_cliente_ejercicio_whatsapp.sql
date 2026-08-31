-- ============================================
-- Migración 013: Cliente — hace ejercicio + WhatsApp
-- ============================================
--
-- Agrega dos campos al cliente:
--  - hace_ejercicio: booleano (0/1). Indica si la persona ya hace ejercicio.
--  - whatsapp: texto libre (número o usuario de WhatsApp). Independiente del
--    teléfono. Se guarda en claro (como instagram/linkedin), no cifrado.

ALTER TABLE clientes ADD COLUMN hace_ejercicio INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clientes ADD COLUMN whatsapp TEXT;
