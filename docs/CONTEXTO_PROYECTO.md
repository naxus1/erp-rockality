# ERP Rockality — Contexto Completo del Proyecto

## Resumen

ERP básico para un gimnasio en Colombia. Controla ventas, inventario, gastos, clientes, planes de entrenamiento y suscripciones. Diseñado para máximo 10 usuarios con presupuesto AWS de $15/mes (actualmente funciona 100% local).

- **Repo:** https://github.com/naxus1/erp-rockality
- **Stack:** React + Vite + Tailwind (frontend) | Node.js + Express + TypeScript (backend) | SQLite (DB)
- **Estado:** MVP funcional local — falta deploy a AWS y auth real (Cognito)

---

## Arquitectura

```
erp-rockality/
├── frontend/          # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── pages/     # Clientes, Productos, Ventas, Compras, Planes, Gastos, Terceros, Catálogos, Dashboard
│       ├── components/ # Layout, ProtectedRoute
│       ├── context/   # AuthContext (login local dev)
│       └── services/  # api.ts (wrapper fetch)
├── backend/           # Node.js + Express + TypeScript
│   └── src/
│       ├── routes/    # Endpoints REST por módulo
│       ├── repositories/ # Queries SQLite (better-sqlite3)
│       ├── schemas/   # Validación Zod
│       ├── middleware/ # validate.ts, audit.ts
│       ├── db/        # connection, init, migrate, seed, migrations/
│       └── config/    # Variables de entorno
├── infra/             # AWS SAM (pendiente)
├── docs/              # Documentación
└── .github/workflows/ # CI (lint + security audit)
```

---

## Base de Datos — Tablas (SQLite)

### Entidades principales

