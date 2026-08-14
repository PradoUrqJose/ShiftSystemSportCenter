// Duraciones compartidas para la animación de apertura/cierre de los modales
// "propios" de un componente (no el modal de página que maneja ModalService).
// Antes cada componente reimplementaba esto con su propio número mágico —
// varios coincidían en 300/50 por casualidad, pero turno-modal usaba 50ms
// también para el cierre de sus modales anidados (agregar/gestionar tienda)
// mientras la transición CSS real dura 300ms (`duration-300` en su html),
// así que el modal desaparecía de golpe a mitad de la animación de fade-out
// en vez de completarla.
//
// MODAL_OPEN_DELAY_MS: tiempo entre montar el modal (*ngIf) y activar la
// clase de "visible", para que el navegador alcance a pintar el estado
// inicial antes de animar la transición de entrada.
export const MODAL_OPEN_DELAY_MS = 50;

// MODAL_CLOSE_DELAY_MS: tiempo entre desactivar la clase de "visible" (arranca
// la animación de salida) y desmontar el modal — debe coincidir con la
// duración real de la transición CSS (`transition-all duration-300`).
export const MODAL_CLOSE_DELAY_MS = 300;
