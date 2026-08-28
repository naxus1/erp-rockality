# Runbook — Operación en AWS (ERP Rockality)

Guía operativa del ERP desplegado en AWS. Qué hay, cómo desplegar, cómo crear
usuarios, cómo ver logs y cómo revertir.

## Cuenta y región

- **Cuenta AWS**: `545860874640` (dedicada a Rockality, independiente de oil & gas)
- **Alias**: `rockality`
- **Región**: `us-east-1`
- **Perfil CLI local**: `rockality` (usuario `admin-erp-rockality`)
- **Stack CloudFormation/SAM**: `rockality-prod`

## Recursos desplegados (outputs del stack)

| Qué                        | Valor                                                  |
| -------------------------- | ------------------------------------------------------ |
| Frontend (CloudFront)      | https://d2a6va7cqw90db.cloudfront.net                  |
| API (API Gateway)          | https://gre6acehzf.execute-api.us-east-1.amazonaws.com |
| Cognito User Pool ID       | `us-east-1_EFIr6GzOB`                                  |
| Cognito App Client ID      | `300vt2q0b5odt2q8vv9jldba5l`                           |
| Bucket S3 frontend         | `rockality-prod-frontend-545860874640`                 |
| CloudFront Distribution ID | `E11ILNTFPG49JV`                                       |
| Secret de cifrado          | `rockality/prod/encryption-key` (Secrets Manager)      |

Obtener los outputs actualizados:

```bash
aws cloudformation describe-stacks --stack-name rockality-prod \
  --region us-east-1 --profile rockality \
  --query 'Stacks[0].Outputs' --output table
```

## Arquitectura

```
Navegador
  -> CloudFront (HTTPS, sirve el frontend desde S3 privado vía OAC)
  -> API Gateway (HTTP API, valida el JWT de Cognito; OPTIONS público para CORS)
       -> Lambda (Express, arm64, en VPC privada sin internet)
            -> EFS (SQLite cifrado con KMS, montado en /mnt/data)
            -> Secrets Manager (clave de cifrado, vía VPC endpoint)
Auth: Cognito User Pool (email + password; MFA TOTP opcional, sin SMS)
Costos: Budget USD 10/mes, alertas 70% y 100% a naxus1@gmail.com
```

## Autenticación (Cognito)

- Login con **email + contraseña**. El frontend obtiene el `idToken` y lo manda en
  `Authorization: Bearer`. API Gateway valida el token; la Lambda lee los claims
  (grupo = rol) sin re-validar.
- **MFA**: configurado como opcional con TOTP (app autenticadora). **NO se usa SMS**
  y **no llega ningún correo/SMS de segundo factor**. Para la primera prueba está
  sin activar: se entra solo con usuario y contraseña.
- Roles = grupos de Cognito: `admin` (CRUD) y `gerente` (lectura).

### Crear un usuario

```bash
POOL=us-east-1_EFIr6GzOB
EMAIL=persona@rockality.com
# 1) crear (sin enviar email de invitación)
aws cognito-idp admin-create-user --user-pool-id $POOL --username $EMAIL \
  --user-attributes Name=email,Value=$EMAIL Name=email_verified,Value=true \
  --message-action SUPPRESS --region us-east-1 --profile rockality
# 2) poner contraseña permanente (evita el flujo de cambio obligatorio)
aws cognito-idp admin-set-user-password --user-pool-id $POOL --username $EMAIL \
  --password 'ContraseñaFuerte123!' --permanent --region us-east-1 --profile rockality
# 3) asignar rol (grupo): admin | gerente
aws cognito-idp admin-add-user-to-group --user-pool-id $POOL --username $EMAIL \
  --group-name admin --region us-east-1 --profile rockality
```

### Cambiar la contraseña de un usuario

```bash
aws cognito-idp admin-set-user-password --user-pool-id $POOL --username $EMAIL \
  --password 'NuevaContraseña123!' --permanent --region us-east-1 --profile rockality
```

## Desplegar cambios

> Requisitos: Docker corriendo (para compilar `better-sqlite3` para Linux arm64),
> AWS CLI y SAM CLI instalados, perfil `rockality` configurado.
> Importante: en Docker Desktop, **desactivar "Resource Saver"** (pausa el daemon).

### Backend / infraestructura

```bash
# 1) compilar el backend a JS (copia también los .sql de migraciones a dist)
npm run build:backend
# 2) empaquetar para Lambda (en contenedor: binario nativo correcto)
sam build -t infra/template.yaml --use-container
# 3) desplegar usando el template empaquetado
sam deploy -t .aws-sam/build/template.yaml --stack-name rockality-prod \
  --region us-east-1 --profile rockality \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --resolve-s3 \
  --no-confirm-changeset --no-fail-on-empty-changeset \
  --parameter-overrides "Stage=prod" "BudgetEmail=naxus1@gmail.com" \
    "AllowedOrigins=https://d2a6va7cqw90db.cloudfront.net"
```

> Nota: si `sam build --use-container` falla con "requires a container runtime",
> Docker se pausó; reinícialo y reintenta.

