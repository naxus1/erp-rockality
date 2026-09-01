# Plan de migración de base de datos (SQLite → Postgres gestionado)

Documento de decisión y plan. Estado: **HECHO** — se migró a **Neon** (Postgres
serverless). El backend usa `pg` (async) contra Neon; la Lambda salió de la VPC y
se eliminó el EFS. Ver la ejecución en `HANDOFF_MIGRACION_NEON.md` y la lección
#15 en `LECCIONES_DEPLOY.md`. Lo que sigue abajo es el análisis original que
sustentó la decisión (se conserva como registro).

## Por qué migrar

SQLite sobre EFS en Lambda es frágil con concurrencia real (ya causó una
corrupción: ver LECCIONES_DEPLOY.md #14). Para uso con varias personas y datos
reales conviene una base con concurrencia nativa.

## Por qué Postgres y NO DynamoDB

Se evaluó DynamoDB y se **descartó** para este ERP. Razones (el sistema es
fuertemente relacional):

- **JOINs**: gastos cruza 5 tablas, suscripciones 3, ventas/clientes/productos
  varios. DynamoDB no hace JOINs → habría que desnormalizar o unir en código.
- **Agregaciones**: el dashboard usa SUM/COUNT/GROUP BY (ventas del mes, gastos,
  saldo de caja, conciliación por método de pago). DynamoDB no las tiene.
- **Búsquedas LIKE** (clientes/terceros por nombre): DynamoDB no soporta LIKE.
- **6 transacciones multi-tabla** (venta = venta+detalle+stock+suscripción+pago+
  caja). Reescritura total.
- **IDs autoincrementales** en 11+ tablas: DynamoDB no los tiene.

Migrar a DynamoDB = reescribir casi todo el backend (semanas) y dejar dashboard
y búsquedas más lentos/complejos. Mala relación esfuerzo/beneficio.

**Postgres** mantiene TODO el SQL actual (JOINs, SUM, LIKE, transacciones), así
que la migración es principalmente cambiar el driver de datos, con mínima
reescritura de lógica.

## Opción recomendada: Postgres gestionado externo (Neon o Supabase)

- **Costo**: capa gratuita permanente, suficiente para un gimnasio → ~**$0/mes**.
- **Robustez**: concurrencia real, backups gestionados, sin corrupción por NFS.
- **Sin VPC**: al no usar EFS, la Lambda sale de la VPC (menos complejidad y costo).

Alternativas AWS-nativas (se pasan de ~$10/mes, por eso no se eligen ahora):
Aurora Serverless v2 (~$45+/mes), RDS db.t4g.micro (~$12–15/mes).

## Esfuerzo estimado (todos los puntos ya EJECUTADOS)

Medio. El acceso a datos estaba concentrado en `backend/src/repositories/*.ts`
(11 repos, ~50 funciones) + queries inline en `reportes.routes.ts`. Cambios
realizados:

1. ✅ Se reemplazó `better-sqlite3` por `pg` (y se quitó `better-sqlite3`).
2. ✅ Toda la capa de datos y sus llamadores (rutas) pasaron a `async/await`
   (con un `asyncHandler` para propagar errores en Express 4).
3. ✅ Ajustes de dialecto SQL:
   - `datetime('now')` / `julianday()` / `strftime()` → equivalentes Postgres
     (`now()`, `age()`, `date_trunc`, `EXTRACT`, `CURRENT_DATE`).
   - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL` / `GENERATED AS IDENTITY`.
   - `lastInsertRowid` → `RETURNING id`.
   - Índice único parcial de caja (una sesión abierta) → Postgres lo soporta
     igual (`CREATE UNIQUE INDEX ... WHERE estado = 'abierta'`).
   - `db.transaction(() => ...)` → transacciones async (`BEGIN/COMMIT`).
   - Búsqueda `UPPER(col) LIKE` → funciona igual (o usar `ILIKE`).
4. ✅ Cifrado (AES-GCM) y HMAC de teléfono: **sin cambios** (es a nivel app).
5. ✅ Migraciones: se consolidaron los 13 `.sql` en un único
   `backend/src/db/postgres/schema.sql` idempotente (se aplica al arrancar).
6. ✅ Infra: se quitaron EFS, VPC, subredes y el mount de la Lambda; la
   `DATABASE_URL` de Neon se inyecta como parámetro `DatabaseUrl` (desde el
   GitHub Secret `DATABASE_URL`).

## Momento adecuado

Se hizo **antes** de cargar los datos reales definitivos (la base arrancó limpia
en Neon, solo con seeds), justo como se planeó, para no migrar dos veces.

## Costo tras migrar (referencia)

Con Postgres gestionado externo + fix del VPC endpoint ya aplicado:
~**$1/mes** (Secrets Manager + S3 + CloudWatch; Lambda/API GW/CloudFront/Cognito
en capa gratuita; EFS y VPC endpoint eliminados).
