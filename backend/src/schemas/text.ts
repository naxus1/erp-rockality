/**
 * SCHEMAS — Helpers de normalización de texto
 *
 * Utilidades reutilizables para limpiar y normalizar los textos que ingresa el
 * usuario, de forma centralizada en los schemas Zod (aplica sin importar quién
 * llame la API):
 *
 *  - normalizeSpaces: quita espacios al inicio/final y colapsa los espacios
 *    dobles internos ("  juan   pérez " -> "juan pérez").
 *  - toUpper():   transform a MAYÚSCULAS (con espacios normalizados). Para
 *    nombres, direcciones, descripciones, notas, etc. (datos maestros).
 *  - toClean():   transform que normaliza espacios sin cambiar el case. Para
 *    referencias, facturas, usuarios de redes, etc. (case-sensitive).
 *  (Para emails se usa z.string().trim().toLowerCase().email() directo en el
 *   schema, para que el trim/lowercase ocurra antes de validar el formato.)
 *
 * Se aplican como `.transform()` al final de un ZodString ya validado, así las
 * reglas de longitud (.min/.max) corren sobre el texto original y la
 * transformación ocurre después. Ej:
 *   nombre: z.string().min(2).max(100).transform(toUpper)
 */

/** Quita espacios extremos y colapsa espacios internos múltiples a uno solo. */
export function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** MAYÚSCULAS + espacios normalizados. */
export function toUpper(value: string): string {
  return normalizeSpaces(value).toLocaleUpperCase('es-CO');
}

/** Espacios normalizados, sin cambiar mayúsculas/minúsculas. */
export function toClean(value: string): string {
  return normalizeSpaces(value);
}

/**
 * Normalización para NOMBRES DE CATÁLOGO (ciudades, métodos de pago, sexos,
 * categorías, etc.): MAYÚSCULAS + espacios normalizados + SIN TILDES/diacríticos.
 *
 * Quitar los diacríticos evita "repetidos" que solo difieren por acentos
 * (BOGOTÁ vs BOGOTA, CHÍA vs CHIA) y hace que el índice único case/acento-
 * insensible del catálogo trate esos valores como el mismo. La Ñ se PRESERVA
 * (no es un acento sino una letra propia del español).
 *
 * OJO: usar SOLO en catálogos. Los datos maestros con nombres propios
 * (clientes.nombre, apellidos, direcciones, notas) usan toUpper() y CONSERVAN
 * las tildes.
 */
export function toCatalogo(value: string): string {
  // Placeholder alfabético (improbable en un nombre) para proteger la Ñ del
  // despojo de diacríticos, ya que en NFD la Ñ se separa en N + tilde (U+0303)
  // y se perdería. Se usa texto normal (no un carácter de control) para no
  // disparar la regla eslint no-control-regex.
  const ENYE = 'XX_ENYE_XX';
  return normalizeSpaces(value)
    .toLocaleUpperCase('es-CO')
    .replace(/Ñ/g, ENYE)
    .normalize('NFD') // separa letra base y diacrítico (Á -> A + ´)
    .replace(/[\u0300-\u036f]/g, '') // elimina los diacríticos combinados
    .replace(new RegExp(ENYE, 'g'), 'Ñ'); // restaura la Ñ
}