| Tabla       | PK                       | Descripción                                                                                                                                                                |
| ----------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clientes`  | cedula (TEXT)            | Clientes del gym. Campos: nombre, apellidos, telefono, email, fecha_nacimiento, direccion, ciudad_id, sexo_id, canal_captacion_id, notas, notas_salud, instagram, linkedin |
| `productos` | sku (TEXT, autogenerado) | Inventario. SKU = PREFIJO-001. Campos: nombre, categoria_id, unidad_medida_id, proveedor_nit, precio_venta, precio_costo, stock_actual, stock_minimo, aplica_iva           |
| `terceros`  | nit (TEXT)               | Unifica proveedores, empleados, empresas servicios. tipo_tercero_id define qué es                                                                                          |
| `planes`    | id (INT)                 | Planes de entrenamiento: nombre, modalidad (presencial/virtual/mixto), duracion_dias, precio                                                                               |
| `ventas`    | id (INT)                 | Transacciones. Estado: pendiente/pagada/anulada. Vincula cliente + items + pagos                                                                                           |
| `compras`   | id (INT)                 | Entrada inventario. Suma stock + genera gasto automático                                                                                                                   |
| `gastos`    | id (INT)                 | Gastos operativos con causación contable (periodo_mes ≠ fecha_pago)                                                                                                        |

### Tablas de detalle

| Tabla            | Descripción                                                                   |
| ---------------- | ----------------------------------------------------------------------------- |
| `detalle_venta`  | Items de cada venta (producto o plan)                                         |
| `detalle_compra` | Items de cada compra                                                          |
| `pagos`          | Abonos parciales vinculados a venta. Auto-completa estado cuando suma = total |
| `suscripciones`  | Membresías activas. Se crean automáticamente al vender un plan                |

### Catálogos

`sexos`, `ciudades`, `canales_captacion`, `categorias_producto`, `unidades_medida`, `metodos_pago`, `tipos_tercero`, `gerencias`, `tipos_gasto`, `categorias_gasto`

### Sistema

| Tabla              | Descripción                                                                    |
| ------------------ | ------------------------------------------------------------------------------ |
| `usuarios_sistema` | admin, gerente, vendedor                                                       |
| `audit_log`        | Trazabilidad: quién hizo qué (entidad_id es TEXT para soportar cédula/SKU/NIT) |
| `_migrations`      | Control de migraciones aplicadas                                               |

---

## Migraciones

```
backend/src/db/migrations/
├── 001_clientes_productos.sql  # Catálogos + clientes + terceros + productos
├── 002_ventas.sql              # Ventas + detalle + pagos
├── 003_planes_suscripciones.sql # Planes + suscripciones
├── 004_gastos.sql              # Gerencias + tipos_gasto + categorias_gasto + gastos
├── 005_audit_log.sql           # Usuarios sistema + audit_log
└── 006_compras.sql             # Compras + detalle_compra
```

---

## Endpoints API (Backend)

### Clientes

- `GET /api/clientes` — listar (filtrable)
- `GET /api/clientes/buscar?q=texto` — buscar
- `GET /api/clientes/:cedula` — uno
- `GET /api/clientes/:cedula/ficha` — ficha completa (cliente + ventas + suscripciones)
- `POST /api/clientes` — crear (requeridos: cedula, nombre, apellidos, telefono, email, fecha_nacimiento, canal_captacion_id)
- `PUT /api/clientes/:cedula` — editar
- `DELETE /api/clientes/:cedula` — desactivar (soft delete)
- `POST /api/clientes/:cedula/anonimizar` — habeas data

### Productos

- `GET /api/productos` — listar
- `GET /api/productos/stock-bajo` — alerta inventario
- `GET /api/productos/:sku` — uno
- `POST /api/productos` — crear (SKU se autogenera si no se envía: PREFIJO-001)
- `PUT /api/productos/:sku` — editar
- `DELETE /api/productos/:sku` — desactivar

### Ventas

- `GET /api/ventas` — listar (filtros: estado, tipo, desde, hasta)
- `GET /api/ventas/:id` — detalle completo (items + pagos + saldo)
- `POST /api/ventas` — registrar (descuenta stock, crea suscripción si plan, pago inmediato opcional)
- `POST /api/ventas/:id/anular` — anula (restaura stock, cancela suscripción)

### Pagos

- `GET /api/pagos/venta/:ventaId` — pagos de una venta
- `POST /api/pagos` — registrar abono (auto-completa venta si suma = total)

### Compras

- `GET /api/compras` — listar
- `GET /api/compras/:id` — detalle
- `POST /api/compras` — registrar (suma stock + genera gasto automático)
- `POST /api/compras/:id/anular` — anula (resta stock + anula gasto)

### Planes y Suscripciones

- `GET /api/planes` — CRUD planes
- `POST /api/planes` / `PUT /api/planes/:id`
- `GET /api/planes/suscripciones/activas`
- `GET /api/planes/suscripciones/por-vencer?dias=7`
- `GET /api/planes/suscripciones/cliente/:cedula`

### Gastos

- `GET /api/gastos` — listar (filtros: periodo_mes, periodo_anio, gerencia_id, tipo_gasto_id)
- `GET /api/gastos/resumen?mes=8&anio=2026` — total del periodo
- `POST /api/gastos` — registrar

### Terceros

- `GET /api/terceros` — listar (filtro: tipo_tercero_id)
- `GET /api/terceros/buscar?q=texto`
- `POST /api/terceros` / `PUT /api/terceros/:nit` / `DELETE /api/terceros/:nit`

### Catálogos

- `GET /api/catalogos/:catalogo` — listar cualquier catálogo
- `POST /api/catalogos/:catalogo` — agregar item
- `PUT /api/catalogos/:catalogo/:id` — editar nombre
- `DELETE /api/catalogos/:catalogo/:id` — desactivar (sufijo "(inactivo)")
- `PATCH /api/catalogos/:catalogo/:id/activar` — reactivar

### Usuarios

- `GET /api/usuarios` — listar
- `POST /api/usuarios` — crear (roles: admin, gerente, vendedor)
- `PUT /api/usuarios/:id` — editar
- `GET /api/usuarios/audit-log` — ver log de auditoría

### Dashboard

- `GET /api/reportes/dashboard` — KPIs: ventas_mes, gastos_mes, margen, suscripciones_activas, por_vencer, clientes_nuevos, pendientes (con deudores), stock_bajo, ticket_promedio

---

## Frontend — Páginas

| Página    | Ruta       | Roles           | Funcionalidad                                                                |
| --------- | ---------- | --------------- | ---------------------------------------------------------------------------- |
| Login     | /login     | Todos           | 3 usuarios dev: admin/admin123, gerente/gerente123, vendedor/vendedor123     |
| Dashboard | /          | Todos           | KPIs en cards, alertas clickeables (pendientes → ventas filtradas)           |
| Clientes  | /clientes  | admin, vendedor | CRUD + búsqueda + filtros (ciudad, sexo) + ordenar + ficha modal (historial) |
| Productos | /productos | admin           | CRUD + SKU auto + filtros (categoría, stock) + ordenar                       |
| Ventas    | /ventas    | admin, vendedor | Registrar + listar + detalle + pagos parciales + anular + filtros + ordenar  |
| Planes    | /planes    | admin           | CRUD planes + tab suscripciones activas + alerta vencimientos                |
| Gastos    | /gastos    | admin           | Registrar + listar + filtros (mes/año/gerencia) + total periodo              |
| Compras   | /compras   | admin, vendedor | Registrar entrada inventario + listar + anular                               |
| Terceros  | /terceros  | admin           | CRUD (proveedores, empleados, empresas) + filtro tipo                        |
| Catálogos | /catalogos | admin           | CRUD de todos los catálogos (agregar, editar, desactivar, reactivar)         |
| Reportes  | /reportes  | admin, gerente  | Placeholder (pendiente)                                                      |

---

## Roles y Permisos

| Módulo    | Admin         | Gerente | Vendedor               |
| --------- | ------------- | ------- | ---------------------- |
| Dashboard | ✅            | ✅      | ✅                     |
| Clientes  | CRUD          | —       | CRUD                   |
| Productos | CRUD          | —       | —                      |
| Ventas    | CRUD + anular | —       | Crear + ver            |
| Planes    | CRUD          | —       | —                      |
| Gastos    | CRUD          | —       | Solo registrar factura |
| Compras   | CRUD          | —       | Registrar              |
| Terceros  | CRUD          | —       | —                      |
| Reportes  | ✅            | ✅      | —                      |
| Catálogos | CRUD          | —       | —                      |

---

## Lógica de Negocio Clave

### Ventas

- Al crear: descuenta stock + crea suscripción (si incluye plan) + calcula IVA automático
- Pago inmediato opcional (parcial o completo)
- Si pago >= total → estado "pagada", sino → "pendiente"
- Anular: restaura stock + cancela suscripción

### Compras

- Al crear: suma stock de cada producto + genera gasto vinculado automáticamente
- Anular: resta stock + marca gasto como "anulado"

### Pagos parciales

- Una venta puede tener N pagos (abonos)
- Cuando suma de pagos >= total → venta cambia a "pagada" automáticamente

### SKU autogenerado

- Cada categoría tiene `prefijo_sku` (ej: SUPL, ACC)
- Al crear producto sin SKU → genera: PREFIJO-001, PREFIJO-002, etc.

### Suscripciones

- Se crean automáticamente al vender un plan
- fecha_fin = fecha_inicio + duracion_dias del plan
- Se auto-vencen al consultar (UPDATE estado='vencida' WHERE fecha_fin < now)

### Precios

- Todos en centavos COP (integer) para evitar errores de punto flotante
- Frontend convierte: usuario escribe $85.000 → backend guarda 8500000

---

## Diseño Visual

- Estilo: Neumorfismo / Flat UI profesional
- Fondo: `#e0e5ec` con sombras soft
- Sidebar: oscuro (`#2d3748`)
- Acciones en tabla: iconos SVG con tooltip (lápiz=editar, ojo=ficha, X-circle=anular)
- Build: ~250ms, sin impacto en rendimiento

