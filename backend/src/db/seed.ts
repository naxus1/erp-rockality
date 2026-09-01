/**
 * SEED — Datos de prueba para desarrollo (PostgreSQL / Neon)
 *
 * Carga datos de ejemplo en la DB para poder probar la aplicación.
 * Ejecutar: npx tsx backend/src/db/seed.ts  (necesita DATABASE_URL)
 */
import { query, queryOne, closeDatabase } from './connection.js';
import { initDatabase } from './init.js';
import { loadEncryptionKey, encryptNullable, hmac } from '../utils/crypto.js';

async function seed(): Promise<void> {
  await loadEncryptionKey();
  await initDatabase();

  console.warn('\n[SEED] Cargando datos de prueba...\n');

  // ─── Clientes ────────────────────────────────────────────
  // telefono y email se cifran (AES-256-GCM) y telefono_hash guarda el HMAC para búsqueda.
  const clientesSeed: Array<
    [
      string,
      string,
      string,
      string | null,
      string | null,
      string,
      string | null,
      number,
      number,
      number,
      string | null,
      string | null,
      string | null,
    ]
  > = [
    [
      '80727054',
      'Oscar',
      'Vargas Molina',
      '3123378499',
      'naxus1@gmail.com',
      '1982-12-23',
      'Cra 15 #45-67',
      1,
      1,
      1,
      'Cliente frecuente',
      'Lesión rodilla izquierda, no sentadilla profunda',
      '@oscarvargas',
    ],
    [
      '52987654',
      'Laura',
      'Martinez Ruiz',
      '3009876543',
      'laura@email.com',
      '1995-03-10',
      'Calle 80 #12-34',
      2,
      2,
      4,
      null,
      null,
      '@lauramtz',
    ],
    [
      '10456789',
      'Carlos',
      'Gomez Peña',
      '3156789012',
      null,
      '1988-07-05',
      null,
      1,
      1,
      2,
      'Entrena lunes, miércoles y viernes',
      'Problema hombro derecho, evitar press militar',
      null,
    ],
    [
      '43210987',
      'Maria',
      'Lopez Torres',
      '3201234567',
      'maria.lopez@email.com',
      '2000-11-20',
      'Av 68 #23-45',
      3,
      2,
      1,
      'Busca bajar de peso',
      null,
      '@mariafit',
    ],
    [
      '78901234',
      'Andres',
      'Rodriguez',
      '3178901234',
      null,
      '1992-05-15',
      null,
      1,
      1,
      3,
      null,
      'Operación menisco 2024, ya recuperado',
      null,
    ],
  ];
  for (const [
    cedula,
    nombre,
    apellidos,
    telefono,
    email,
    fnac,
    dir,
    ciudad,
    sexo,
    canal,
    notas,
    salud,
    ig,
  ] of clientesSeed) {
    await query(
      `INSERT INTO clientes (cedula, nombre, apellidos, telefono, telefono_hash, email, fecha_nacimiento, direccion, ciudad_id, sexo_id, canal_captacion_id, notas, notas_salud, instagram, consentimiento_datos, consentimiento_fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1, now())
       ON CONFLICT (cedula) DO NOTHING`,
      [
        cedula,
        nombre,
        apellidos,
        encryptNullable(telefono),
        hmac(telefono),
        encryptNullable(email),
        fnac,
        dir,
        ciudad,
        sexo,
        canal,
        notas,
        salud,
        ig,
      ],
    );
  }
  console.warn('  ✓ 5 clientes');

  // ─── Terceros ────────────────────────────────────────────
  await query(
    `INSERT INTO terceros (nit, nombre, tipo_tercero_id, telefono, nombre_contacto, observaciones) VALUES
    ('900555111', 'Suplementos Colombia SAS', 1, '6014567890', 'Andres Lopez', 'Entrega los martes'),
    ('800222333', 'Codensa - Enel', 3, '6016010101', 'Servicio al cliente', 'Factura mensual'),
    ('11223344', 'Pedro Entrenador', 2, '3159998877', NULL, 'Coach de fuerza'),
    ('55667788', 'Diana Instructora', 2, '3201112233', NULL, 'Clases funcional y cardio'),
    ('900888777', 'Accesorios Gym Pro', 1, '6017654321', 'Felipe Ruiz', 'Guantes y accesorios')
    ON CONFLICT (nit) DO NOTHING`,
  );
  console.warn('  ✓ 5 terceros (2 proveedores, 2 empleados, 1 empresa servicios)');

  // ─── Productos ───────────────────────────────────────────
  await query(
    `INSERT INTO productos (sku, nombre, categoria_id, unidad_medida_id, proveedor_nit, precio_venta, precio_costo, stock_actual, stock_minimo) VALUES
    ('SUPL-001', 'Creatina Monohidrato 300g', 2, 2, '900555111', 8500000, 5000000, 12, 5),
    ('SUPL-002', 'Proteína Whey 1kg', 2, 4, '900555111', 15000000, 9000000, 8, 3),
    ('SUPL-003', 'BCAA 500ml', 2, 3, '900555111', 6500000, 3500000, 6, 4),
    ('ACC-001', 'Guantes entrenamiento', 1, 1, '900888777', 4500000, 2500000, 15, 5),
    ('ACC-002', 'Vendas muñeca par', 1, 1, '900888777', 2500000, 1200000, 20, 8),
    ('ACC-003', 'Shaker botella 750ml', 1, 1, '900888777', 3500000, 1800000, 10, 4)
    ON CONFLICT (sku) DO NOTHING`,
  );
  console.warn('  ✓ 6 productos (3 suplementos + 3 accesorios)');

  // ─── Planes ──────────────────────────────────────────────
  // (Se insertan solo si no existen por nombre; los ids son autogenerados.)
  const planesSeed: Array<[string, string, number, number, string]> = [
    ['Plan Básico', 'presencial', 30, 8000000, 'Acceso zona de pesas, horario libre'],
    ['Plan Premium', 'presencial', 60, 15000000, 'Acceso completo + coach personalizado'],
    ['Plan Full', 'mixto', 90, 22000000, 'Presencial + virtual + nutrición'],
    ['Plan Virtual', 'virtual', 30, 5000000, 'Rutinas online + seguimiento'],
  ];
  for (const [nombre, modalidad, dur, precio, desc] of planesSeed) {
    await query(
      `INSERT INTO planes (nombre, modalidad, duracion_dias, precio, descripcion)
       SELECT $1, $2, $3, $4, $5
       WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = $1)`,
      [nombre, modalidad, dur, precio, desc],
    );
  }
  console.warn('  ✓ planes de prueba');

  // ids de planes por nombre (autogenerados en Postgres)
  const planIds = new Map<string, number>();
  const planRows = await query<{ id: number; nombre: string }>('SELECT id, nombre FROM planes');
  for (const r of planRows.rows) planIds.set(r.nombre, r.id);
  const idBasico = planIds.get('Plan Básico')!;
  const idPremium = planIds.get('Plan Premium')!;

  // ─── Ventas ──────────────────────────────────────────────

  // Venta 1: Oscar compra Plan Premium + Creatina (paga todo)
  const v1id = (
    await queryOne<{ id: number }>(
      `INSERT INTO ventas (cliente_cedula, usuario_id, subtotal, iva, total, tipo, estado, created_by)
       VALUES ('80727054', 'vendedor', 23500000, 1615000, 25115000, 'nueva', 'pagada', 'vendedor') RETURNING id`,
    )
  ).id;
  await query(
    `INSERT INTO detalle_venta (venta_id, tipo_item, plan_id, cantidad, precio_unitario, subtotal) VALUES ($1, 'plan', $2, 1, 15000000, 15000000)`,
    [v1id, idPremium],
  );
  await query(
    `INSERT INTO detalle_venta (venta_id, tipo_item, producto_sku, cantidad, precio_unitario, subtotal) VALUES ($1, 'producto', 'SUPL-001', 1, 8500000, 8500000)`,
    [v1id],
  );
  await query(
    `INSERT INTO pagos (venta_id, monto, metodo_pago_id, created_by) VALUES ($1, 25115000, 1, 'vendedor')`,
    [v1id],
  );
  await query(
    `INSERT INTO suscripciones (cliente_cedula, plan_id, venta_id, fecha_inicio, fecha_fin, estado, monto_pagado)
     VALUES ('80727054', $2, $1, to_char(CURRENT_DATE, 'YYYY-MM-DD'), to_char(CURRENT_DATE + INTERVAL '60 days', 'YYYY-MM-DD'), 'activa', 15000000)`,
    [v1id, idPremium],
  );
  await query(`UPDATE productos SET stock_actual = stock_actual - 1 WHERE sku = 'SUPL-001'`);

  // Venta 2: Laura compra Plan Básico (paga mitad — queda debiendo)
  const v2id = (
    await queryOne<{ id: number }>(
      `INSERT INTO ventas (cliente_cedula, usuario_id, subtotal, iva, total, tipo, estado, created_by)
       VALUES ('52987654', 'vendedor', 8000000, 0, 8000000, 'nueva', 'pendiente', 'vendedor') RETURNING id`,
    )
  ).id;
  await query(
    `INSERT INTO detalle_venta (venta_id, tipo_item, plan_id, cantidad, precio_unitario, subtotal) VALUES ($1, 'plan', $2, 1, 8000000, 8000000)`,
    [v2id, idBasico],
  );
  await query(
    `INSERT INTO pagos (venta_id, monto, metodo_pago_id, referencia, created_by) VALUES ($1, 4000000, 4, 'Nequi-001', 'vendedor')`,
    [v2id],
  );
  await query(
    `INSERT INTO suscripciones (cliente_cedula, plan_id, venta_id, fecha_inicio, fecha_fin, estado, monto_pagado)
     VALUES ('52987654', $2, $1, to_char(CURRENT_DATE, 'YYYY-MM-DD'), to_char(CURRENT_DATE + INTERVAL '30 days', 'YYYY-MM-DD'), 'activa', 4000000)`,
    [v2id, idBasico],
  );

  // Venta 3: Carlos compra guantes + vendas (no paga nada)
  const v3id = (
    await queryOne<{ id: number }>(
      `INSERT INTO ventas (cliente_cedula, usuario_id, subtotal, iva, total, tipo, estado, created_by)
       VALUES ('10456789', 'vendedor', 9500000, 1805000, 11305000, 'nueva', 'pendiente', 'vendedor') RETURNING id`,
    )
  ).id;
  await query(
    `INSERT INTO detalle_venta (venta_id, tipo_item, producto_sku, cantidad, precio_unitario, subtotal) VALUES ($1, 'producto', 'ACC-001', 1, 4500000, 4500000)`,
    [v3id],
  );
  await query(
    `INSERT INTO detalle_venta (venta_id, tipo_item, producto_sku, cantidad, precio_unitario, subtotal) VALUES ($1, 'producto', 'ACC-002', 2, 2500000, 5000000)`,
    [v3id],
  );
  await query(`UPDATE productos SET stock_actual = stock_actual - 1 WHERE sku = 'ACC-001'`);
  await query(`UPDATE productos SET stock_actual = stock_actual - 2 WHERE sku = 'ACC-002'`);

  // Venta 4: Maria compra Proteína (pagada con tarjeta)
  const v4id = (
    await queryOne<{ id: number }>(
      `INSERT INTO ventas (cliente_cedula, usuario_id, subtotal, iva, total, tipo, estado, created_by)
       VALUES ('43210987', 'vendedor', 15000000, 2850000, 17850000, 'recompra', 'pagada', 'vendedor') RETURNING id`,
    )
  ).id;
  await query(
    `INSERT INTO detalle_venta (venta_id, tipo_item, producto_sku, cantidad, precio_unitario, subtotal) VALUES ($1, 'producto', 'SUPL-002', 1, 15000000, 15000000)`,
    [v4id],
  );
  await query(
    `INSERT INTO pagos (venta_id, monto, metodo_pago_id, created_by) VALUES ($1, 17850000, 3, 'vendedor')`,
    [v4id],
  );
  await query(`UPDATE productos SET stock_actual = stock_actual - 1 WHERE sku = 'SUPL-002'`);

  console.warn('  ✓ 4 ventas (2 pagadas, 2 pendientes)');

  // ─── Gastos ──────────────────────────────────────────────
  await query(
    `INSERT INTO gastos (tercero_nit, gerencia_id, tipo_gasto_id, categoria_gasto_id, descripcion, valor_base, iva, total, periodo_mes, periodo_anio, fecha_pago, metodo_pago_id, referencia_pago) VALUES
    ('11223344', 1, 1, 6, 'Salario agosto Pedro Entrenador', 200000000, 0, 200000000, 8, 2026, '2026-08-01', 2, NULL),
    ('55667788', 1, 1, 6, 'Salario agosto Diana Instructora', 180000000, 0, 180000000, 8, 2026, '2026-08-01', 2, NULL),
    ('800222333', 2, 3, 2, 'Factura energía agosto', 35000000, 6650000, 41650000, 8, 2026, '2026-08-10', 2, 'FAC-2026-0891'),
    ('800222333', 2, 3, 2, 'Factura agua agosto', 12000000, 0, 12000000, 8, 2026, '2026-08-10', 2, 'FAC-AG-445')`,
  );
  console.warn('  ✓ 4 gastos (2 nómina + 2 servicios)');

  console.warn('\n[SEED] ¡Datos cargados! Puedes probar la app.\n');
  await closeDatabase();
}

seed().catch((err) => {
  console.error('[SEED] Error:', err);
  process.exit(1);
});
