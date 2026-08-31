/**
 * Skeletons de carga — placeholders animados que se muestran mientras llegan
 * los datos del backend (Lambda/SQLite puede tardar en el primer acceso).
 * Mejoran la percepción de velocidad: el usuario ve la estructura de inmediato
 * en vez de una pantalla vacía.
 */

/** Barra gris animada (bloque base de todos los skeletons). */
function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

/**
 * Filas placeholder para una tabla. Se renderiza dentro del <tbody>, respetando
 * el número de columnas (cols) de la tabla para que encaje con el <thead> real.
 */
export function TableSkeletonRows({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-gray-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3 py-2.5">
              <Bar className="h-3.5" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Tarjeta placeholder (para grids de KPIs / tarjetas de saldo). */
export function CardSkeleton() {
  return (
    <div className="p-4 rounded-xl neu-flat">
      <Bar className="h-3 w-2/3 mb-3" />
      <Bar className="h-6 w-1/2" />
    </div>
  );
}

/** Grid de N tarjetas placeholder. */
export function CardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export { Bar as SkeletonBar };
