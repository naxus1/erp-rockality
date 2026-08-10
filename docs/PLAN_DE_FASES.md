# ERP Rockality — Plan de Fases Validado

## Resumen Ejecutivo

| Aspecto | Detalle |
|---|---|
| Proyecto | ERP básico para gimnasio |
| Volumen | ~3000 registros históricos, ~50 registros/mes |
| Usuarios | 2 actuales (Admin operativo + Gerente), máximo 10 a futuro |
| Presupuesto AWS | Máximo $15 USD/mes (estimado real: $1-3/mes) |
| Stack | React + Node.js/TypeScript + SQLite + AWS Serverless |
| Región | us-east-1 (N. Virginia) |
| Repositorio | GitHub |
| Dominio | CloudFront genérico (sin dominio propio por ahora) |

### Productos y servicios

| Categoría | Productos | Modalidad |
|---|---|---|
| Planes de entrenamiento | 3 planes con diferentes duraciones | Presencial + Virtual |
| Accesorios | Guantes, vendas | Venta directa |
| Suplementos | Creatina, suplementos deportivos | Venta directa |

---

## Decisiones Tecnológicas — Justificación y Límites

### 1. GitHub (Repositorio y CI/CD)

| Aspecto | Detalle |
|---|---|
| **¿Por qué GitHub?** | Integración nativa con GitHub Actions (CI/CD sin herramientas adicionales), ecosistema más grande de la industria, GitHub Copilot compatible, free tier generoso para repos privados |
| **Alternativas descartadas** | GitLab (más complejo de administrar para 1-2 devs), BitBucket (menor ecosistema de Actions), CodeCommit (deprecated por AWS) |
| **Máximo que soporta** | Repos privados ilimitados (plan free), 2000 minutos/mes de GitHub Actions (free tier), artifacts de 500MB, archivos individuales de hasta 100MB |
| **Cuándo migrar** | Si el equipo crece a +20 devs y necesita GitLab CI/CD avanzado o self-hosted runners |

---

### 2. AWS Lambda + API Gateway (Backend Compute)

| Aspecto | Detalle |
|---|---|
| **¿Por qué Lambda?** | Pago por uso real (con ~15,000 requests/mes sigue en free tier), cero administración de servidores, escala automática, integración nativa con todo el stack AWS |
| **Alternativas descartadas** | EC2 (mínimo ~$4/mes y hay que mantener el servidor), ECS Fargate (~$10/mes mínimo), Lightsail ($3.50/mes pero requiere mantenimiento) |
| **Máximo que soporta** | 1000 invocaciones concurrentes (default), 15 min timeout, 10GB memoria, 1M requests/mes en free tier (primer año), luego $0.20 por 1M requests |
| **Estimación de uso real** | Admin (7h/día, 26 días): ~11,700 req/mes + Gerente (4 sesiones/semana): ~750 req/mes = **~12,000-15,000 req/mes** (1.5% del free tier). Con 10 usuarios: ~75,000/mes (7.5% del free tier, aún $0) |
| **Cuándo migrar** | Si las invocaciones superan 500K/mes consistentemente o el cold start se vuelve inaceptable (improbable con 10 usuarios) |

---

### 3. SQLite en EFS (Base de Datos)

| Aspecto | Detalle |
|---|---|
| **¿Por qué SQLite?** | Cero costo de servicio de base de datos ($12/mes de RDS ahorrado), rendimiento excelente para lecturas, esquema relacional completo, cero administración, backup simple (un solo archivo) |
| **¿Por qué EFS?** | Persistencia entre invocaciones Lambda, montaje como filesystem nativo, cifrado incluido, compatible con SQLite WAL mode |
| **Alternativas descartadas** | RDS PostgreSQL ($12-15/mes, oversized), DynamoDB (NoSQL complica reportes y queries complejas), Aurora Serverless (mínimo ~$2/mes pero overkill) |
| **Máximo que soporta** | SQLite maneja hasta ~1TB de datos y millones de registros sin problema. Con WAL mode, soporta lecturas concurrentes ilimitadas + 1 escritor a la vez. Con 10 usuarios y ~600 registros/año, no llegarás al límite en décadas |
| **Limitación real** | Una sola escritura a la vez (no es problema con 10 usuarios escribiendo esporádicamente). Si llegas a +50 escrituras/segundo consistentes, migrar a RDS |
| **Cuándo migrar** | Si necesitas escrituras concurrentes pesadas (+50/seg) o replicación multi-región |

---

### 4. S3 + CloudFront (Frontend Hosting)

