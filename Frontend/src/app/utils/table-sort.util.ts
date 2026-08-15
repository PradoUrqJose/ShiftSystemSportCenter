// Ordenamiento genérico para las tablas CRUD y de reportes (todas las que
// viven dentro de <app-table-shell>). Antes cada tabla que ordenaba
// (Empresas era la única) reimplementaba su propio compare a mano — ver
// memoria "rediseno-airbnb-frontend" y DESIGN.md, sección Tablas de datos.
//
// `selector` en vez de `keyof T` a propósito: varias columnas son
// calculadas (ej. conteo de colaboradores por puesto) y no existen como
// propiedad directa del modelo.

export type SortDirection = 'asc' | 'desc';

export interface SortState<F extends string> {
  field: F;
  direction: SortDirection;
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

/** Devuelve una copia ordenada de `rows` — no muta el arreglo original. */
export function sortRows<T>(rows: readonly T[], selector: (row: T) => unknown, direction: SortDirection): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compareValues(selector(a), selector(b)));
}

/** Click en un header ordenable: misma columna → invierte dirección, columna nueva → arranca en 'asc'. */
export function nextSortState<F extends string>(current: SortState<F>, field: F): SortState<F> {
  return current.field === field
    ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { field, direction: 'asc' };
}