### Frontend

```bash
# 1) build de producción (usa frontend/.env.production con IDs de Cognito y API URL)
npm run build:frontend
# 2) subir a S3
aws s3 sync frontend/dist s3://rockality-prod-frontend-545860874640 --delete \
  --region us-east-1 --profile rockality
# 3) invalidar caché de CloudFront
aws cloudfront create-invalidation --distribution-id E11ILNTFPG49JV \
  --paths "/*" --profile rockality
```

## CI/CD automático (deploy sin intervención)

A partir de ahora, **cada merge a `main` despliega solo** vía GitHub Actions. Ya no
hace falta correr `sam deploy` ni subir el frontend a mano.

- **Workflow**: `.github/workflows/cd.yml` (se dispara en push a `main`; también
  manual desde la pestaña Actions con "Run workflow").
- **Autenticación**: **OIDC** (sin llaves permanentes). GitHub asume el rol IAM
  `rockality-github-deploy-oidc` (stack `rockality-cicd`). El workflow declara
  `permissions: id-token: write` y usa `role-to-assume` con el ARN del rol.
  - Ya **no** hay usuario IAM ni access keys: el usuario de respaldo
    (`rockality-github-deploy`) y los secrets `AWS_ACCESS_KEY_ID` /
    `AWS_SECRET_ACCESS_KEY` fueron eliminados tras validar OIDC.
  - No hay que rotar nada (los tokens son efímeros, por ejecución).
  - Detalle clave del trust policy: el `sub` debe usar el **formato inmutable** de
    GitHub para repos creados tras 2026-07-15
    (`repo:naxus1@16293755/erp-rockality@1330171970:ref:refs/heads/main`). Ver
    LECCIONES_DEPLOY.md #12.
- **Qué hace el pipeline**: build backend -> `sam build --use-container` ->
  `sam deploy` -> build frontend -> `s3 sync` -> invalidación CloudFront ->
  health check (con reintentos).

Recrear/actualizar el stack de CI/CD (OIDC provider + rol de deploy):

```bash
aws cloudformation deploy --template-file infra/cicd.yaml \
  --stack-name rockality-cicd --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1 --profile rockality
# El ARN del rol queda en los outputs del stack:
aws cloudformation describe-stacks --stack-name rockality-cicd \
  --region us-east-1 --profile rockality \
  --query "Stacks[0].Outputs[?OutputKey=='DeployRoleArn'].OutputValue" --output text
```

> Para replicar este CI/CD en otro proyecto (p. ej. oil & gas): copia `infra/cicd.yaml`
> (ajustando `GitHubOrg`, `GitHubRepo`, `GitHubOwnerId`, `GitHubRepoId`) y
> `.github/workflows/cd.yml` (ajustando los `env` y el ARN del rol). Obtén los IDs con
> `gh api repos/<org>/<repo> --jq '{owner_id: .owner.id, repo_id: .id}'`.

## Ver logs de la Lambda

```bash
aws logs filter-log-events --log-group-name /aws/lambda/rockality-prod-api \
  --start-time $(( ($(date +%s) - 300) * 1000 )) \
  --region us-east-1 --profile rockality --query 'events[].message' --output text
```

Health check público (no requiere token):

```bash
curl https://gre6acehzf.execute-api.us-east-1.amazonaws.com/api/health
```

## Rollback

- **Infra/backend**: revertir el commit en `main` y volver a `sam build` + `sam deploy`,
  o `aws cloudformation deploy` de una versión anterior. Si un deploy queda en
  `ROLLBACK_COMPLETE` (fallo en create inicial), borrar el stack y recrear:
  `aws cloudformation delete-stack --stack-name rockality-prod ...`
- **Frontend**: volver a subir el build anterior a S3 (el bucket tiene versionado)
  e invalidar CloudFront.

## Migración de datos reales (fase posterior)

Plan para cuando existan los datos totales del gimnasio (Excel/CSV/otra base):

1. **Recibir** los datos en un formato tabular (CSV por entidad: clientes,
   productos, terceros, planes, ventas, gastos).
2. **Mapear** columnas a las tablas del ERP y respetar el orden por llaves foráneas:
   catálogos -> terceros -> clientes -> productos -> planes -> ventas/gastos.
3. **Cifrar PII** al insertar: `email` y `telefono` de clientes se cifran con la
   utilidad `backend/src/utils/crypto.ts` (misma clave del entorno), y `telefono_hash`
   con HMAC. NO insertar PII en texto plano.
4. **Validar** con las mismas reglas Zod (o un script de import que reuse los repos).
5. **Cargar** contra la base de EFS (vía un endpoint de import protegido, o un job
   puntual). Hacer respaldo del `.db` en EFS antes de la carga.
6. **Verificar** conteos y muestras después de importar.

> La base de producción hoy está **vacía a propósito** (sin datos de prueba). La
> primera fase es probar el flujo con los 4 usuarios; luego se corrigen bugs; luego
> se migran los datos reales.