| Aspecto | Detalle |
|---|---|
| **¿Por qué S3 + CloudFront?** | Hosting estático virtualmente gratis, CDN global (carga rápida desde cualquier lugar), HTTPS automático, cero mantenimiento |
| **¿Por qué dominio genérico por ahora?** | Ahorra ~$12/año del dominio + certificado. El URL de CloudFront (d1234.cloudfront.net) funciona perfecto para 2-10 usuarios internos. Se puede agregar dominio después sin downtime |
| **Alternativas descartadas** | Amplify Hosting (abstracción innecesaria, menos control), Vercel/Netlify (dependencia de tercero fuera de AWS, posibles costos ocultos) |
| **Máximo que soporta** | S3: 5TB por objeto, almacenamiento ilimitado. CloudFront: 250K requests/segundo, 40Gbps. Para un SPA de ~5MB con 10 usuarios, jamás tocas estos límites |
| **Cuándo agregar dominio** | Cuando quieras una URL amigable para el equipo o clientes externos |

---

### 5. AWS Cognito (Autenticación)

| Aspecto | Detalle |
|---|---|
| **¿Por qué Cognito?** | Servicio managed de auth, MFA incluido, JWT estándar, free tier de 50K MAUs (usuarios activos mensuales), cero código de auth que mantener |
| **Alternativas descartadas** | Auth0 (free tier limitado a 7K MAUs, posible costo futuro), Firebase Auth (fuera del ecosistema AWS, agrega complejidad), auth custom (riesgo de seguridad, más código que mantener) |
| **Máximo que soporta** | 50,000 MAUs gratis, luego $0.0055/MAU. Con 10 usuarios máximo, jamás pagas un centavo |
| **Cuándo migrar** | Si necesitas SSO empresarial, SAML, o integraciones complejas que Cognito no soporte bien (raro para este caso) |

---

### 6. React + Vite + TypeScript (Frontend Framework)

| Aspecto | Detalle |
|---|---|
| **¿Por qué React?** | Ecosistema más grande, mayor disponibilidad de componentes y bibliotecas, facilidad para encontrar desarrolladores si el equipo crece |
| **¿Por qué Vite?** | Build ultrarrápido (10x más rápido que Webpack), HMR instantáneo en desarrollo, configuración mínima, estándar actual de la industria |
| **¿Por qué TypeScript?** | Previene bugs en tiempo de desarrollo, mejor autocompletado, documentación implícita del código, facilita mantenimiento a largo plazo |
| **Alternativas descartadas** | Next.js (necesita servidor, overkill para SPA interna), Vue (menor ecosistema), Angular (curva de aprendizaje alta, verboso para MVP) |
| **Máximo que soporta** | Sin límite técnico real. React maneja aplicaciones con miles de componentes y millones de usuarios |

---

### 7. Node.js + Express (Backend Framework)

| Aspecto | Detalle |
|---|---|
| **¿Por qué Node.js?** | Mismo lenguaje que el frontend (TypeScript full-stack), excelente rendimiento en I/O, ecosystem maduro, cold start rápido en Lambda |
| **¿Por qué Express?** | Framework HTTP minimalista, extensible con middleware, patrón conocido, funciona perfecto en Lambda con `serverless-express` |
| **Alternativas descartadas** | Fastify (más rápido pero menos ecosistema de middleware), NestJS (overkill para un MVP, mucha abstracción), Python/Flask (segundo lenguaje innecesario) |
| **Máximo que soporta** | Node.js en Lambda maneja miles de requests concurrentes. Express no tiene límite de rutas o middlewares práctico |

---

### 8. us-east-1 (Región AWS)

| Aspecto | Detalle |
|---|---|
| **¿Por qué us-east-1?** | Precios más bajos de todas las regiones, mayor disponibilidad de servicios, primera región en recibir features nuevos, CloudFront distribuye globalmente de cualquier forma |
| **Alternativas consideradas** | sa-east-1 São Paulo (más cercana geográficamente a Colombia, pero ~20-30% más cara), us-west-2 (similar precio pero sin ventaja) |
| **Latencia** | ~80-120ms desde Colombia a us-east-1. Con CloudFront como CDN, el frontend carga desde edge location en Bogotá. Las llamadas API tendrán ~100ms de latencia — imperceptible para un ERP interno |
| **Cuándo cambiar** | Si se necesita cumplimiento de datos en Colombia (regulación) o la latencia API se vuelve crítica (improbable) |

---

### 9. AWS SAM (Infraestructura como Código)

| Aspecto | Detalle |
|---|---|
| **¿Por qué SAM?** | Extensión de CloudFormation optimizada para serverless, sintaxis simplificada para Lambda + API Gateway, CLI integrado para local testing, deploy en un comando |
| **Alternativas descartadas** | CDK (más poderoso pero más complejo para un proyecto pequeño), Terraform (multi-cloud innecesario, otra herramienta que aprender), Serverless Framework (vendor lock-in al framework, no a AWS) |
| **Máximo que soporta** | 500 recursos por stack CloudFormation. Este proyecto usará ~15-20 recursos — margen enorme |
| **Cuándo migrar** | Si la infra crece a +200 recursos o necesitas multi-cloud, considerar CDK o Terraform |

