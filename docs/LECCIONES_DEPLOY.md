# Lecciones del primer deploy a AWS (SAM + Lambda + EFS + Cognito + CloudFront)

Registro de los problemas reales que aparecieron al desplegar el ERP a AWS por
primera vez, con su causa y solución. Sirve como **checklist preventivo** para no
repetirlos en otros proyectos (p. ej. oil & gas).

Arquitectura del deploy (actual): S3+CloudFront (frontend) -> API Gateway
(HTTP API + JWT authorizer) -> Lambda (Express, arm64, FUERA de VPC) -> Neon
(Postgres serverless externo, por TLS). Secrets Manager (clave de cifrado). IaC
con AWS SAM.

> Nota histórica: al inicio la base era SQLite sobre EFS y la Lambda vivía en una
> VPC privada. Tras una corrupción del SQLite (#14) se migró a Neon (#15): se
> quitaron VPC y EFS. Varias lecciones de abajo (#4, #5, #6, #14 y partes de #2)
> son de esa etapa SQLite/EFS y quedan como referencia.

## Resumen (checklist rápido para el próximo proyecto)

- [ ] Cognito: si MFA es OPTIONAL/REQUIRED, define `EnabledMfas` (TOTP) o falla pidiendo SMS.
- [ ] Lambda `ReservedConcurrentExecutions`: cuentas nuevas exigen dejar >=10 sin reservar.
- [ ] Backend en Lambda: usar **CommonJS** (o bundler) para evitar problemas de resolución ESM.
- [ ] Dependencias nativas (better-sqlite3): `sam build --use-container` (binario Linux, no macOS).
- [ ] Copiar assets no-JS (`.sql`, etc.) a `dist/` en el build (tsc no los copia).
- [ ] Lambda en VPC sin internet: agregar **VPC endpoints** para los servicios AWS que use (Secrets Manager, etc.).
- [ ] HTTP API: usar stage `$default` para que el path no lleve prefijo (`/prod`).
- [ ] No re-validar el JWT en la Lambda si API Gateway ya lo valida (y la VPC no tiene salida a las JWKS).
- [ ] Frontend + Vite + libs de Node (cognito): definir `global: 'globalThis'`.
- [ ] CORS: el preflight `OPTIONS` debe ser público (sin authorizer).
- [ ] Docker Desktop: desactivar "Resource Saver" (pausa el daemon durante builds).
- [ ] Desplegar el artefacto empaquetado (`.aws-sam/build/template.yaml`), verificar `CodeSize` en la Lambda.
- [ ] No hacer `throw` síncrono en la carga de config si el valor se resuelve async (Secrets Manager). Validar presencia de la fuente (env o ARN), no el valor final.
- [ ] Health check post-deploy con reintentos (el cold start + fetch del secreto tarda).
- [ ] SQLite sobre EFS: NUNCA usar WAL (usar TRUNCATE); concurrencia reservada = 1; backups de EFS activos. Considerar base gestionada si crece el uso.

---

## Los problemas, en detalle

### 1. Cognito falla: "SMS configuration ... required when MFA is required/optional"

- **Síntoma**: `CREATE_FAILED` en `AWS::Cognito::UserPool` durante el deploy.
- **Causa**: con `MfaConfiguration: OPTIONAL` (o REQUIRED), Cognito exige configurar SMS
  y verificación de teléfono, salvo que se declare explícitamente el método MFA.
- **Solución**: usar TOTP (software token) y declararlo: `EnabledMfas: [SOFTWARE_TOKEN_MFA]`.
  Así no pide SMS. Alternativa: `MfaConfiguration: OFF`.

### 2. Lambda: "ReservedConcurrentExecutions ... below its minimum value of [10]"

- **Síntoma**: `CREATE_FAILED` en `AWS::Lambda::Function`.
- **Causa**: las cuentas AWS nuevas tienen un límite bajo de concurrencia (10) y AWS
  exige mantener >=10 sin reservar. Reservar 1 dejaba el resto por debajo del mínimo.
- **Solución**: quitar `ReservedConcurrentExecutions` (o solicitar aumento de límite).
  Para SQLite lo ideal sería reservar 1; con poco tráfico el riesgo es bajo.

### 3. Lambda: "Cannot find package '@vendia/serverless-express'" (ESM)

- **Síntoma**: `Runtime.ImportModuleError` al invocar; imports ESM no resolvían en Lambda.
- **Causa**: el backend estaba como ESM (`"type":"module"`) y la resolución de módulos
  ESM en Lambda fallaba con paquetes sin `exports` bien definidos.
- **Solución**: compilar el backend a **CommonJS** (`"module":"CommonJS"`, quitar
  `"type":"module"`), reemplazar `import.meta.url` por `__dirname`. tsx sigue sirviendo en dev.

### 4. better-sqlite3: binario nativo incompatible (macOS vs Linux)

- **Síntoma**: la Lambda cargaba un `.node` Mach-O (macOS) en un runtime Linux.
- **Causa**: `sam build` sin contenedor compila el binario nativo para el host (Mac ARM).
- **Solución**: `sam build --use-container` (compila dentro del contenedor de Lambda,
  produciendo un binario ELF Linux arm64). Requiere Docker.

### 5. Migraciones .sql ausentes en el artefacto

- **Síntoma**: `ENOENT: scandir '/var/task/dist/db/migrations'` al iniciar la DB.
- **Causa**: `tsc` solo emite `.js`; no copia los `.sql`. El artefacto no tenía las migraciones.
- **Solución**: agregar un paso `copy-assets` al build que copie `src/db/migrations/*.sql`
  a `dist/db/migrations/`.

### 6. Lambda en VPC sin internet no alcanza Secrets Manager

- **Síntoma**: la función se colgaba 30s y daba timeout (503) al leer el secreto.
- **Causa**: la Lambda está en subredes privadas sin NAT/IGW (por costo), así que no
  puede salir a internet para llamar a Secrets Manager.
- **Solución**: agregar un **VPC Interface Endpoint** para `secretsmanager` (con su SG
  permitiendo 443 desde la Lambda). Aplica igual para cualquier servicio AWS que use.

### 7. HTTP API: el stage `/prod` ensuciaba el path

- **Síntoma**: Express recibía `GET /prod/api/health` y devolvía 404.
- **Causa**: con un stage nombrado (`prod`), el path incluye el nombre del stage.
- **Solución**: usar `StageName: $default` (sin prefijo). El path llega limpio (`/api/...`).

### 8. Doble validación del JWT (la Lambda no llega a las JWKS)

- **Síntoma**: 401 "Token inválido o expirado" aun con token válido.
- **Causa**: el middleware re-validaba el JWT con `aws-jwt-verify`, que necesita
  descargar las JWKS de Cognito por internet — pero la VPC no tiene salida.
- **Solución**: como API Gateway (HTTP API JWT authorizer) **ya valida** el token,
  el backend toma los claims del `requestContext.authorizer.jwt.claims`
  (vía `getCurrentInvoke()` de serverless-express) sin re-validar. Fallback a
  `aws-jwt-verify` solo cuando corre sin API Gateway delante.

### 9. Pantalla en blanco en el frontend ("global is not defined")

- **Síntoma**: la web cargaba en blanco; error `ReferenceError: global is not defined`.
- **Causa**: `amazon-cognito-identity-js` referencia `global` (de Node), inexistente
  en el navegador.
- **Solución**: en `vite.config.ts`, `define: { global: 'globalThis' }`.

### 10. CORS: preflight OPTIONS rechazado con 401

- **Síntoma**: "Preflight response is not successful. Status code 401" y "Load failed".
- **Causa**: el navegador envía el preflight `OPTIONS` sin token; el JWT authorizer por
  defecto lo rechazaba con 401 antes de responder el CORS.
- **Solución**: ruta `OPTIONS /{proxy+}` con `Authorizer: NONE` (preflight público).
  Responde 204 con los headers CORS; las llamadas reales siguen protegidas.

### 11. Deploy subió un artefacto incompleto (sin node_modules)

- **Síntoma**: la Lambda no encontraba dependencias; `CodeSize` era ~236 KB (muy chico).
- **Causa**: se desplegó desde el template fuente en vez del empaquetado, subiendo solo
  el código sin `node_modules`.
- **Solución**: desplegar con `sam deploy -t .aws-sam/build/template.yaml` (el template
  que produce `sam build`). Verificar `CodeSize` de la Lambda tras el deploy (debe reflejar deps).

### 12. OIDC de GitHub Actions: "Not authorized to perform sts:AssumeRoleWithWebIdentity"

- **Síntoma**: el workflow de CD fallaba al asumir el rol vía OIDC, aun con provider,
  principal y audiencia correctos.
- **Causa raíz (la de fondo)**: GitHub cambió el formato del claim `sub` de los
  tokens OIDC. Los repos **creados después del 2026-07-15** usan por defecto un
  formato **inmutable** que incluye el ID numérico del owner y del repo, con `@`
  como separador: `repo:org@<owner_id>/repo@<repo_id>:ref:refs/heads/main`
  (en vez del clásico `repo:org/repo:ref:refs/heads/main`). Nuestro repo se creó
  el 2026-08-10, así que emite el formato nuevo. El trust policy con el nombre
  plano (o con comodín) **nunca matcheaba** el `sub` real → `Not authorized`.
  Fuentes: github.blog changelog "Immutable subject claims for GitHub Actions
  OIDC tokens" y docs.github.com (OpenID Connect reference).
- **Factores secundarios** que también hay que cuidar:
  1. `default_workflow_permissions` debe permitir el `id-token` (poner `write`, o
     que el workflow pida `permissions: id-token: write` explícito).
  2. `aud` = `sts.amazonaws.com` con `StringEquals`; el `sub` con `StringLike`.
     Nunca usar comodín amplio no-scoped.
- **Solución aplicada**: en `infra/cicd.yaml` se creó el OIDC provider + rol
  `rockality-github-deploy-oidc` con un trust policy cuyo `sub` es una **lista**
  que cubre AMBOS formatos (clásico e inmutable con los IDs reales: owner
  `16293755`, repo `1330171970`), scoped a `refs/heads/main`. El `cd.yml` usa
  `role-to-assume` + `permissions: id-token: write` (sin access keys).
- **Cómo obtener los IDs**: `gh api repos/<org>/<repo> --jq '{owner_id: .owner.id, repo_id: .id}'`.
- **No es problema de propagación**: el cambio de subject claims ya está activo en
  prod y los trust policies de IAM aplican en segundos; lo que fallaba era que el
  patrón no coincidía con el nuevo `sub`.
- **Limpieza post-validación**: una vez confirmado OIDC end-to-end, se borró el
  usuario IAM de respaldo `rockality-github-deploy`, su access key y los GitHub
  Secrets `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. El CD ya no depende de
  llaves permanentes. (Orden correcto: borrar primero la access key con
  `aws iam delete-access-key`, luego el usuario — si es de CloudFormation, quitar
  el recurso del template y re-desplegar.)
- **Recomendación oil & gas**: para OIDC en repos nuevos, construir el `sub` con el
  formato inmutable (owner_id/repo_id) desde el inicio, o usar una lista que cubra
  ambos formatos. Verificar `default_workflow_permissions` y `aud`. No dejar access
  keys de respaldo más tiempo del necesario.

### 13. Fail-fast síncrono choca con la resolución async del secreto (health 500)

- **Síntoma**: tras un deploy vía CI, `/api/health` devolvía **HTTP 500** y la Lambda
  crasheaba en init: `ENCRYPTION_KEY es obligatoria en producción` (en `config/index.js`).
- **Causa**: `config/index.ts` hacía un `throw` **síncrono al cargar el módulo** si
  `ENCRYPTION_KEY` no estaba en el entorno. Pero en producción la clave NO viene como
  env var: solo se inyecta `ENCRYPTION_KEY_SECRET_ARN`, y la clave se resuelve de forma
  **asíncrona** al arrancar (`loadEncryptionKey()` -> Secrets Manager). El throw ocurría
  antes de esa resolución, matando la Lambda en init (INIT_REPORT Status: error).
- **Solución**: el fail-fast solo debe disparar si faltan **ambas** fuentes
  (`ENCRYPTION_KEY` **y** `ENCRYPTION_KEY_SECRET_ARN`). Si hay ARN, se confía en la
  resolución async del arranque. Además, el health check del CD se hizo con reintentos
  (10x cada 10s) para dar margen al cold start + fetch del secreto.
- **Recomendación oil & gas**: cuidado con validaciones fail-fast en el nivel de módulo
  (top-level) cuando la config real se resuelve async (Secrets Manager, Parameter Store).
  Validar la **presencia de la fuente** (env o ARN) en el arranque, y validar el **valor
  ya resuelto** dentro del bootstrap async, no en la carga del módulo.

### 14. SQLite sobre EFS se corrompió (disk I/O error -> file is not a database)

- **Síntoma**: "Error interno del servidor" (500) en toda la app. En CloudWatch:
  primero `[ERROR] disk I/O error`, luego `[ERROR] file is not a database`. La
  base SQLite en EFS quedó corrupta.
- **Causa (tres factores combinados)**:
  1. **WAL sobre EFS/NFS**: `connection.ts` tenía `journal_mode = WAL`. WAL usa
     memoria compartida (mmap/shm) entre procesos, que **NFS/EFS no soporta**;
     es una causa documentada de corrupción de SQLite sobre red.
  2. **Concurrencia sin límite**: la Lambda tenía `ReservedConcurrentExecutions`
     sin fijar, así que AWS levantaba varias instancias en paralelo, todas
     escribiendo el mismo `/mnt/data/prod.db`. SQLite no soporta escritura
     concurrente multi-proceso sobre NFS.
  3. **Sin backups**: no había punto de restauración.
- **Solución aplicada**:
  1. **Quitar WAL**: `journal_mode = TRUNCATE` (rollback journal clásico, seguro
     en NFS) + `synchronous = FULL` + `busy_timeout = 10000`.
  2. **Auto-recuperación**: al abrir la DB se hace un `SELECT count(*) FROM
sqlite_master`; si lanza "not a database/malformed/disk I/O", el archivo
     corrupto (y sus sidecars -wal/-shm/-journal) se aparta con sufijo
     `.corrupt-<ts>` y se crea una base nueva (las migraciones recrean el
     esquema). El servicio se recupera solo.
  3. **Backups**: `BackupPolicy: ENABLED` en el EFS (AWS Backup diario).
  4. **Concurrencia 1**: pendiente hasta que suba el límite de la cuenta (hoy
     capada a 10; AWS exige dejar >=10 sin reservar). Dejar
     `ReservedConcurrentExecutions: 1` cuando el límite lo permita.
- **Recomendación oil & gas / futuro**: SQLite sobre EFS en Lambda es frágil con
  concurrencia real. Para algo más que unos pocos usuarios, usar una base
  gestionada (DynamoDB, o Aurora Serverless v2 / RDS Postgres). Si se mantiene
  SQLite: NUNCA WAL sobre EFS, concurrencia reservada = 1, y backups.

### 15. Migración de SQLite/EFS a Neon (Postgres serverless externo)

- **Contexto**: tras la corrupción de SQLite sobre EFS (#14), se migró la base a
  **Neon** (Postgres serverless, plan free). Decisión y comparativa en
  `PLAN_MIGRACION_BD.md` y `COMPARATIVA_SUPABASE_NEON.md`; se descartó DynamoDB
  por lo relacional del ERP (JOINs, agregaciones, transacciones, LIKE, IDs
  autoincrementales). El detalle de la ejecución está en `HANDOFF_MIGRACION_NEON.md`.
- **Qué implicó (por fases)**:
  1. Portar el esquema (13 migraciones SQLite -> un `schema.sql` Postgres
     idempotente): `INTEGER AUTOINCREMENT` -> `GENERATED ALWAYS AS IDENTITY`;
     timestamps de auditoría -> `TIMESTAMPTZ now()`; montos -> `BIGINT`; booleanos
     siguen como `INTEGER 0/1`; índice único parcial de caja igual; seeds con
     `ON CONFLICT DO NOTHING`.
  2. Reescribir la capa de datos de **síncrona** (better-sqlite3) a **async**
     (`pg`): 11 repos + queries inline. Placeholders `$1..`, `RETURNING id`,
     transacciones con un client dedicado (`BEGIN/COMMIT/ROLLBACK`). Dialecto:
     `datetime('now')`->`now()`, `julianday(a)-julianday('now')`->
     `(a::date - CURRENT_DATE)`, edad con `date_part('year', age(...))`,
     `strftime`->`to_char`, `lastInsertRowid`->`RETURNING`, `changes`->`rowCount`.
  3. Infra: quitar VPC, subredes, SGs y EFS; la Lambda sale de la VPC (salida a
     internet nativa para llegar a Neon por TLS). El CD ya NO usa
     `sam build --use-container` (pg es JS puro, sin binario nativo).
- **Trampas concretas que aparecieron**:
  - **BIGINT llega como string**: el driver `pg` devuelve `INT8` (OID 20) como
    string para no perder precisión. Los montos en centavos y conteos caben de
    sobra en `Number`, así que se fijó `types.setTypeParser(INT8, Number)` una vez
    en `connection.ts` (evita castear en cada repo y conserva el tipo `number`
    que daba SQLite). Si hubiera enteros > 2^53, NO hacer esto.
  - **Express 4 no captura promesas rechazadas**: un `await` que lanza en un
    handler async deja la request colgada. Se añadió un `asyncHandler` que hace
    `fn(req,res,next).catch(next)` y se envolvió cada ruta.
  - **`ssl` para Neon**: la connection string trae `sslmode=require`; además se
    pasó `ssl: { rejectUnauthorized: false }` en el Pool por si el entorno no
    tiene el CA raíz. (pg avisa que `require` se tratará como `verify-full` en una
    versión futura; es solo warning, la conexión funciona.)
  - **Errores de unicidad**: `INSERT OR IGNORE`/catch de SQLite -> detectar el
    código de error de pg **`23505`** (unique_violation) en catálogos/usuarios.
  - **`DATABASE_URL` fuera del repo**: se pasa como parámetro `DatabaseUrl`
    (`NoEcho: true`) desde un **GitHub Secret** `DATABASE_URL` (el CD lo inyecta),
    no como secreto autogenerado de CloudFormation ni en `parameters/*.json`.
  - **Aplicar el esquema al arrancar**: `init.ts` corre `schema.sql` (idempotente)
    en cada cold start. Recordar copiar `postgres/*.sql` a `dist/` en el build.
- **Costo/robustez**: Neon free = ~$0/mes, concurrencia real (adiós corrupción por
  NFS), backups gestionados. Se eliminó el EFS y la VPC (menos complejidad y costo).
- **Seguridad**: el password de Neon se compartió en el chat durante el setup, así
  que se **rotó** al terminar (Neon -> reset password del rol) y se actualizaron
  `backend/.env` y el GitHub Secret `DATABASE_URL`. Lección: nunca dejar una
  credencial que pasó por un canal no confiable; rotarla al cerrar.
- **Recomendación oil & gas**: si el proyecto es relacional, un Postgres gestionado
  (Neon/Supabase/RDS) evita toda la fragilidad de SQLite-sobre-EFS y saca la Lambda
  de la VPC. Planear async desde el inicio (no arrastrar una capa de datos síncrona).

### (operativo) Docker Desktop se pausa durante los builds

- **Síntoma**: `sam build --use-container` falla intermitentemente con "requires a
  container runtime" aunque Docker "parecía" abierto.
- **Causa**: la función **Resource Saver** de Docker Desktop pausa el motor tras
  inactividad.
- **Solución**: Docker Desktop -> Settings -> Resources -> desactivar "Resource Saver".

---

## Recomendaciones para el próximo proyecto (oil & gas)

1. Definir la arquitectura de módulos del backend (CommonJS o bundler) **antes** de escribir código.
2. Si hay dependencias nativas, planear el build en contenedor desde el inicio.
3. Si la Lambda va en VPC privada, listar **todos** los servicios AWS que usará y crear sus VPC endpoints (Secrets Manager, S3, DynamoDB, etc.).
4. Decidir dónde se valida el JWT (API Gateway vs Lambda) y **no duplicar**.
5. Para SPAs con librerías que asumen Node, prever los shims de Vite (`global`, `Buffer`).
6. CORS: dejar el preflight OPTIONS público desde el diseño del template.
7. Cuenta nueva: revisar límites (concurrencia Lambda) y pedir aumentos si aplica.
8. Siempre desplegar el artefacto empaquetado y verificar el tamaño del código en la Lambda.
