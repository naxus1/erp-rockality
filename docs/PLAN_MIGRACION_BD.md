# Plan de migración de base de datos (SQLite → Postgres gestionado)

Documento de decisión y plan. Estado: **pendiente** (a ejecutar antes de subir
los datos reales definitivos). Hoy el sistema corre en SQLite sobre EFS, ya
estabilizado (sin WAL + auto-recuperación + backup), suficiente para la fase de
prueba con pocos usuarios.

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

## Esfuerzo estimado

Medio. El acceso a datos está concentrado en `backend/src/repositories/*.ts`
(11 repos, ~50 funciones) + queries inline en `reportes.routes.ts`. Cambios:

1. Reemplazar `better-sqlite3` por un cliente Postgres (`pg` o `postgres.js`).
2. La API de better-sqlite3 es **síncrona**; Postgres es **async**. Hay que
   volver `async/await` las funciones de repositorio y sus llamadores. Es el
   cambio más extenso (mecánico, pero toca muchos archivos).
3. Ajustes de dialecto SQL:
   - `datetime('now')` / `julianday()` / `strftime()` → equivalentes Postgres
     (`now()`, `age()`, `date_trunc`, `EXTRACT`, `CURRENT_DATE`).
   - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL` / `GENERATED AS IDENTITY`.
   - `lastInsertRowid` → `RETURNING id`.
   - Índice único parcial de caja (una sesión abierta) → Postgres lo soporta
     igual (`CREATE UNIQUE INDEX ... WHERE estado = 'abierta'`).
   - `db.transaction(() => ...)` → transacciones async (`BEGIN/COMMIT`).
   - Búsqueda `UPPER(col) LIKE` → funciona igual (o usar `ILIKE`).
4. Cifrado (AES-GCM) y HMAC de teléfono: **sin cambios** (es a nivel app).
5. Migraciones: portar los 13 `.sql` al dialecto Postgres (o usar una
   herramienta de migraciones como node-pg-migrate).
6. Infra: quitar EFS, VPC, subredes privadas y el mount de la Lambda; añadir la
   cadena de conexión de Neon/Supabase como secreto/env var.

## Momento adecuado

Hacerlo **antes** de cargar los datos reales definitivos, para no migrar dos
veces. Mientras tanto, SQLite estabilizado cubre la fase de prueba.

## Costo tras migrar (referencia)

Con Postgres gestionado externo + fix del VPC endpoint ya aplicado:
~**$1/mes** (Secrets Manager + S3 + CloudWatch; Lambda/API GW/CloudFront/Cognito
en capa gratuita; EFS y VPC endpoint eliminados).
