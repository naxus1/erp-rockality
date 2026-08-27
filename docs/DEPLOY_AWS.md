# Despliegue en AWS — ERP Rockality

Checklist paso a paso para llevar el ERP a producción en una **cuenta AWS nueva e
independiente** (aislada de cualquier otra cuenta/proyecto).

> Arquitectura objetivo (ya definida en `PLAN_DE_FASES.md`):
> S3 + CloudFront (frontend) → API Gateway → Lambda (Express) → EFS (SQLite) ·
> Cognito (auth) · Secrets Manager (clave de cifrado) · todo en una VPC privada.

Marca cada casilla al completarla. Las fases 0 son **bloqueantes**: no exponer la
API a internet sin autenticación real.

---

## Estado actual (pre-deploy)

| Área                         | Estado                                                         |
| ---------------------------- | -------------------------------------------------------------- |
| App funcional (CRUD, UI)     | ✅ Completa                                                    |
| Migraciones incrementales    | ✅ Rebuild limpio verificado (001–011)                         |
| Cifrado de PII (columna)     | ✅ email/teléfono AES-256-GCM + `telefono_hash`                |
| Handler Lambda               | ✅ `backend/src/handler.ts` (serverless-express)               |
| CI (lint)                    | ✅ `.github/workflows/ci.yml`                                  |
| **Autenticación real (JWT)** | ❌ **BLOQUEANTE** — hoy el login es mock, el backend no valida |
| IaC (SAM template)           | ❌ Falta `infra/template.yaml`                                 |
| CD (deploy automático)       | ❌ Falta `.github/workflows/cd.yml`                            |
| Secret de cifrado en la nube | ❌ Falta mover `ENCRYPTION_KEY` a Secrets Manager              |
| Tests automatizados          | ⚠️ No hay (no bloquea, pero es riesgo)                         |

---

## FASE 0 — Prerrequisitos (antes de tocar AWS)

### 0.1 Crear la cuenta AWS nueva e independiente

- [ ] Crear un email dedicado para la cuenta (ej. `aws-rockality@tudominio.com` o un alias).
- [ ] Registrar cuenta nueva en https://aws.amazon.com (no usar la de oil & gas).
- [ ] Agregar método de pago. Activar **AWS Free Tier** (aplica 12 meses en cuenta nueva).
- [ ] Región de trabajo: **`us-east-1`** (mejor disponibilidad de servicios y CloudFront/ACM lo requieren para certificados).

### 0.2 Asegurar la cuenta (buenas prácticas mínimas)

- [ ] Activar **MFA en el usuario root**. Guardar las credenciales root y no usarlas para el día a día.
- [ ] Crear un **usuario IAM administrador** (o usar IAM Identity Center) con MFA para la operación normal.
- [ ] Configurar **alerta de facturación** (Budgets) — ej. avisar si el gasto supera USD 10/mes.
- [ ] Habilitar **CloudTrail** (auditoría de acciones en la cuenta).

### 0.3 Herramientas locales

- [ ] Instalar **AWS CLI v2** y configurar un perfil dedicado: `aws configure --profile rockality`.
- [ ] Instalar **AWS SAM CLI** (`brew install aws-sam-cli`).
- [ ] Verificar Docker instalado (SAM lo usa para build de Lambda con dependencias nativas como `better-sqlite3`).
- [ ] `aws sts get-caller-identity --profile rockality` → confirma que apunta a la cuenta correcta.

### 0.4 BLOQUEANTE — Autenticación real (Cognito + JWT)

Hoy cualquiera que llame a la API entra. Antes de exponerla:

- [ ] Crear **Cognito User Pool** (self-signup deshabilitado; solo el admin crea usuarios).
- [ ] Definir grupos: `admin` (CRUD) y `gerente` (lectura).
- [ ] Backend: **middleware que valida el JWT** de Cognito en cada request (verificación offline de la firma con las JWKS del pool). Rechazar requests sin token válido.
- [ ] Backend: derivar `usuario_id`/rol del token (reemplaza el `'sistema'` y el mock en `created_by`/`updated_by`/anulaciones).
- [ ] Frontend: reemplazar el login mock (`AuthContext` con `USERS_DEV`) por login contra Cognito (AWS Amplify Auth o SDK) y enviar el token en el header `Authorization` de `services/api.ts`.
- [ ] Proteger TODAS las rutas de la API con el middleware (health check puede quedar público).

> Este paso conviene hacerlo **antes** de la infraestructura porque define el contrato
> entre frontend y backend. Hacerlo después implica reprocesos.

---

## FASE 1 — Infraestructura como código (SAM)

