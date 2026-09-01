# Supabase vs Neon — Postgres gestionado para Rockality

Explicación de las dos opciones de Postgres gestionado consideradas para migrar
la base de datos del ERP (hoy SQLite sobre EFS). Ambas son **Postgres real**, así
que mantienen todo el SQL actual del sistema (JOINs, SUM/GROUP BY, LIKE,
transacciones). La diferencia está en el enfoque y los extras.

> Datos de planes/precios: verificados a mediados de 2026. Pueden cambiar;
> confirmar en las páginas oficiales antes de decidir.
> Fuentes: [supabase.com/pricing](https://supabase.com/pricing) y
> [neon.com/pricing](https://neon.com/pricing).

---

## ¿Qué es cada una? (en simple)

Las dos resuelven el mismo problema base: **darte una base de datos PostgreSQL en
la nube, administrada por ellos** (sin que tú manejes servidores, backups ni
parches). Te dan una "cadena de conexión" y tu backend se conecta como a
cualquier Postgres.

### Neon

Es **Postgres puro, serverless**. Su idea central: la base **se apaga sola cuando
nadie la usa** (scale-to-zero) y se enciende en milisegundos cuando llega una
consulta. Pagas solo por el tiempo que está activa. Es minimalista: te da la base
de datos y poco más. Su función estrella es el **branching**: crear copias
instantáneas de la base (como ramas de git) para probar sin tocar producción.

### Supabase

Es una **plataforma completa alrededor de Postgres** ("backend as a service").
Además de la base de datos, incluye de fábrica: **autenticación de usuarios**,
**almacenamiento de archivos**, **APIs automáticas** sobre tus tablas,
**realtime** (cambios en vivo) y un **panel de administración** visual muy
completo. Es "Postgres + un montón de herramientas de backend".

---

## Ventajas de cada una

### Neon — ventajas

- **Postgres estándar y "puro"**: mínima fricción para migrar desde SQL clásico.
- **Scale-to-zero**: si el gimnasio no tiene tráfico de noche, la base no cuesta
  computación en esas horas. Ideal para uso intermitente.
- **Plan gratuito sin límite de tiempo** (no es un trial): suficiente para apps
  reales pequeñas. Escala automática de cómputo hasta cierto punto.
- **Branching**: copias instantáneas de la base para probar cambios/migraciones
  sin riesgo. Muy útil al portar el esquema.
- **Pago por uso real** (por hora de cómputo + almacenamiento), sin cuota fija
  mensual en los planes de pago.
- **Cold start**: al despertar de scale-to-zero puede haber un pequeño retraso en
  la primera consulta (mínimo, pero existe).

### Supabase — ventajas

- **Todo-en-uno**: auth, storage, APIs, realtime y panel visual incluidos. Si
  algún día quieres reemplazar Cognito o subir fotos de clientes, ya está ahí.
- **Panel de administración potente**: ver/editar datos, ejecutar SQL, gestionar
  usuarios desde una web cómoda (útil para operar sin escribir queries).
- **Open source**: puedes autoalojarlo si algún día quisieras.
- **Plan gratuito generoso** para empezar; el salto a producción "seria" es un
  plan fijo mensual con todo incluido (predecible).
- **Ecosistema y librerías** muy maduras (SDK, integraciones).

---

## Planes gratuitos (lo relevante para Rockality)

### Neon — Free ($0, sin límite de tiempo)

- Hasta ~100 proyectos, ~0.5 GB de almacenamiento por proyecto.
- ~100 horas de cómputo (CU-hours) por proyecto al mes; **scale-to-zero** tras
  ~5 min de inactividad (una app de baja carga puede no gastar casi cómputo).
- Sin tarjeta de crédito.

### Supabase — Free ($0)

- ~500 MB de base de datos, ~50.000 usuarios activos/mes (su auth), ~1–5 GB de
  almacenamiento/egress según recurso.
- **Se pausa tras ~1 semana de inactividad** (hay que reactivar el proyecto).
- Límite de ~2 proyectos activos en la cuenta gratuita.

Para un gimnasio con pocos usuarios y una base pequeña (clientes, ventas, gastos),
**ambas cubren de sobra en su plan gratuito → ~$0/mes**.

### Si algún día se crece (planes de pago, referencia)

- **Neon**: sin cuota fija; pagas cómputo (~$0.10/CU-hora en el plan de entrada) +
  almacenamiento (~$0.35/GB-mes). Un uso pequeño real puede quedar en pocos USD.
- **Supabase Pro**: ~$25/mes fijo, que incluye base más grande, auth, storage,
  functions y realtime en un solo precio predecible.

---

## Ejemplo de uso (cómo se ve en la práctica)

En ambos casos, el backend Node se conectaría con un cliente Postgres estándar
(`pg` o `postgres.js`), usando una cadena de conexión que ellos te dan:

```
# Neon (ejemplo de connection string)
DATABASE_URL="postgresql://usuario:password@ep-xxx.us-east-1.aws.neon.tech/rockality?sslmode=require"

# Supabase (ejemplo de connection string)
DATABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
```

Y en el código, una query que hoy es SQLite pasa a Postgres casi igual:

```ts
// Hoy (SQLite, síncrono):
const cliente = db.prepare('SELECT * FROM clientes WHERE cedula = ?').get(cedula);

// Con Postgres (async, con el cliente 'pg'):
const { rows } = await pool.query('SELECT * FROM clientes WHERE cedula = $1', [cedula]);
const cliente = rows[0];
```

Los `JOIN`, `SUM`, `GROUP BY`, `LIKE` y transacciones del ERP **se mantienen**;
el cambio principal es que las funciones pasan a ser `async` y el placeholder
`?` pasa a `$1, $2, ...`.

---

## ¿Cuál conviene para Rockality?

**Recomendación: Neon.**

Razones para este proyecto puntual:

- Ya tienes **Cognito** para autenticación y **CloudFront/S3** para el frontend,
  así que los extras de Supabase (auth, storage, APIs) **no los necesitas** hoy —
  serían funciones que no usarías.
- El ERP solo necesita **una base Postgres sólida y barata**, que es exactamente
  lo que Neon hace mejor y más simple.
- El **scale-to-zero** encaja con el uso de un gimnasio (no hay tráfico 24/7).
- El **branching** ayuda a hacer la migración del esquema y probar sin miedo.
- Menos piezas = menos cosas que mantener.

**Cuándo elegir Supabase en su lugar:** si a futuro quisieras reemplazar Cognito
por su auth, guardar archivos (fotos de clientes, documentos) o tener un panel
visual de administración de datos para el equipo sin escribir SQL. Si eso está en
el horizonte, Supabase te ahorra integrar esas piezas por separado.

> Nota: ambas son externas a AWS. La base viajaría fuera de tu cuenta AWS (por
> internet, con TLS). Para datos de un gimnasio es aceptable; si en algún momento
> hay requisitos de mantener todo dentro de AWS, la alternativa sería RDS/Aurora
> Postgres (más caro, ver PLAN_MIGRACION_BD.md).

---

## Resumen en una línea

- **Neon** = Postgres serverless, minimalista, barato, scale-to-zero. **Mejor para
  Rockality** (solo necesitas la base).
- **Supabase** = Postgres + plataforma completa (auth, storage, APIs, panel).
  Mejor si vas a usar esos extras.
