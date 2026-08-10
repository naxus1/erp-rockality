# Branch Strategy

## Estructura de ramas

```
main ─────────────────── producción (deploy a AWS)
  │                         ↑ solo via PR desde develop
  │
develop ─────────────── integración (aquí se junta todo)
  │                         ↑ solo via PR desde feature/*
  │
  ├── feature/nombre ──── funcionalidades nuevas
  ├── fix/nombre ───────── corrección de bugs
  └── chore/nombre ─────── mantenimiento (deps, configs, docs)
```

## Reglas

| Rama | Propósito | Push directo | Merge desde |
|---|---|---|---|
| `main` | Producción — lo que está en AWS | ❌ Prohibido | Solo desde `develop` via PR |
| `develop` | Integración — código listo para release | ❌ Prohibido | Desde `feature/*`, `fix/*`, `chore/*` via PR |
| `feature/*` | Trabajo en una funcionalidad | ✅ Permitido | — |
| `fix/*` | Corrección de un bug | ✅ Permitido | — |
| `chore/*` | Mantenimiento sin lógica nueva | ✅ Permitido | — |

## Protección configurada (GitHub Rulesets)

Ambas ramas (`main` y `develop`) tienen las siguientes reglas activas:

- **No deletion** — No se pueden borrar
- **No force-push** — No se puede reescribir historial
- **Require PR** — Todo cambio entra via Pull Request

## Convención de nombres

### Ramas

```
feature/modulo-ventas
feature/crud-productos
fix/precio-incorrecto
chore/actualizar-dependencias
```

### Commits (Conventional Commits)

```
feat: agregar registro de ventas
fix: corregir cálculo de IVA en suplementos
chore: actualizar eslint a v9.8
docs: documentar API de reportes
test: agregar tests para servicio de gastos
```

| Prefijo | Uso |
|---|---|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `chore:` | Mantenimiento (no cambia funcionalidad) |
| `docs:` | Documentación |
| `test:` | Tests |
| `refactor:` | Refactorización sin cambio de comportamiento |

## Flujo de trabajo paso a paso

### 1. Crear rama para trabajar

```bash
# Asegurarse de estar en develop actualizado
git checkout develop
git pull origin develop

# Crear rama nueva
git checkout -b feature/nombre-de-la-feature
```

### 2. Trabajar y commitear

```bash
# Hacer cambios...
git add archivo1.ts archivo2.ts
git commit -m "feat: descripción clara del cambio"
```

### 3. Push de la rama

```bash
git push -u origin feature/nombre-de-la-feature
```

### 4. Crear Pull Request (feature → develop)

```bash
gh pr create --base develop --title "feat: descripción corta" --body "Descripción detallada de lo que hace este PR"
```

### 5. Merge del PR

```bash
# Desde CLI
gh pr merge --squash --delete-branch

# O desde la UI de GitHub (botón Merge)
```

### 6. Release a producción (develop → main)

Cuando `develop` está estable y listo:

```bash
gh pr create --base main --head develop --title "release: v0.X.0" --body "Cambios incluidos en este release"
```

## Diagrama de flujo visual

```
feature/ventas ──┐
                 ├──→ PR → develop ──→ PR → main → deploy AWS
feature/gastos ──┘
```

## ¿Cuándo crear una rama nueva?

- **Siempre** que vayas a hacer un cambio (por pequeño que sea)
- **Nunca** trabajes directo en `develop` o `main`
- Una rama = un cambio lógico (no mezclar features)

## Ejemplo completo

```bash
# Quiero agregar el módulo de ventas
git checkout develop
git pull
git checkout -b feature/modulo-ventas

# Trabajo...
git add .
git commit -m "feat: crear endpoint POST /ventas"
git commit -m "feat: agregar validación de input en ventas"
git push -u origin feature/modulo-ventas

# Creo PR
gh pr create --base develop --title "feat: módulo de ventas" --body "CRUD completo de ventas con validación"

# Una vez aprobado, merge
gh pr merge --squash --delete-branch
```
