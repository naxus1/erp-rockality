# Handoff — Migración de SQLite/EFS a Neon (PostgreSQL)

> Documento de traspaso para continuar la migración de la base de datos en una
> sesión nueva. Contiene TODO el contexto necesario: qué es el proyecto, qué se
> hizo, el estado actual, la decisión de migrar a Neon, y el plan de tareas
> pendiente con detalles técnicos. Léelo completo antes de empezar.

---

## 1. Qué es el proyecto

**ERP Rockality**: sistema de gestión para un gimnasio en Colombia (moneda COP,
montos en centavos como INTEGER). Monorepo con:

- **backend/**: Node.js + Express + TypeScript (CommonJS). Hoy usa **SQLite
  (better-sqlite3)**. Corre en AWS Lambda.
- **frontend/**: React + Vite + TypeScript + Tailwind. SPA servida por CloudFront.

Módulos del ERP: Clientes, Productos, Ventas, Planes/Suscripciones, Gastos,
Compras, Terceros (proveedores/empleados), Caja (control de efectivo), Catálogos,
Reportes (dashboard + conciliación).

## 2. Infraestructura AWS actual (desplegada, us-east-1)

- Cuenta AWS: **545860874640**, región **us-east-1**, perfil CLI **rockality**.
- Stacks CloudFormation: **rockality-prod** (app) y **rockality-cicd** (OIDC deploy).
- IaC con **AWS SAM** (`infra/template.yaml`).
- **API** (HTTP API Gateway + JWT authorizer Cognito): https://gre6acehzf.execute-api.us-east-1.amazonaws.com
- **Frontend** (CloudFront): https://d2a6va7cqw90db.cloudfront.net
- Bucket frontend: rockality-prod-frontend-545860874640 | CloudFront distId: E11ILNTFPG49JV
- **Cognito** UserPool: us-east-1_EFIr6GzOB | ClientId: 300vt2q0b5odt2q8vv9jldba5l
- Secret clave cifrado: arn:aws:secretsmanager:us-east-1:545860874640:secret:rockality/prod/encryption-key-nPtgYU
- Lambda: `rockality-prod-api`, arm64, 256 MB, **hoy dentro de VPC** por EFS.
- **EFS**: guarda el SQLite en `/mnt/data/prod.db` (esto se ELIMINA al migrar a Neon).
- Usuario admin Cognito: admin@rockality.com / Rockality2026! (grupo admin, CONFIRMED).
- Costo actual: ~$1/mes (tras quitar el VPC endpoint de Secrets Manager).

## 3. CI/CD y flujo git (RESPETAR SIEMPRE)

- **Flujo**: feature branch -> PR -> **squash a develop**; release **develop -> main
  con merge commit**; push a main dispara el **CD** (workflow `.github/workflows/cd.yml`).
- main y develop protegidos; CI obligatorio ("Lint & Format" + "Security Audit").
- **CD autenticación: OIDC** (rol `rockality-github-deploy-oidc`). Sin access keys.
  El `sub` del trust usa formato inmutable de GitHub (owner_id 16293755, repo_id
  1330171970). Ver LECCIONES_DEPLOY.md #12.
- El CD hace: build backend -> `sam build --use-container` -> `sam deploy` ->
  build frontend -> s3 sync -> invalidación CloudFront -> health check con reintentos.
- Pre-commit hook (husky + lint-staged): corre eslint/prettier. OJO: la config
  root de eslint NO tiene la regla `react-hooks/exhaustive-deps` registrada; NO
  usar comentarios `eslint-disable react-hooks/exhaustive-deps` (rompe el hook).
- Números de PR usados hasta ahora: llegan hasta ~#106. El siguiente será mayor.

## 4. Qué se hizo en las sesiones previas (resumen)

Funcionalidad y fixes ya en producción (todo por el flujo git):

1. Deploy inicial completo a AWS (SAM + Lambda + EFS/SQLite + Cognito + CloudFront).
2. CI/CD con OIDC (tras descartar access keys). Lecciones documentadas.
3. Fix health check 500: config lanzaba fail-fast síncrono si faltaba ENCRYPTION_KEY;
   ahora solo si faltan env var Y ARN. Health check del CD con reintentos.
4. Diseño **responsive** en todas las páginas (móvil/tablet/desktop).
5. **Módulo de Caja** (efectivo): sesiones, arqueo/cierre, retiros, movimientos.
   Enganche automático: ventas/abonos/gastos/compras en EFECTIVO entran/salen de
   caja; pagos digitales NO. "Efectivo" se resuelve por NOMBRE del método.
6. **Normalización de texto**: todos los textos a MAYÚSCULAS + trim + colapso de
   espacios (helper `backend/src/schemas/text.ts`: toUpper/toClean/normalizeSpaces).
   Email a minúsculas. Búsquedas usan UPPER(col) LIKE. Aplicado en todos los schemas.
7. Clientes: campos nuevos **hace_ejercicio** (bool) y **whatsapp** (texto) — migración 013.
8. Errores de validación específicos por campo (api.ts arma mensaje desde
   `data.details`; middleware validate mapea nombres técnicos a etiquetas legibles).
9. Referido obligatorio en Clientes; asteriscos (\*) en campos obligatorios en todo el ERP.
10. **Skeletons de carga** en todas las páginas (`frontend/src/components/Skeleton.tsx`:
    TableSkeletonRows, CardSkeleton, CardSkeletonGrid).
11. **Sesión de 3h** (Cognito RefreshTokenValidity 180 min): aviso 5 min antes +
    logout al vencer + redirect a login ante 401 (`AuthContext.tsx`, `api.ts`).
12. **Incidente de corrupción SQLite/EFS** (disk I/O error -> file is not a database).
    Causa: WAL sobre NFS + concurrencia sin límite. Fix: quitar WAL (journal
    TRUNCATE), auto-recuperación (aparta .corrupt y recrea), limpieza de sidecars,
    BackupPolicy EFS. Ver LECCIONES_DEPLOY.md #14. **La DB quedó VACÍA** (eran datos
    de prueba). ReservedConcurrency=1 pendiente (cuenta capada a 10, AWS exige >=10 libres).
13. **Reducción de costo**: eliminado el VPC Interface Endpoint de Secrets Manager
    (~$14/mes). La clave de cifrado ahora se inyecta como env var `ENCRYPTION_KEY`
    vía dynamic reference de CloudFormation (`{{resolve:secretsmanager:...}}`), la
    Lambda ya no llama a Secrets Manager en runtime. Costo total ~$1/mes.

Docs existentes en `docs/`: CONTEXTO_PROYECTO.md, PLAN_DE_FASES.md, DEPLOY_AWS.md,
RUNBOOK_AWS.md, LECCIONES_DEPLOY.md (14 lecciones), PLAN_MIGRACION_BD.md,
COMPARATIVA_SUPABASE_NEON.md, y este HANDOFF.

## 5. Por qué migramos a Neon (PostgreSQL) y NO a DynamoDB

- SQLite sobre EFS es frágil con concurrencia (ya causó una corrupción real).
- **DynamoDB descartado**: el ERP es fuertemente relacional (JOINs de 3-5 tablas,
  SUM/COUNT/GROUP BY en dashboard/caja, búsquedas LIKE, 6 transacciones multi-tabla,
  IDs autoincrementales en 11 tablas). Migrar a DynamoDB = reescribir casi todo +
  dashboard/búsquedas peor. Mala relación esfuerzo/beneficio. Ver PLAN_MIGRACION_BD.md.
- **Neon** (Postgres serverless): mantiene TODO el SQL actual. Free plan ($0, sin
  límite de tiempo, 0.5 GB, 100 CU-h/mes, scale-to-zero) cubre de sobra un gimnasio.
- Se eligió Neon sobre Supabase porque solo se necesita la base (Cognito ya da auth,
  S3/CloudFront el frontend). Ver COMPARATIVA_SUPABASE_NEON.md.

## 6. Estado de Neon (LISTO PARA USAR)

- Proyecto Neon creado: **erp-rockality**, región **AWS US East 2 (Ohio)** (el Free
  solo ofrecía Ohio; la Lambda está en Virginia, se conectan por internet con TLS,
  latencia despreciable para este uso).
- Base: `neondb`, PostgreSQL **18.6**. Solo servicio Postgres activado (sin Auth/
  Storage/Functions de Neon).
- **Conexión PROBADA y funcionando** (psql conectó OK).
- La `DATABASE_URL` está guardada en `backend/.env` (GITIGNOREADO, no en el repo):
  `postgresql://neondb_owner:<password>@ep-lively-rain-ayp68x7q-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require`
  (usar la connection **pooled**). El password real está en backend/.env.
- **PENDIENTE DE SEGURIDAD**: el password de Neon se compartió en el chat. Rotarlo
  en Neon (Settings -> reset password del rol) al terminar la migración, y actualizar
  backend/.env y el secreto en AWS.

## 7. Esquema y capa de datos actuales (para portar)

**~26 tablas** en 13 migraciones SQL (`backend/src/db/migrations/001..013`):

- Catálogos (id autoincrement, seed): canales_captacion, sexos, ciudades,
  categorias_producto, unidades_medida, metodos_pago (Efectivo/Transferencia/Tarjeta/
  Nequi/Daviplata), tipos_tercero, gerencias, tipos_gasto, categorias_gasto,
  variantes_producto, usuarios_sistema (PK TEXT).
- PK natural TEXT: clientes(cedula), terceros(nit), productos(sku).
- Autoincrement (INTEGER PK): ventas, detalle_venta, pagos, planes, suscripciones,
  gastos, compras, detalle_compra, audit_log, caja_sesiones, caja_movimientos.
- Relaciones: ventas->cliente; detalle_venta->venta; pagos->venta; suscripciones->
  cliente+plan+venta; gastos->tercero+gerencia+tipo+categoria+metodo_pago; compras->
  gasto(1:1 auto)+tercero; detalle_compra->compra; caja_movimientos->caja_sesion.
- **11 repositorios** en `backend/src/repositories/*.ts` (~50 funciones), SÍNCRONOS
  (better-sqlite3). Queries clave: JOINs (gastos 5, suscripciones 3, ventas/clientes),
  agregaciones SUM/COUNT/GROUP BY (dashboard, caja, conciliación), LIKE (clientes/
  terceros), 6 db.transaction (ventas/pagos/gastos/compras/caja).
- **Cifrado** (`backend/src/utils/crypto.ts`, AES-256-GCM, prefijo "enc:v1:"): SOLO
  clientes.email y clientes.telefono. HMAC-SHA256 (telefono_hash) para búsqueda
  exacta de teléfono. Esto NO cambia al migrar (es a nivel app).
- Índice único parcial importante: caja_sesiones solo permite UNA sesión abierta
  (`WHERE estado='abierta'`). Postgres lo soporta igual.

## 8. Plan de tareas PENDIENTE (la migración)

**Fase 1 — Preparación**

1. Agregar dependencia `pg` (+`@types/pg`), quitar `better-sqlite3` de backend/package.json.
   Quitar `@aws-sdk/client-secrets-manager` si ya no se usa (la clave viene por env var).
2. Reescribir `backend/src/db/connection.ts`: pool de `pg` usando `DATABASE_URL`
   (ssl requerido; para Neon pooled). Exponer un `query()` async y `getPool()`.
   Eliminar toda la lógica de archivo/WAL/recuperación de SQLite.
3. Portar las 13 migraciones a Postgres: `INTEGER PRIMARY KEY AUTOINCREMENT` ->
   `GENERATED ALWAYS AS IDENTITY` (o SERIAL); `datetime('now')` -> `now()`;
   `TEXT`/`INTEGER` se mantienen; CHECK constraints igual; índice único parcial de
   caja igual; seeds igual. Considerar un runner de migraciones para pg (o portar
   `db/init.ts` a async con la tabla \_migrations).

**Fase 2 — Reescribir repositorios a async/pg (lo más extenso)** 4. Repos simples -> async + placeholders `$1..` + `RETURNING`: clientes, terceros,
productos, planes, categorias-producto, suscripciones. 5. Repos transaccionales -> async con BEGIN/COMMIT usando un client dedicado del
pool: ventas (la más compleja: venta+detalle+stock+suscripción+pago+caja), pagos,
gastos, compras, caja. El enganche `registrarMovimientoEfectivo` debe recibir el
client de la transacción pg. 6. Dialecto SQL a Postgres: `julianday(fecha_fin)-julianday('now')` -> diferencia de
fechas (`(fecha_fin::date - CURRENT_DATE)`); `strftime('%m'/'%Y', fecha)` ->
`EXTRACT(MONTH/YEAR FROM ...)` o `to_char`; `lastInsertRowid` -> `RETURNING id`;
`UPPER(col) LIKE` funciona igual (o `ILIKE`). Edad del cliente con `date_part`. 7. Propagar `async/await` a las rutas (`backend/src/routes/*.ts`) y middleware que
llaman repos. reportes.routes.ts (dashboard/conciliación) reescribir agregaciones.
audit middleware si escribe sync.

**Fase 3 — Infraestructura (`infra/template.yaml`)** 8. Sacar la Lambda de la VPC: quitar `VpcConfig`, `FileSystemConfigs`. Eliminar EFS
(`FileSystem`, `MountTarget1/2`, `AccessPoint`), subredes privadas si ya no se usan,
SG de Lambda/EFS. Quitar env var `DB_PATH`. Mantener la Lambda con salida a
internet (fuera de VPC ya tiene salida) para llegar a Neon. 9. Guardar `DATABASE_URL` de Neon en un nuevo secreto de Secrets Manager e inyectarla
como env var `DATABASE_URL` vía dynamic reference (igual patrón que ENCRYPTION_KEY).
OJO: crear el secreto con el valor de Neon (no autogenerado). 10. `handler.ts`/`index.ts`: quitar `loadEncryptionKey` de Secrets si aplica (la clave
ya viene por env var; `loadEncryptionKey` es no-op sin ARN, se puede dejar o quitar).
Ejecutar migraciones al arrancar (o correrlas una vez manualmente contra Neon).

**Fase 4 — Validación y despliegue** 11. Probar en LOCAL contra Neon (`npm run dev` en backend con DATABASE_URL del .env):
crear cliente (verificar cifrado email/teléfono y búsqueda), venta con pago,
caja (abrir/movimiento/cerrar), dashboard, conciliación. Correr migraciones en Neon. 12. Build backend + frontend, lint. Commit por flujo git: branch -> PR -> develop ->
release a main -> CD. Vigilar el CD (health check). 13. Verificar en producción: health 200, login, dashboard, crear registros, cifrado.

**Fase 5 — Limpieza y cierre** 14. Confirmar que la base Neon tiene el esquema y el admin funciona. Recrear usuario
admin de Cognito NO aplica (Cognito no cambia). Si el sistema tenía un
usuarios_sistema en DB, sembrarlo en Neon. 15. Rotar el password de Neon (se filtró en el chat) y actualizar .env + secreto AWS. 16. Documentar la migración en RUNBOOK_AWS.md y agregar lección a LECCIONES_DEPLOY.md.
Actualizar PLAN_MIGRACION_BD.md a "hecho".

## 9. Notas y riesgos

- La base actual (SQLite/EFS) está VACÍA por la corrupción -> arrancamos limpio en
  Neon, NO hay que migrar datos. Los datos reales se cargarán después, ya sobre Neon.
- El frontend casi NO cambia (la API mantiene los mismos contratos JSON).
- Riesgo principal: la conversión sync->async toca muchos archivos; hacerlo por
  fases y verificar build+lint en cada una.
- Mantener el cifrado AES-GCM y el HMAC de teléfono TAL CUAL (no depende de la BD).
- No romper el patrón de respuestas `{success, data|error, details?}`.
- better-sqlite3 requería `sam build --use-container` por el binario nativo; con
  `pg` (JS puro) YA NO es necesario el contenedor -> el CD puede simplificarse
  (opcional): `sam build` sin `--use-container`. Validar igual.

## 10. Cómo arrancar en la sesión nueva

1. Leer este handoff + PLAN_MIGRACION_BD.md + COMPARATIVA_SUPABASE_NEON.md.
2. Confirmar conexión a Neon: `psql "$DATABASE_URL" -c "SELECT version();"`
   (DATABASE_URL está en backend/.env).
3. Empezar por Fase 1 (deps + connection.ts + esquema Postgres), validar creando el
   esquema en Neon, y avanzar fase por fase con el flujo git.
