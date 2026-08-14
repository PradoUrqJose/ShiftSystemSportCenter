/**
 * Forma en la que Spring Data serializa un `Page<T>` (usado por los endpoints
 * paginados agregados en la Etapa 2 del backend: /colaboradores, /empresas,
 * /tiendas, /puestos, /turnos/mensual). Antes esos endpoints devolvían un
 * array plano; ahora devuelven este objeto envolvente.
 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // página actual (0-indexed)
  size: number;
  first: boolean;
  last: boolean;
}

/**
 * Tamaño de página usado para pedir "todo de una" a los endpoints paginados,
 * mientras el frontend no tenga controles de paginación propios (scroll
 * infinito, selector de página, etc.). Es más grande que cualquier volumen
 * real esperado hoy (colaboradores/empresas/tiendas/puestos por empresa).
 * Si en algún momento se supera este tope, hay que construir paginación de
 * verdad en la UI en vez de subir este número.
 */
export const PAGE_SIZE_ALL = 1000;
