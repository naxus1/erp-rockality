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