---

### Resumen de límites de escalabilidad

| Componente | Uso actual | Máximo soportado | Factor de holgura |
|---|---|---|---|
| Lambda invocaciones | ~12,000-15,000/mes | 1,000,000/mes (free) | 66x |
| Cognito usuarios | 2 | 50,000 (free) | 25,000x |
| SQLite registros | 3,000 | ~10,000,000 | 3,333x |
| S3 almacenamiento | ~5MB | Ilimitado | ∞ |
| CloudFront requests | ~500/mes | 10,000,000/mes | 20,000x |
| EFS almacenamiento | ~1MB | Petabytes | >1,000,000x |
| API Gateway | ~50/mes | 10,000/segundo | Absurdo |

> **Conclusión:** Con esta arquitectura, podrías manejar 10,000 clientes, 100 usuarios concurrentes, y millones de registros SIN cambiar nada. El sistema está diseñado para que lo único que cambie sea la factura de AWS (y aun así, llegarías a los $15/mes recién con miles de transacciones diarias).

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                      INTERNET                           │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────┐     ┌─────────────────────────┐
│  CloudFront (CDN)   │     │    API Gateway (REST)   │
│  + WAF (opcional)   │     │    + Throttling         │
│  HTTPS only         │     │    + CORS restrictivo   │
└─────────┬───────────┘     └────────────┬────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────┐     ┌─────────────────────────┐
│  S3 Bucket          │     │  Lambda Function        │
│  (Frontend SPA)     │     │  (Backend API)          │
│  Block Public Access│     │  VPC attached           │
└─────────────────────┘     └────────────┬────────────┘
                                         │
                                         ▼
                            ┌─────────────────────────┐
                            │  EFS (Elastic File Sys) │
                            │  SQLite Database        │
                            │  Encrypted at rest      │
                            └─────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    AWS Cognito                           │
│  User Pool (2-10 usuarios, MFA habilitado)              │
│  Roles: admin (CRUD), gerente (solo lectura)            │
└─────────────────────────────────────────────────────────┘
```

---

## Validación de Seguridad por Componente

### S3 (Frontend)

| Control | Configuración |
|---|---|
| Acceso público | **BLOQUEADO** — Block All Public Access habilitado |
| Distribución | Solo accesible vía CloudFront (OAC - Origin Access Control) |
| Bucket Policy | Deny all excepto CloudFront distribution |
| Versionado | Habilitado (rollback de deploys) |
| Cifrado | SSE-S3 (encryption at rest por defecto) |

**Política IAM del bucket:**
```json
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::erp-rockality-frontend/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DIST_ID"
      }
    }
  }]
}
```

---

### CloudFront (CDN)

| Control | Configuración |
|---|---|
| Protocolo | HTTPS only (redirect HTTP → HTTPS) |
| TLS | TLSv1.2 mínimo |
| Headers de seguridad | Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options |
| Geo-restricción | Opcional: restringir a Colombia si aplica |
| Origin Access | OAC (no OAI legacy) |

---

### API Gateway

| Control | Configuración |
|---|---|
| Autorización | Cognito Authorizer en todas las rutas |
| Throttling | 100 requests/segundo (burst: 50) — más que suficiente para 2 usuarios |
| CORS | Origin restringido al dominio del frontend |
| Validación | Request validation habilitada en el gateway |
| Logging | CloudWatch access logs habilitados |
| Stage | `prod` con variables de entorno |

**Política de recursos:**
```json
{
  "Effect": "Allow",
  "Principal": "*",
  "Action": "execute-api:Invoke",
  "Resource": "arn:aws:execute-api:REGION:ACCOUNT_ID:API_ID/prod/*",
  "Condition": {
    "StringEquals": {
      "aws:RequestedRegion": "us-east-1"
    }
  }
}
```

---

### Lambda (Backend)

| Control | Configuración |
|---|---|
| Runtime | Node.js 20.x (LTS) |
| Timeout | 30 segundos (más que suficiente para queries SQLite) |
| Memoria | 256 MB |
| VPC | Attached a VPC privada (acceso a EFS) |
| Variables de entorno | Cifradas con KMS default |
| Concurrencia | Reserved: 5 (previene billing explosivo) |
| Layers | Dependencias en layer separado (mejor cold start) |

**IAM Role de la Lambda (principio de mínimo privilegio):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EFSAccess",
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite"
      ],
      "Resource": "arn:aws:elasticfilesystem:REGION:ACCOUNT_ID:file-system/fs-XXXXX"
    },
    {
      "Sid": "VPCNetworkInterface",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:REGION:ACCOUNT_ID:*"
    }
  ]
}
```