- [ ] Crear `infra/template.yaml` con:
  - [ ] **VPC** dedicada + 2 subnets privadas (2 AZs), sin Internet/NAT Gateway.
  - [ ] **EFS** con cifrado KMS + Access Point (`/data`, uid/gid 1000, permisos 750).
  - [ ] **Security Groups**: SG-Lambda → SG-EFS (solo puerto NFS 2049).
  - [ ] **Lambda** (Node 20, 256 MB, timeout 30s, `reservedConcurrency: 1`, VPC + EFS montado en `/mnt/data`).
  - [ ] **API Gateway** con Cognito Authorizer, throttling y CORS restringido al dominio del frontend.
  - [ ] **Cognito User Pool** + App Client (o referenciar el creado en 0.4).
  - [ ] **S3** (frontend) con Block Public Access + acceso solo vía CloudFront (OAC).
  - [ ] **CloudFront** (HTTPS only, TLS 1.2+, headers de seguridad).
  - [ ] **Secrets Manager**: secreto `rockality/encryption-key`.
- [ ] Parámetros por ambiente en `infra/parameters/` (`dev.json`, `prod.json`).
- [ ] `sam validate --profile rockality` sin errores.

---

## FASE 2 — Backend en Lambda

- [ ] Config: la Lambda debe usar `DB_PATH=/mnt/data/prod.db` (EFS) vía variable de entorno.
- [ ] Config: leer `ENCRYPTION_KEY` desde **Secrets Manager** al arrancar (no como env en texto plano).
- [ ] Arranque: correr migraciones automáticamente si la DB en EFS no está al día (el runner ya es incremental e idempotente).
- [ ] `sam build` (con Docker, para compilar `better-sqlite3` para el runtime de Lambda).
- [ ] `sam deploy --guided --profile rockality` (primer deploy crea el stack).
- [ ] Verificar en CloudWatch Logs que la Lambda arranca y aplica migraciones.
- [ ] Probar el health check vía la URL de API Gateway.

> **Nota SQLite + Lambda:** SQLite no soporta escrituras concurrentes de múltiples
> instancias. `reservedConcurrency: 1` garantiza una sola instancia a la vez y evita
> corrupción. Suficiente para 2–10 usuarios; si crece mucho, migrar a Postgres (RDS).

---

## FASE 3 — Frontend (S3 + CloudFront)

- [ ] Configurar en el frontend la URL del API Gateway y los datos del User Pool de Cognito (variables de build de Vite, ej. `VITE_API_URL`, `VITE_COGNITO_*`).
- [ ] `npm run build:frontend` → genera `frontend/dist`.
- [ ] Subir `dist/` al bucket S3 (`aws s3 sync`).
- [ ] Invalidar caché de CloudFront tras cada deploy.
- [ ] Verificar que el sitio carga por HTTPS y que el login contra Cognito funciona.

---

## FASE 4 — CI/CD (GitHub Actions)

- [ ] Crear **usuario IAM de deploy** con permisos mínimos (SAM/CloudFormation, Lambda, S3, CloudFront, EFS, Cognito solo lo necesario). No usar admin.
- [ ] Guardar en **GitHub Secrets**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.
- [ ] Crear `.github/workflows/cd.yml`: en merge a `main` → `sam build` + `sam deploy` + sync frontend + invalidación CloudFront.
- [ ] Confirmar `ci.yml` (lint) corre en cada PR. Opcional: agregar tests cuando existan.
- [ ] Branch protection en `main`: requiere PR + status checks.

---

## FASE 5 — Validación en producción

- [ ] Smoke test de cada módulo: Clientes, Productos, Ventas, Compras, Terceros, Planes, Gastos, Catálogos, Dashboard.
- [ ] Verificar login/logout y permisos por rol (admin vs gerente).
- [ ] Confirmar que teléfono/email quedan **cifrados en reposo** (revisar en EFS) y la cédula enmascarada en la UI.
- [ ] Verificar **backups de EFS** (AWS Backup diario) y logs en CloudWatch.
- [ ] Revisar el **Budget/alerta de costos** activo.
- [ ] Prueba de anulación de venta/gasto con motivo (auditoría con usuario real del JWT).

---

## Rollback y operación

- [ ] Rollback de infra: `sam deploy` de la versión anterior o revertir el commit y re-deploy.
- [ ] Rollback de frontend: CloudFront + versionado de S3 (deploy anterior).
- [ ] Rotación de `ENCRYPTION_KEY`: procedimiento de re-cifrado (leer con clave vieja → re-cifrar con nueva). El prefijo `enc:v1:` permite versionar.
- [ ] Restaurar DB desde backup de EFS si hace falta.

---

## Orden recomendado de ejecución

1. **Fase 0** completa (cuenta + seguridad + herramientas + **auth JWT**). ← empezar aquí
2. **Fase 1** (SAM template).
3. **Fase 2** (backend en Lambda) y **Fase 3** (frontend) — pueden solaparse.
4. **Fase 4** (CI/CD) una vez el deploy manual funciona.
5. **Fase 5** (validación) antes de dar por productivo.
