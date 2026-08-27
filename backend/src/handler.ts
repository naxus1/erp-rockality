/**
 * HANDLER — Punto de entrada para AWS Lambda
 *
 * Este archivo adapta la aplicación Express para funcionar dentro de Lambda.
 *
 * ¿Cómo funciona?
 * 1. API Gateway recibe un request HTTP del usuario
 * 2. API Gateway lo convierte en un "evento" de Lambda
 * 3. serverless-express traduce ese evento al formato que Express entiende
 * 4. Express procesa el request normalmente (middlewares, rutas, controllers)
 * 5. La respuesta viaja de vuelta: Express → serverless-express → API Gateway → usuario
 *
 * El resultado: tu código Express funciona IGUAL en local y en Lambda,
 * sin modificar ni una línea de lógica.
 */
import serverlessExpressPkg from '@vendia/serverless-express';
import app from './app.js';
import { initDatabase } from './db/init.js';
import { loadEncryptionKey } from './utils/crypto.js';

// Interop CJS/ESM: el paquete expone la fábrica como default; según el modo de
// carga puede venir en `.default`. Tomamos la que sea callable.
type SEFactory = (opts: { app: unknown }) => (e: unknown, c: unknown, cb: unknown) => unknown;
const serverlessExpress = (
  typeof serverlessExpressPkg === 'function'
    ? serverlessExpressPkg
    : (serverlessExpressPkg as unknown as { default: SEFactory }).default
) as SEFactory;

// Inicialización perezosa en el arranque en frío (cold start): resuelve la clave
// de cifrado desde Secrets Manager y aplica migraciones sobre la DB en EFS.
let ready: Promise<void> | null = null;
async function bootstrap(): Promise<void> {
  await loadEncryptionKey();
  initDatabase();
}

const serverlessHandler = serverlessExpress({ app });

export const handler = async (
  event: unknown,
  context: unknown,
  callback: unknown,
): Promise<unknown> => {
  if (!ready) ready = bootstrap();
  await ready;
  return serverlessHandler(event, context, callback);
};