**Lo que NO tiene permiso:**
- ❌ Acceso a otros servicios AWS
- ❌ Lectura de secrets de otras aplicaciones
- ❌ Acceso a S3 (no lo necesita)
- ❌ Acceso a IAM o STS
- ❌ Ejecución de otras Lambdas

---

### EFS (Base de datos SQLite)

| Control | Configuración |
|---|---|
| Cifrado | At rest con KMS (aws/elasticfilesystem) |
| Cifrado en tránsito | TLS habilitado |
| Access Points | Un solo access point con UID/GID específico |
| Security Group | Solo permite tráfico NFS (puerto 2049) desde SG de Lambda |
| Backup | AWS Backup automático diario, retención 7 días |
| Throughput | Bursting (suficiente para este volumen) |

**Security Group EFS:**
```
Inbound:  TCP 2049 desde sg-lambda-XXXXX
Outbound: Ninguno necesario
```

**Access Point:**
```
Path:     /data
UID:      1000
GID:      1000
Permisos: 750 (owner: rwx, group: r-x, others: ---)
```

---

### Cognito (Autenticación)

| Control | Configuración |
|---|---|
| MFA | Habilitado (TOTP — Google Authenticator) |
| Password policy | Mínimo 12 caracteres, mayúsculas, números, símbolos |
| Bloqueo | Bloqueo temporal tras 5 intentos fallidos |
| Tokens | Access token expira en 1 hora, Refresh token en 30 días |
| Grupos | `admin` (operaciones CRUD), `gerente` (solo lectura) |
| Capacidad | Diseñado para 2-10 usuarios (50K MAUs free tier) |
| Self-signup | **DESHABILITADO** — solo el admin crea usuarios |
| Recovery | Solo por email verificado |

**Permisos por rol:**

| Recurso | Admin | Gerente |
|---|---|---|
| Ventas | CRUD | Read |
| Productos | CRUD | Read |
| Gastos | CRUD | Read |
| Clientes | CRUD | Read |
| Reportes | Read | Read |
| Dashboard | Read | Read |
| Usuarios | — | — |

---

### VPC y Networking

| Control | Configuración |
|---|---|
| VPC | Dedicada para el proyecto |
| Subnets | 2 privadas (para Lambda + EFS), en 2 AZs |
| Internet Gateway | NO — Lambda no necesita salir a internet |
| NAT Gateway | NO — ahorro de costos, no se necesita |
| Security Groups | SG-Lambda → SG-EFS (solo puerto 2049) |
| NACLs | Default (permisivo dentro de VPC) |
| Flow Logs | Habilitados para auditoría |

> **Nota:** Al estar Lambda en VPC sin internet, Cognito se valida via JWT offline (la Lambda verifica el token localmente sin llamar a Cognito).

---

## FASE 1 — DevOps / Infraestructura

### 1.1 Estructura del Monorepo

```
erp-rockality/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + Test en cada PR
│       └── cd.yml              # Deploy a AWS en merge a main
├── frontend/                   # React + Vite + TypeScript
├── backend/                    # Node.js + Express + TypeScript
├── infra/                      # AWS SAM template
│   ├── template.yaml
│   └── parameters/
│       ├── dev.json
│       └── prod.json
├── docs/                       # Documentación del proyecto
├── .gitignore
├── .eslintrc.json
├── .prettierrc
└── package.json                # Scripts raíz del monorepo
```

**Validación de seguridad:**
- `.env` y archivos de credenciales en `.gitignore`
- No se comiten secrets — se usan GitHub Secrets + AWS Parameter Store
- Branch protection en `main`: requiere PR + approval

---

### 1.2 Repositorio Git

| Decisión | Valor |
|---|---|
| Proveedor | GitHub |
| Branch strategy | `main` (producción) + `develop` (desarrollo) |
| Commits | Conventional Commits (`feat:`, `fix:`, `chore:`) |
| Branch protection | Requiere 1 approval, status checks pass |
| Secrets | GitHub Secrets para AWS credentials del CI/CD |

**GitHub Secrets necesarios:**
```
AWS_ACCESS_KEY_ID          # IAM user de deploy (solo permisos de deploy)
AWS_SECRET_ACCESS_KEY
AWS_REGION
```

**IAM User para CI/CD (mínimo privilegio):**
```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::erp-rockality-frontend",
        "arn:aws:s3:::erp-rockality-frontend/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration"
      ],
      "Resource": "arn:aws:lambda:REGION:ACCOUNT_ID:function:erp-rockality-*"
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DIST_ID"
    },
    {
      "Effect": "Allow",
      "Action": "cloudformation:*",
      "Resource": "arn:aws:cloudformation:REGION:ACCOUNT_ID:stack/erp-rockality-*/*"
    }
  ]
}
```