---

## Comandos Útiles

```bash
# Levantar backend
npm run dev:backend

# Levantar frontend
cd frontend && npm run dev

# Seed datos de prueba
rm -f backend/data/dev.db
npx tsx backend/src/db/seed.ts

# Build producción
cd frontend && npx vite build
npm run build:backend
```

---

## Seguridad

### Implementado

- ✅ SQL Injection: queries parametrizadas en todos los repositories
- ✅ Catálogos dinámicos: allowlist hardcodeado (no acepta tabla del usuario)
- ✅ Helmet: headers de seguridad
- ✅ CORS: origins restrictivos + PATCH
- ✅ Body limit: 1MB
- ✅ Validación Zod en POST/PUT
- ✅ Error handler global (oculta stack traces en producción)
- ✅ Validación de roles en usuarios PUT

### Pendiente (para deploy AWS)

- ❌ Auth JWT con Cognito (actualmente login local sin verificación real)
- ❌ Rate limiting
- ❌ Auth middleware por ruta según rol

---

## Pipeline CI/CD

- **CI (activo):** GitHub Actions en cada PR → ESLint + Prettier + npm audit
- **CD (pendiente):** Deploy a AWS (Lambda + S3 + CloudFront)

---

## Pendiente para producción

1. Auth real con AWS Cognito (JWT)
2. Rate limiting (express-rate-limit)
3. Deploy a AWS (SAM template)
4. Migración de datos históricos (3000 registros Excel)
5. Reportes avanzados (gráficas, exportar)
6. Dominio personalizado (opcional)

---

## Modelo de costos AWS (estimado)

| Servicio        | Costo/mes            |
| --------------- | -------------------- |
| Lambda          | $0 (free tier)       |
| API Gateway     | $0.05 post free-tier |
| S3 + CloudFront | ~$0.10               |
| EFS (SQLite)    | ~$0.03               |
| Cognito         | $0 (10 usuarios)     |
| **Total**       | **~$0.50-1.00/mes**  |

---

_Última actualización: Agosto 2026_
_PRs mergeados: 35_
_Tests E2E ejecutados: 51+ (todos PASS)_
