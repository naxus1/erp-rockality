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
import serverlessExpress from '@vendia/serverless-express';
import app from './app.js';

// Crea el handler de Lambda a partir de la app Express
export const handler = serverlessExpress({ app });