---

### 1.3 Linters y Formatters

| Herramienta | Ámbito | Propósito |
|---|---|---|
| ESLint | Front + Back | Calidad de código, detección de errores |
| Prettier | Front + Back | Formato consistente |
| TypeScript strict | Front + Back | Type safety |
| Husky + lint-staged | Pre-commit | Lint automático antes de cada commit |

---

### 1.4 Pipeline CI (GitHub Actions)

```yaml
# Triggers: PR a main y develop
jobs:
  lint:     # ESLint + Prettier check
  test:     # Unit tests
  build:    # Compilar TypeScript, build frontend
  security: # npm audit (vulnerabilidades en dependencias)
```

**Validación de seguridad en CI:**
- `npm audit` para detectar dependencias vulnerables
- No se exponen secrets en logs
- Runners de GitHub (no self-hosted) para evitar surface attack

---

### 1.5 Pipeline CD

```yaml
# Trigger: merge a main
jobs:
  deploy-backend:
    - sam build
    - sam deploy --no-confirm-changeset
  deploy-frontend:
    - npm run build
    - aws s3 sync dist/ s3://bucket
    - aws cloudfront create-invalidation
```

---

### 1.6 Infraestructura como Código (SAM)

**Recursos definidos en `template.yaml`:**

| Recurso | Tipo SAM/CloudFormation |
|---|---|
| Lambda | AWS::Serverless::Function |
| API Gateway | AWS::Serverless::Api |
| S3 Frontend | AWS::S3::Bucket |
| CloudFront | AWS::CloudFront::Distribution |
| EFS | AWS::EFS::FileSystem |
| EFS Access Point | AWS::EFS::AccessPoint |
| VPC + Subnets | AWS::EC2::VPC, AWS::EC2::Subnet |
| Security Groups | AWS::EC2::SecurityGroup |
| Cognito User Pool | AWS::Cognito::UserPool |
| Cognito Groups | AWS::Cognito::UserPoolGroup |
| Backup Plan | AWS::Backup::BackupPlan |

---

### 1.7 Ambientes

| Ambiente | Uso | Base de datos |
|---|---|---|
| Local (dev) | Desarrollo | SQLite local en `./data/dev.db` |
| Prod (AWS) | Producción | SQLite en EFS |

**Variables de entorno:**
```
NODE_ENV=production|development
DB_PATH=/mnt/data/erp.db  (prod) | ./data/dev.db (local)
COGNITO_USER_POOL_ID=xxx
COGNITO_CLIENT_ID=xxx
ALLOWED_ORIGINS=https://erp.rockality.com
```

---

## FASE 2 — Backend

### 2.1 Setup del proyecto

- Node.js 20.x + TypeScript strict mode
- Express.js como framework HTTP
- better-sqlite3 como driver SQLite (síncrono, óptimo para Lambda)
- Estructura modular: routes → controllers → services → repositories

### 2.2 Base de datos + Migraciones

**Sistema de migraciones versionado:**
```
backend/src/db/migrations/
├── 001_initial_schema.sql
├── 002_seed_categories.sql
└── ...
```

**Validación de seguridad en DB:**
- Queries parametrizadas (prevenir SQL injection)
- Validación de input con Zod (schemas estrictos)
- No se almacenan passwords (auth es Cognito)
- Campos sensibles (email, teléfono) tratados como PII

### 2.3 Auth Middleware

```typescript
// Flujo de autenticación:
// 1. Frontend envía JWT en header Authorization: Bearer <token>
// 2. Middleware valida JWT offline (verifica firma con JWKS de Cognito)
// 3. Extrae grupo del token (admin/gerente)
// 4. Autoriza o rechaza según ruta + método HTTP
```

**Matriz de autorización en el backend:**
```typescript
// POST/PUT/DELETE en /ventas, /productos, /gastos, /clientes → solo admin
// GET en cualquier ruta → admin + gerente
// GET en /reportes, /dashboard → admin + gerente
```

### 2.4 - 2.8 Módulos CRUD

Cada módulo sigue el patrón:
1. **Validación de input** (Zod schema)
2. **Autorización** (middleware de rol)
3. **Lógica de negocio** (service layer)
4. **Persistencia** (repository con queries parametrizadas)
5. **Response estandarizado** (formato consistente + HTTP status codes correctos)

### 2.9 Manejo de errores

- Error handler centralizado
- No se exponen stack traces en producción
- Logs estructurados (JSON) para CloudWatch
- Errores de validación retornan 400 con detalle
- Errores de auth retornan 401/403 sin detalles internos

### 2.10 Tests

- Tests unitarios para lógica de negocio
- Tests de integración para rutas de API
- Coverage mínimo: 80% en servicios y repositorios

---

## FASE 3 — Frontend

