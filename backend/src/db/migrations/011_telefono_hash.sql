-- ============================================
-- Migración 011: Hash de teléfono para búsqueda
-- ============================================
-- El teléfono (y el email) se cifran a nivel de columna (AES-256-GCM), por lo que
-- ya no se puede buscar por LIKE sobre el valor cifrado. Guardamos un HMAC-SHA256
-- determinista del teléfono para permitir búsqueda por igualdad exacta sin exponer
-- el número real.
-- El índice idx_clientes_telefono anterior queda sobre datos cifrados (inútil para
-- búsqueda), se reemplaza por uno sobre telefono_hash.
-- Se aplica sobre DBs existentes sin perder datos.

ALTER TABLE clientes ADD COLUMN telefono_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_clientes_telefono_hash ON clientes(telefono_hash);
