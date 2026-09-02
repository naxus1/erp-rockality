/**
 * prepush-smoke.ts — Smoke de ARRANQUE para la validación pre-push.
 *
 * Reproduce lo que hace la Lambda en el cold start y falla (exit != 0) si algo
 * de eso rompería en producción:
 *   1. loadEncryptionKey() + initDatabase()  -> aplica schema.sql contra Neon
 *      (aquí se habría atrapado el error 23505 del ON CONFLICT de catálogos).
 *   2. Monta Express y hace GET /api/health -> confirma que la app responde 200.
 *
 * NO escribe datos de negocio. Requiere DATABASE_URL en el entorno (lo pasa el
 * script prepush-validate.sh desde backend/.env).
 *
 * Vive en scripts/ (tooling de desarrollo) y NO en backend/src, para que NO se
 * incluya en el artefacto de la Lambda. Se ejecuta con tsx importando el código
 * fuente del backend directamente.
 */
import http from 'node:http';
import app from '../backend/src/app.js';
import { initDatabase } from '../backend/src/db/init.js';
import { closeDatabase } from '../backend/src/db/connection.js';
import { loadEncryptionKey } from '../backend/src/utils/crypto.js';

async function main(): Promise<void> {
  // 1) Arranque: clave de cifrado + esquema idempotente contra la base.
  await loadEncryptionKey();
  await initDatabase();

  // 2) Health check montando la app (puerto efímero local).
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  const code = await new Promise<number>((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/health', method: 'GET' },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode || 0));
      },
    );
    req.on('error', reject);
    req.end();
  });

  server.close();
  await closeDatabase();

  if (code !== 200) {
    console.error(`[prepush-smoke] /api/health respondió ${code} (esperado 200).`);
    process.exit(1);
  }
  console.warn('[prepush-smoke] OK: esquema aplicado y /api/health = 200.');
  process.exit(0);
}

main().catch((e) => {
  console.error('[prepush-smoke] FALLO de arranque:', e instanceof Error ? e.message : e);
  process.exit(1);
});