### 3.1 Setup React + Vite

- React 18 + TypeScript strict
- React Router para navegación
- TanStack Query para state management de server
- Tailwind CSS para estilos (rápido de desarrollar)

### 3.2 Seguridad en Frontend

| Control | Implementación |
|---|---|
| XSS | React escapa por defecto, no usar `dangerouslySetInnerHTML` |
| CSRF | No aplica (API stateless con JWT) |
| Auth tokens | Almacenados en memoria (no localStorage) |
| Refresh | Cognito SDK maneja refresh transparente |
| Rutas protegidas | HOC que verifica token válido + rol |
| Timeout sesión | Logout automático tras 30 min inactividad |

### 3.3 - 3.9 Módulos UI

- Formularios con validación client-side (complementaria, no sustituta del backend)
- Feedback visual claro (loading, error, success)
- Responsive (funciona en tablet para uso en el gym)
- Accesibilidad básica (labels, aria, keyboard navigation)

---

## FASE 4 — Integración y Deploy

### 4.1 Checklist pre-deploy

- [ ] Todas las variables de entorno configuradas en AWS
- [ ] CORS configurado correctamente
- [ ] MFA habilitado en Cognito para ambos usuarios
- [ ] Backup de EFS configurado
- [ ] CloudWatch alarms para errores Lambda
- [ ] Budget alarm en AWS ($15 USD)

### 4.2 Budget Alert

```
AWS Budgets:
- Threshold: $10 (alerta temprana)
- Threshold: $15 (límite)
- Notificación: email al gerente
```

### 4.3 Monitoreo

| Qué | Cómo |
|---|---|
| Errores Lambda | CloudWatch Logs + Metric filter para ERROR |
| Latencia API | API Gateway métricas default |
| Costos | AWS Budgets con alerta |
| Disponibilidad | CloudWatch Synthetics (opcional, tiene costo) |

### 4.4 Plan de Backup y Recuperación

| Componente | Backup | RPO | RTO |
|---|---|---|---|
| SQLite (EFS) | AWS Backup diario | 24h | 1h |
| Frontend (S3) | Versionado de bucket | Inmediato | 5 min (rollback) |
| Backend (código) | Git + Lambda versions | Inmediato | 5 min (rollback) |
| Cognito | No requiere (managed) | — | — |

---

## Estimación de Costos Detallada

| Servicio | Uso estimado | Costo/mes |
|---|---|---|
| Lambda | ~12,000-15,000 invocaciones/mes, 256MB, 30s max | $0.00 (free tier 1M) |
| API Gateway | ~12,000-15,000 requests/mes | $0.00 (free tier 1M) |
| S3 | ~50MB frontend estático | $0.01 |
| CloudFront | ~1GB transferencia | $0.09 |
| EFS | ~100MB almacenamiento | $0.03 |
| Cognito | 2-10 usuarios | $0.00 (free tier 50K MAU) |
| CloudWatch | Logs básicos | $0.00 (free tier 5GB) |
| AWS Backup | ~100MB diarios | $0.05 |
| VPC | Sin NAT, sin EIP | $0.00 |
| **TOTAL** | | **~$0.18/mes** |

> **Nota:** El costo real será menor a $1/mes. El presupuesto de $15 da margen enorme para crecimiento futuro.

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Cold start Lambda en VPC | Media | Bajo (2-3s primera carga) | Provisioned concurrency si molesta ($$$) o usar SnapStart |
| SQLite concurrencia | Baja (2 usuarios) | Bajo | WAL mode habilitado, reintentos automáticos |
| Pérdida de datos EFS | Muy baja | Alto | Backup diario + versionado |
| Token JWT expirado | Normal | Bajo | Refresh automático con Cognito SDK |
| Exceder presupuesto | Muy baja | Bajo | Budget alarm + throttling en API Gateway |
| Dependencia vulnerable | Media | Medio | npm audit en CI + Dependabot |
| Free tier API Gateway expira (12 meses) | Segura | Bajo | Post free-tier: ~$0.05/mes con 15K req. Presupuesto lo absorbe |
| Lambda necesita internet a futuro | Media | Medio | Agregar NAT Gateway (~$32/mes) o migrar a Lambda sin VPC + DynamoDB. Alternativa: usar VPC Endpoints para servicios específicos (SES, S3) a $0.01/hora (~$7/mes) |
| Pérdida de auditoría de negocio | Media | Alto | Tabla de audit_log en SQLite (ver sección Auditoría) |

---

## Auditoría de Negocio (Audit Trail)

Además de los logs técnicos (CloudWatch), el sistema debe registrar **quién hizo qué y cuándo** a nivel de negocio:

```sql
AUDIT_LOG
├── id
├── usuario_id (FK → quien realizó la acción)
├── accion (crear | editar | eliminar | anular)
├── entidad (venta | producto | gasto | cliente | suscripcion)
├── entidad_id
├── datos_anteriores (JSON — snapshot antes del cambio)
├── datos_nuevos (JSON — snapshot después del cambio)
├── ip_origen
├── fecha_hora
└── notas
```

**Casos de uso:**
- Quién anuló una venta y por qué
- Quién cambió el precio de un producto
- Historial de cambios en datos de un cliente
- Trazabilidad completa para el gerente

**Política de retención:** Los registros de auditoría NO se eliminan. Se mantienen indefinidamente (el volumen es mínimo con ~50 operaciones/día).

---

## Moneda, Impuestos y Formato Regional

| Aspecto | Configuración |
|---|---|
| Moneda | COP (Peso Colombiano) |
| Formato numérico | Separador de miles: punto (1.000.000), decimal: coma (1.500,50) |
| IVA | 19% estándar en Colombia |
| IVA en suplementos | 19% (suplementos deportivos están gravados) |
| IVA en servicios (planes) | Depende del régimen del gimnasio — consultar contador |
| Zona horaria | America/Bogota (UTC-5) |
| Formato de fecha | DD/MM/YYYY (estándar Colombia) |

**Implementación:**
- Todos los montos se almacenan en centavos (integer) para evitar errores de punto flotante
- El IVA se calcula y almacena por separado en cada venta
- El frontend formatea según locale `es-CO`

```sql
-- Campos adicionales en VENTAS
VENTAS
├── ...
├── subtotal (monto sin IVA, en centavos)
├── iva (monto de IVA, en centavos)
├── total (subtotal + iva, en centavos)
└── ...

-- Campos adicionales en PRODUCTOS
PRODUCTOS
├── ...
├── aplica_iva (boolean)
├── porcentaje_iva (19 por defecto)
└── ...
```

---

## Migración de Datos Históricos

**Fuente:** Archivo Excel con ~3000 registros de ventas (5 años de operación)

**Plan de migración (Fase 4.5):**

1. **Recibir** archivo Excel original (sin modificar)
2. **Analizar** estructura: identificar columnas, formatos de fecha, inconsistencias
3. **Exportar** a CSV estandarizado (UTF-8, separador coma)
4. **Limpiar** datos:
   - Normalizar nombres de productos (ej: "creatina", "Creatina", "CREATINA" → "Creatina")
   - Normalizar nombres de clientes (eliminar duplicados por variación de nombre)
   - Estandarizar fechas a formato ISO (YYYY-MM-DD)
   - Validar que montos sean numéricos y coherentes
   - Identificar registros incompletos o inconsistentes
5. **Mapear** columnas del Excel → esquema nuevo del ERP
6. **Script de importación** (Node.js) que:
   - Lee el CSV limpio
   - Valida cada registro con Zod (mismos schemas del backend)
   - Crea clientes únicos a partir de los datos de ventas
   - Crea productos si no existen
   - Inserta ventas con su detalle
   - Genera reporte de registros rechazados (para revisión manual)
7. **Verificar** integridad:
   - Suma total de ventas importadas = suma total del Excel
   - Conteo de registros importados vs originales
   - Spot-check de 10 registros aleatorios
8. **Backup** pre-migración del SQLite vacío (por si toca repetir)

**Consideraciones:**
- La migración se ejecuta UNA vez antes del go-live
- Los registros históricos se importan con `tipo = 'historico'` para diferenciarlos
- No se intenta reconstruir inventario histórico (solo ventas)
- Si faltan datos de cliente en el Excel, se asignan a un cliente genérico "Cliente sin registrar"

> **Acción requerida:** Compartir el archivo Excel para analizar las columnas y definir el mapeo exacto.

---

## Cumplimiento Legal — Ley 1581 de 2012 (Habeas Data Colombia)

Al almacenar datos personales de clientes (nombre, teléfono, email), el gimnasio tiene obligaciones:

| Obligación | Implementación en el ERP |
|---|---|
| Consentimiento | Checkbox en registro de cliente: "Autorizo el tratamiento de mis datos" |
| Finalidad | Texto claro: datos usados para gestión comercial y comunicaciones del gimnasio |
| Derecho de acceso | El cliente puede solicitar qué datos se tienen de él |
| Derecho de rectificación | El admin puede editar datos del cliente |
| Derecho de supresión | Funcionalidad de "anonimizar" cliente (no eliminar, para mantener integridad de ventas históricas) |
| Política de privacidad | Documento simple publicado en el gimnasio |
| Responsable | El gerente como responsable del tratamiento |

**Implementación técnica:**
- Campo `consentimiento_datos` (boolean + fecha) en tabla CLIENTES
- Funcionalidad "anonimizar cliente": reemplaza nombre/teléfono/email con datos genéricos, mantiene historial de ventas intacto
- No se almacenan datos sensibles (salud, biométricos, etc.)

> **Nota:** Esto NO requiere registro ante la SIC para empresas pequeñas, pero sí tener la política documentada.

---

## Consideraciones de Costo Post Free-Tier (después de 12 meses)

| Servicio | Free tier permanente | Free tier 12 meses | Costo post free-tier |
|---|---|---|---|
| Lambda | ✅ 1M requests/mes | — | $0.00 |
| API Gateway | ❌ | ✅ 1M requests/mes | ~$0.05/mes (15K req × $3.50/M) |
| S3 | ❌ | ✅ 5GB | ~$0.01/mes (50MB) |
| CloudFront | ❌ | ✅ 1TB/mes | ~$0.09/mes (1GB) |
| EFS | ❌ | — (no tiene free tier temporal) | ~$0.03/mes |
| Cognito | ✅ 50K MAU | — | $0.00 |
| CloudWatch | ✅ 5GB logs | — | $0.00 |
| **TOTAL post free-tier** | | | **~$0.50-1.00/mes** |

> **Conclusión:** Incluso después de que expire el free tier de 12 meses, el costo real se mantiene bajo $1/mes. El presupuesto de $15 sigue siendo más que suficiente.

---

## Ruta de Escape: Si Lambda Necesita Internet

Escenarios futuros que requerirían internet desde Lambda:
- Enviar emails (AWS SES)
- Integrar pasarela de pagos
- Webhooks a servicios externos
- Notificaciones push

**Opciones (de menor a mayor costo):**

| Opción | Costo adicional | Complejidad |
|---|---|---|
| VPC Endpoints específicos (SES, SNS) | ~$7/mes por endpoint | Baja |
| Sacar Lambda de la VPC + usar DynamoDB | $0 adicional | Media (requiere rediseño de DB) |
| Agregar NAT Gateway | ~$32/mes | Baja (pero rompe presupuesto) |
| Lambda@Edge sin VPC para funciones con internet | $0 | Media |

**Recomendación:** Si llega ese momento, la opción 1 (VPC Endpoints) es la más limpia. O la opción 2 si el volumen justifica migrar a DynamoDB.

---

## Decisiones Confirmadas

| # | Decisión | Respuesta | Impacto |
|---|---|---|---|
| 1 | Proveedor Git | **GitHub** | CI/CD con GitHub Actions, secrets seguros |
| 2 | Dominio | **CloudFront genérico** (por ahora) | Ahorra ~$12/año, se puede agregar después |
| 3 | Planes de entrenamiento | **3 planes con múltiples duraciones + modalidad virtual** | Requiere modelo de suscripciones flexible |
| 4 | Región AWS | **us-east-1** | Menores costos, latencia aceptable (~100ms) |
| 5 | Usuarios futuros | **Máximo 10** (2 actualmente) | Cognito free tier cubre de sobra |

---

## Modelo de Datos Actualizado

### Esquema de Planes y Suscripciones

```sql
-- Planes de entrenamiento con duración y modalidad
PLANES_ENTRENAMIENTO
├── id
├── nombre (ej: "Plan Básico", "Plan Premium", "Plan Full")
├── modalidad (presencial | virtual | mixto)
├── duracion_dias (30, 60, 90, 180, 365...)
├── precio
├── descripcion
├── activo (boolean)
└── fecha_creacion

-- Suscripciones activas de clientes a planes
SUSCRIPCIONES
├── id
├── cliente_id (FK → clientes)
├── plan_id (FK → planes_entrenamiento)
├── fecha_inicio
├── fecha_fin (calculada: inicio + duración)
├── estado (activa | vencida | cancelada)
├── monto_pagado
├── venta_id (FK → ventas)
└── notas

-- Productos físicos (inventario)
PRODUCTOS
├── id
├── nombre
├── categoria (accesorio | suplemento)
├── precio_venta
├── precio_costo
├── stock_actual
├── stock_minimo
└── activo

-- Ventas (unifica planes + productos)
VENTAS
├── id
├── cliente_id (FK)
├── usuario_id (FK → quien registra)
├── fecha
├── total
├── tipo (nueva | recompra)
└── notas

-- Detalle de cada venta
DETALLE_VENTA
├── id
├── venta_id (FK)
├── tipo_item (producto | plan)
├── producto_id (FK nullable)
├── plan_id (FK nullable)
├── cantidad
├── precio_unitario
└── subtotal
```

> **Nota:** El campo `tipo_item` en DETALLE_VENTA permite que una sola venta incluya tanto productos físicos como planes de entrenamiento en la misma transacción.

---

*Documento creado: Agosto 2026*
*Última actualización: Agosto 2026*
*Próxima revisión: Antes de iniciar Fase 2*
